-- Applied to project roqrejjlplrzwavvvmup as "public_read_point_penalties".
-- Point penalties are shown on the public table with their reason (rules section 10: visible note).
create policy public_read_point_penalties on sanctions for select using (kind = 'point_penalty');
