import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { Pengguna, Role } from "@/types/skema";

const BASE = process.env.API_INTERNAL_URL || "http://localhost:8000";

/** Fetch dari Server Component dengan meneruskan cookie sesi. 401/403 -> /masuk. */
export async function apiServer<T>(path: string): Promise<T> {
  const jar = await cookies();
  const res = await fetch(`${BASE}/api/v1${path}`, {
    headers: { cookie: jar.toString(), Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) redirect("/masuk");
  if (res.status === 404) return null as T;
  if (!res.ok) throw new Error(`API ${path} gagal: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function penggunaSaatIni(): Promise<Pengguna | null> {
  const jar = await cookies();
  if (!jar.get("sessionid")) return null;
  const res = await fetch(`${BASE}/api/v1/auth/saya/`, {
    headers: { cookie: jar.toString() },
    cache: "no-store",
  });
  return res.ok ? ((await res.json()) as Pengguna) : null;
}

export async function requireRole(role: Role): Promise<Pengguna> {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) redirect("/masuk");
  if (pengguna.role !== role) redirect("/403");
  return pengguna;
}
