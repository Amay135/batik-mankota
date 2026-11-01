import type { ReactNode } from "react";

type IconProps = { children: ReactNode; size?: number };
type IconSizeProps = { size?: number };

export const Icon = ({ children, size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
export const CartIcon = (p: IconSizeProps) => <Icon {...p}><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.6 12.4a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 7H6" /></Icon>;
export const UsersIcon = (p: IconSizeProps) => <Icon {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.4" /><path d="M16.5 14.2c2.7.2 4.5 2.4 4.5 5.8" /></Icon>;
export const ReceiptIcon = (p: IconSizeProps) => <Icon {...p}><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z" /><path d="M9 8h6M9 12h6" /></Icon>;
export const SearchIcon = (p: IconSizeProps) => <Icon {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></Icon>;
export const ScanIcon = (p: IconSizeProps) => <Icon {...p}><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10" /></Icon>;
export const BellIcon = (p: IconSizeProps) => <Icon {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 21h4" /></Icon>;
export const PrinterIcon = (p: IconSizeProps) => <Icon {...p}><path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2" /><rect x="7" y="14" width="10" height="6" rx="1" /></Icon>;
export const UserIcon = (p: IconSizeProps) => <Icon {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" /></Icon>;
export const PlusIcon = (p: IconSizeProps) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const Chevron = (p: IconSizeProps) => <Icon {...p}><path d="m7 10 5 5 5-5" /></Icon>;
export const Logo = () => (
  <svg width="30" height="30" viewBox="0 0 32 32" fill="none" stroke="#e9c58a" strokeWidth="1.3">
    <path d="M16 3 29 16 16 29 3 16z" /><path d="M16 9 23 16 16 23 9 16z" /><circle cx="16" cy="16" r="1.6" fill="#e9c58a" />
  </svg>
);