'use client';

/**
 * A submit button for forms that have several actions.
 *  - `name` + `value`: sets the form's hidden field `name` to `value` when clicked. (React does not send a button's own
 *    name/value with a server-action form, so the form needs a hidden input with that name.)
 *  - `message`: asks "Are you sure?" first; cancelling leaves the form unsent.
 */
export function ConfirmButton({ message, className = 'btn-ghost', children, ariaLabel, name, value, title }: {
  message?: string; className?: string; children: React.ReactNode; ariaLabel?: string; name?: string; value?: string; title?: string;
}) {
  return (
    <button type="submit" className={className} aria-label={ariaLabel} title={title}
      onClick={(e) => {
        if (message && !window.confirm(message)) { e.preventDefault(); return; }
        if (name) {
          const field = e.currentTarget.form?.elements.namedItem(name);
          if (field instanceof HTMLInputElement) field.value = value ?? '';
        }
      }}>
      {children}
    </button>
  );
}
