'use client';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Snapshot } from './snapshot';

/**
 * Live data: Supabase Realtime pushes a change notification (fixtures, pairings, results, live scores) and we refetch
 * the composed snapshot. Polling stays on as a fallback (slow while realtime is connected, fast when it is not).
 */
export function useSnapshot(fallbackMs = 4000) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [online, setOnline] = useState(true);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [realtime, setRealtime] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rt = useRef(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch('/api/live', { cache: 'no-store' });
        if (!r.ok) throw new Error(String(r.status));
        const j = (await r.json()) as Snapshot;
        if (alive) { setSnap(j); setOnline(true); setUpdated(new Date()); }
      } catch { if (alive) setOnline(false); }
    };
    const loop = async () => {
      await load();
      if (alive) pollRef.current = setTimeout(loop, rt.current ? 20000 : fallbackMs);
    };
    loop();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const sb = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
    const channel = sb?.channel('league-live');
    if (sb && channel) {
      const bump = () => { if (debounce.current) clearTimeout(debounce.current); debounce.current = setTimeout(load, 300); };
      for (const table of ['fixtures', 'pairings', 'pairing_results', 'live_pairing_state'] as const) {
        channel.on('postgres_changes', { event: '*', schema: 'public', table }, bump);
      }
      channel.subscribe((status) => { rt.current = status === 'SUBSCRIBED'; if (alive) setRealtime(rt.current); });
    }
    return () => {
      alive = false;
      if (pollRef.current) clearTimeout(pollRef.current);
      if (debounce.current) clearTimeout(debounce.current);
      if (sb && channel) void sb.removeChannel(channel);
    };
  }, [fallbackMs]);
  return { snap, online, updated, realtime };
}
