// Dipakai di komponen client. Request lewat proxy Next.js (/api -> Django) agar cookie sesi same-origin.
export class ApiError extends Error {
  constructor(public status: number, public data: Record<string, unknown>) {
    super(pesanGalat(data) || `Permintaan gagal (${status})`);
  }
}

export function pesanGalat(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const d = data as Record<string, unknown>;
  if (typeof d.detail === "string") return d.detail;
  const [first] = Object.values(d);
  if (Array.isArray(first)) return String(first[0]);
  if (typeof first === "string") return first;
  return "";
}

export function galatPerField(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(err.data)) {
    if (k === "detail" || k === "non_field_errors") continue;
    out[k] = Array.isArray(v) ? String(v[0]) : String(v);
  }
  return out;
}

function baca(nama: string) {
  return document.cookie.split("; ").find((c) => c.startsWith(nama + "="))?.split("=")[1];
}

async function csrf() {
  let t = baca("csrftoken");
  if (!t) {
    await fetch("/api/v1/auth/csrf/", { credentials: "same-origin" });
    t = baca("csrftoken");
  }
  return t ?? "";
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") headers["X-CSRFToken"] = await csrf();
  const res = await fetch(`/api/v1${path}`, {
    method,
    headers,
    credentials: "same-origin",
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 || (res.status === 403 && /credentials|authentication/i.test(String(data.detail)))) {
      if (typeof window !== "undefined" && !location.pathname.startsWith("/masuk")) {
        location.href = `/masuk?next=${encodeURIComponent(location.pathname + location.search)}`;
      }
    }
    throw new ApiError(res.status, data);
  }
  return data as T;
}
