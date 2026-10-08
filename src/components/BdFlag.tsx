/** Real Bangladesh flag icon (accurate geometry) with a soft brand glow. */
export function BdFlag({ className = "h-4 w-6" }: { className?: string }) {
  return (
    <span className={`bd-flag inline-flex shrink-0 overflow-hidden rounded-[3px] ring-1 ring-white/20 ${className}`} aria-hidden="true">
      <svg viewBox="0 0 30 20" className="h-full w-full">
        <rect width="30" height="20" fill="#006A4E" />
        <circle cx="13" cy="10" r="6" fill="#F42A41" />
      </svg>
    </span>
  );
}
