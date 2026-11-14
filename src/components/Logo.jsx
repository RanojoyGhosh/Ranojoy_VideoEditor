export default function Logo({ size = 34, withName = false }) {
  return (
    <span className="logo-wrap" style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        role="img"
        aria-label="RG monogram"
      >
        <rect width="64" height="64" rx="15" fill="#0B1F17" />
        <rect width="64" height="64" rx="15" fill="none" stroke="rgba(232,220,196,0.14)" />
        <path
          d="M15 45 V19 H27.5 a8.5 8.5 0 0 1 0 17 H15 M25 36 L34.5 45"
          stroke="#E8DCC4"
          strokeWidth="4.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M50 21.5 A13.5 13.5 0 1 0 50 42.5 L50 34 L43 34"
          stroke="#E8DCC4"
          strokeWidth="4.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="53.5" cy="47" r="2.7" fill="#C98B5E" />
      </svg>
      {withName && (
        <span className="logo-name font-display">Ranojoy Ghosh</span>
      )}
    </span>
  );
}
