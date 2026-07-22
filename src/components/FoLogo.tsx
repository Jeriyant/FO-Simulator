/** Brand mark — khas Splitter Ratio (cabang besar/kecil). */
export function FoLogo({
  size = 44,
  className,
  title = 'FO Simulator',
}: {
  size?: number
  className?: string
  title?: string
}) {
  const uid = 'foLogo'
  const bg = `${uid}-bg`

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={bg} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1f2937" />
          <stop offset="1" stopColor="#111827" />
        </linearGradient>
      </defs>

      <rect width="64" height="64" rx="16" fill={`url(#${bg})`} />
      <rect
        x="1.5"
        y="1.5"
        width="61"
        height="61"
        rx="14.5"
        stroke="#dc2626"
        strokeOpacity="0.45"
      />

      {/* Trunk + fork (cabang seimbang) */}
      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M12 32h16" stroke="#2dd4bf" strokeWidth="4.2" />
        <path d="M28 32c7 0 12-9 18-11h6" stroke="#f59e0b" strokeWidth="4.2" />
        <path d="M28 32c7 0 12 9 18 11h6" stroke="#ef4444" strokeWidth="4.2" />
      </g>

      {/* Nodes */}
      <circle cx="12" cy="32" r="4.2" fill="#2dd4bf" />
      <circle cx="12" cy="32" r="1.7" fill="#042f2e" />

      <circle cx="28" cy="32" r="4.6" fill="#f8fafc" />
      <circle cx="28" cy="32" r="2" fill="#111827" />

      <circle cx="52" cy="19" r="4.6" fill="#f59e0b" />
      <circle cx="52" cy="19" r="1.7" fill="#fffbeb" />

      <circle cx="52" cy="45" r="4.6" fill="#ef4444" />
      <circle cx="52" cy="45" r="1.7" fill="#fef2f2" />
    </svg>
  )
}
