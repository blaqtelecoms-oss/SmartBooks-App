/**
 * Dimensional portal marks.
 *
 * The mark is a continuous squircle lit from the top-left, sitting on a very
 * soft elliptical ground shadow — no drop-shadow filter, so nothing reads as a
 * hard square or a cut-out tile. Depth comes from the gradient face, a darker
 * "base" edge behind it and a fine inner rim light.
 */

const shell = "0 0 56 56";
const FACE = { x: 5, y: 3, w: 46, h: 46, rx: 19 };

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
        <radialGradient id="sb-biz-ground" cx="0" cy="0" r="1" gradientTransform="translate(28 50) scale(22 6)" gradientUnits="userSpaceOnUse">
          <stop stopColor="#083C24" stopOpacity="0.3" />
          <stop offset="0.6" stopColor="#083C24" stopOpacity="0.12" />
          <stop offset="1" stopColor="#083C24" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sb-biz-base" x1="14" y1="8" x2="44" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0E6B41" />
          <stop offset="1" stopColor="#052F1D" />
        </linearGradient>
        <linearGradient id="sb-biz-face" x1="10" y1="4" x2="46" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5BE8A3" />
          <stop offset="0.45" stopColor="#23995C" />
          <stop offset="1" stopColor="#0B4E31" />
        </linearGradient>
        <linearGradient id="sb-biz-sheen" x1="28" y1="3" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.34" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      <ellipse cx="28" cy="50" rx="22" ry="6" fill="url(#sb-biz-ground)" />

      <rect
        x={FACE.x}
        y={FACE.y + 2.2}
        width={FACE.w}
        height={FACE.h}
        rx={FACE.rx}
        fill="url(#sb-biz-base)"
      />

      <g>
        <rect x={FACE.x} y={FACE.y} width={FACE.w} height={FACE.h} rx={FACE.rx} fill="url(#sb-biz-face)" />
        <rect x={FACE.x} y={FACE.y} width={FACE.w} height={FACE.h} rx={FACE.rx} fill="url(#sb-biz-sheen)" />
        <rect
          x={FACE.x + 0.7}
          y={FACE.y + 0.7}
          width={FACE.w - 1.4}
          height={FACE.h - 1.4}
          rx={FACE.rx - 0.7}
          stroke="#FFFFFF"
          strokeOpacity="0.34"
          strokeWidth="1.1"
        />
        <path
          d="M9.5 30.5c0-10.2 8.3-17.5 18.5-17.5 6.9 0 12.6 3 15.6 8.4-3.8-.9-7.8-.2-10.6 2-2.6 2-3.6 5-3.4 8.2-2.9-1.5-6.3-1.6-9.4-.2-3 1.3-5.3 3.6-6.6 6.3-2.6-1.8-4.1-4.4-4.1-7.2Z"
          fill="#FFFFFF"
          fillOpacity="0.08"
        />
      </g>

      {/* Ledger mark */}
      <g>
        <rect x="18.5" y="16.5" width="10.5" height="21.5" rx="3" fill="#FFFFFF" />
        <rect x="29.5" y="24" width="8.5" height="14" rx="2.6" fill="#FFFFFF" fillOpacity="0.82" />
        <rect x="21" y="20.5" width="5.5" height="1.8" rx="0.9" fill="#0B6A3C" fillOpacity="0.42" />
        <rect x="21" y="25" width="5.5" height="1.8" rx="0.9" fill="#0B6A3C" fillOpacity="0.3" />
        <rect x="31.5" y="28" width="4.5" height="1.8" rx="0.9" fill="#0B6A3C" fillOpacity="0.3" />
        <rect x="15.5" y="37.5" width="25" height="2.3" rx="1.15" fill="#FFFFFF" fillOpacity="0.88" />
      </g>

      <circle cx="40" cy="15" r="4.6" fill="#C8F169" />
      <circle cx="38.6" cy="13.6" r="1.4" fill="#FFFFFF" fillOpacity="0.7" />
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
        <radialGradient id="sb-acc-ground" cx="0" cy="0" r="1" gradientTransform="translate(28 50) scale(22 6)" gradientUnits="userSpaceOnUse">
          <stop stopColor="#082335" stopOpacity="0.3" />
          <stop offset="0.6" stopColor="#082335" stopOpacity="0.12" />
          <stop offset="1" stopColor="#082335" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sb-acc-base" x1="14" y1="8" x2="44" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#125C80" />
          <stop offset="1" stopColor="#041B28" />
        </linearGradient>
        <linearGradient id="sb-acc-face" x1="10" y1="4" x2="46" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6FD1F2" />
          <stop offset="0.45" stopColor="#1F80AB" />
          <stop offset="1" stopColor="#08304A" />
        </linearGradient>
        <linearGradient id="sb-acc-sheen" x1="28" y1="3" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.3" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      <ellipse cx="28" cy="50" rx="22" ry="6" fill="url(#sb-acc-ground)" />

      <rect
        x={FACE.x}
        y={FACE.y + 2.2}
        width={FACE.w}
        height={FACE.h}
        rx={FACE.rx}
        fill="url(#sb-acc-base)"
      />

      <g>
        <rect x={FACE.x} y={FACE.y} width={FACE.w} height={FACE.h} rx={FACE.rx} fill="url(#sb-acc-face)" />
        <rect x={FACE.x} y={FACE.y} width={FACE.w} height={FACE.h} rx={FACE.rx} fill="url(#sb-acc-sheen)" />
        <rect
          x={FACE.x + 0.7}
          y={FACE.y + 0.7}
          width={FACE.w - 1.4}
          height={FACE.h - 1.4}
          rx={FACE.rx - 0.7}
          stroke="#FFFFFF"
          strokeOpacity="0.3"
          strokeWidth="1.1"
        />
      </g>

      {/* Document mark */}
      <g>
        <rect
          x="22.5"
          y="14"
          width="13.5"
          height="17"
          rx="3"
          fill="#FFFFFF"
          fillOpacity="0.55"
          transform="rotate(9 29.2 22.5)"
        />
        <rect x="17" y="17.5" width="15.5" height="19.5" rx="3.2" fill="#FFFFFF" />
        <rect x="20" y="22.5" width="9.5" height="1.8" rx="0.9" fill="#0E4F6E" fillOpacity="0.4" />
        <rect x="20" y="26.5" width="9.5" height="1.8" rx="0.9" fill="#0E4F6E" fillOpacity="0.26" />
        <rect x="20" y="30.5" width="6" height="1.8" rx="0.9" fill="#0E4F6E" fillOpacity="0.2" />
      </g>

      <circle cx="35.5" cy="35.5" r="7" fill="#C8F169" />
      <path
        d="M32.3 35.5l2.2 2.2 4.1-4.4"
        stroke="#0B2B40"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
