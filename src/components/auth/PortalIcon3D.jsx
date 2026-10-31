/**
 * Vibrant, three-dimensional portal marks.
 * Same visual language as the app's embossed sidebar tiles: a raised squircle
 * with a lit top edge, a soft drop shadow and a bright lime accent, so the
 * portal choice reads as a tangible object rather than flat line art.
 */

const shell = "0 0 56 56";

export function BusinessIcon3D({ size = 56, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={shell}
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="sb-biz-tile" x1="12" y1="4" x2="46" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4CE495" />
          <stop offset="0.52" stopColor="#1DA95C" />
          <stop offset="1" stopColor="#0A4B2C" />
        </linearGradient>
        <radialGradient
          id="sb-biz-glow"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="translate(28 7) scale(26 20)"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F4FFCE" stopOpacity="0.85" />
          <stop offset="1" stopColor="#F4FFCE" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sb-biz-gloss" x1="28" y1="4" x2="28" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <filter id="sb-biz-drop" x="0" y="4" width="56" height="56" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#083C24" floodOpacity="0.4" />
        </filter>
        <filter id="sb-biz-glyph" x="10" y="10" width="36" height="36" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="1.4" stdDeviation="1.2" floodColor="#03301C" floodOpacity="0.5" />
        </filter>
      </defs>

      <g filter="url(#sb-biz-drop)">
        <rect x="4" y="4" width="48" height="48" rx="15" fill="url(#sb-biz-tile)" />
        <rect x="4" y="4" width="48" height="48" rx="15" fill="url(#sb-biz-glow)" />
        <rect x="4" y="4" width="48" height="48" rx="15" fill="url(#sb-biz-gloss)" />
        <rect
          x="4.9"
          y="4.9"
          width="46.2"
          height="46.2"
          rx="14.1"
          stroke="#FFFFFF"
          strokeOpacity="0.4"
          strokeWidth="1.8"
        />
      </g>

      <g filter="url(#sb-biz-glyph)">
        <rect x="18.5" y="17.5" width="10.5" height="21.5" rx="2.4" fill="#FFFFFF" />
        <rect x="29.5" y="25" width="8.5" height="14" rx="2.2" fill="#FFFFFF" fillOpacity="0.86" />
        <rect x="21" y="21.5" width="5.5" height="1.9" rx="0.95" fill="#0B6A3C" fillOpacity="0.5" />
        <rect x="21" y="26" width="5.5" height="1.9" rx="0.95" fill="#0B6A3C" fillOpacity="0.35" />
        <rect x="31.5" y="29" width="4.5" height="1.9" rx="0.95" fill="#0B6A3C" fillOpacity="0.35" />
        <rect x="15.5" y="38.5" width="25" height="2.4" rx="1.2" fill="#FFFFFF" fillOpacity="0.9" />
      </g>

      <circle cx="40" cy="16" r="4.6" fill="#C8F169" />
      <circle cx="38.7" cy="14.7" r="1.5" fill="#FFFFFF" fillOpacity="0.85" />
    </svg>
  );
}

export function AccountantIcon3D({ size = 56, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={shell}
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="sb-acc-tile" x1="12" y1="5" x2="46" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#59C3E8" />
          <stop offset="0.5" stopColor="#1C7AA5" />
          <stop offset="1" stopColor="#0A2A3D" />
        </linearGradient>
        <radialGradient
          id="sb-acc-glow"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="translate(28 7) scale(26 20)"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#E8FBFF" stopOpacity="0.8" />
          <stop offset="1" stopColor="#E8FBFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sb-acc-gloss" x1="28" y1="4" x2="28" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <filter id="sb-acc-drop" x="0" y="4" width="56" height="56" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#082335" floodOpacity="0.42" />
        </filter>
        <filter id="sb-acc-glyph" x="10" y="10" width="38" height="38" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="1.4" stdDeviation="1.2" floodColor="#061E2C" floodOpacity="0.5" />
        </filter>
      </defs>

      <g filter="url(#sb-acc-drop)">
        <rect x="4" y="4" width="48" height="48" rx="15" fill="url(#sb-acc-tile)" />
        <rect x="4" y="4" width="48" height="48" rx="15" fill="url(#sb-acc-glow)" />
        <rect x="4" y="4" width="48" height="48" rx="15" fill="url(#sb-acc-gloss)" />
        <rect
          x="4.9"
          y="4.9"
          width="46.2"
          height="46.2"
          rx="14.1"
          stroke="#FFFFFF"
          strokeOpacity="0.4"
          strokeWidth="1.8"
        />
      </g>

      <g filter="url(#sb-acc-glyph)">
        <rect
          x="22"
          y="14.5"
          width="13.5"
          height="17"
          rx="2.6"
          fill="#FFFFFF"
          fillOpacity="0.62"
          transform="rotate(9 28.8 23)"
        />
        <rect x="17" y="18" width="15.5" height="19.5" rx="3" fill="#FFFFFF" />
        <rect x="20" y="23" width="9.5" height="1.9" rx="0.95" fill="#0E4F6E" fillOpacity="0.45" />
        <rect x="20" y="27" width="9.5" height="1.9" rx="0.95" fill="#0E4F6E" fillOpacity="0.3" />
      </g>

      <circle cx="35.5" cy="36.5" r="7" fill="#C8F169" />
      <path
        d="M32.3 36.5l2.2 2.2 4.1-4.4"
        stroke="#0B2B40"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
