// NEXT_PUBLIC_API_URL boleh berisi "/api/v1" atau tidak; keduanya ditangani.
const ROOT = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
export const API = ROOT.endsWith("/api/v1") ? ROOT : `${ROOT}/api/v1`;

export function bacaCsrf(): string {
  const m = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}