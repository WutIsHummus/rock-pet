/**
 * Inline SVG icons used by the stat pills.
 * Kept in one file because each is < 10 lines and they're always used together.
 */

export function Heart({ className = 'w-3.5 h-3.5 text-blush' }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8 14s-5-3.4-5-7.5C3 4.5 4.4 3 6.2 3c1 0 1.6.5 1.8 1 .2-.5.8-1 1.8-1C11.6 3 13 4.5 13 6.5 13 10.6 8 14 8 14z" />
    </svg>
  );
}

export function Bolt({ className = 'w-3.5 h-3.5 text-sun-dark' }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <path d="M9.4 1L3 9.2h3.8l-1.2 5.8 6.4-8.4H8.2L9.4 1z" />
    </svg>
  );
}

export function Clock({ className = 'w-3.5 h-3.5 text-sky-dark' }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4.5v3.7l2.4 2.4" strokeLinecap="round" />
    </svg>
  );
}
