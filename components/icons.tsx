export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15m-6-6 6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}
export function BagIcon() {
  return (
    <svg
      width="20"
      height="22"
      viewBox="0 0 24 26"
      fill="none"
      aria-hidden="true"
    >
      <path d="M4 8h16l1 15H3L4 8Z" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M8 9V6a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}
export function SearchIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="10.5"
        cy="10.5"
        r="6.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="m16 16 5 5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
