/** Menu dashboard, hanya item yang punya entri admin_scope.py fase <= 0. */
export const ADMIN_MENU = [
  { id: "ADM-01", label: "Akun", href: "/dashboard" },
  { id: "ADM-03", label: "Log Audit", href: "/dashboard/audit" },
] as const;
