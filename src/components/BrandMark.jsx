/**
 * The Rangify glyph: a document with a retrieval ray crossing it. Inherits
 * `currentColor` so it works on either theme without a second asset.
 */
export default function BrandMark({ size = 28 }) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="6.5"
        y="3.5"
        width="19"
        height="25"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.45"
      />
      <path
        d="M11.5 11h9M11.5 16h9M11.5 21h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
      <circle cx="20" cy="19" r="6" stroke="currentColor" strokeWidth="2.2" />
      <path d="M24.4 23.4 29 28" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}
