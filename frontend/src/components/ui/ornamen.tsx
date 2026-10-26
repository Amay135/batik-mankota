export function Ornamen({ className = "", size = 22 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#B08D57" strokeWidth="1.1" className={className} aria-hidden>
      <path d="M12 2.5 21.5 12 12 21.5 2.5 12Z" />
      <path d="M12 7 17 12 12 17 7 12Z" />
      <circle cx="12" cy="12" r="1.4" fill="#B08D57" stroke="none" />
      <path d="M12 2.5v4.5M12 17v4.5M2.5 12H7M17 12h4.5" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <Ornamen size={26} />
      <span className="leading-none">
        <span className="block font-serif text-[26px] font-medium tracking-tight text-tinta">Mankota</span>
        <span className="mt-0.5 block text-[6.5px] font-medium uppercase tracking-[0.18em] text-tinta-lembut">
          Batik • Warisan Nusantara
        </span>
      </span>
    </span>
  );
}
