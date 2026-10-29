/**
 * Bespoke line-art marks for the two SmartBooks portals.
 * Drawn on a 24x24 grid, hairline strokes with rounded joins, so they sit
 * comfortably next to the Manrope / Instrument Serif type in the sign-in card.
 */

const base = {
  viewBox: "0 0 24 24",
  width: 18,
  height: 18,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
  focusable: "false",
};

/** Business portal — an architectural tower with an attached wing. */
export function BusinessIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5.4 18.6V6.1c0-.5.3-.95.77-1.14l5.06-2.06c.72-.3 1.53.24 1.53 1.02v14.68" />
      <path d="M12.76 9.9h3.94c.6 0 1.08.48 1.08 1.08v7.62" />
      <path d="M7.9 7.9h2.2M7.9 11.1h2.2M7.9 14.3h2.2" />
      <path d="M15.6 13h.9" />
      <path d="M3.6 18.9h16.8" />
    </svg>
  );
}

/** Accountant portal — a client ledger with a sealed audit check. */
export function AccountantIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M8.4 5.2h7.3c.66 0 1.2.54 1.2 1.2v9.1" />
      <rect x="4.4" y="7.6" width="9.4" height="11.6" rx="1.6" />
      <path d="M7.1 11.3h4M7.1 14h2.4" />
      <circle cx="16.6" cy="16.6" r="3.1" />
      <path d="M15.35 16.6l.95.95 1.6-1.85" />
    </svg>
  );
}
