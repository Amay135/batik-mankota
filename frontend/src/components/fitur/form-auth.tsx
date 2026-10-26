"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { ApiError, api, galatPerField } from "@/lib/api";

function tujuanAman(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/koleksi";
}

export function FormAuth({ mode }: { mode: "masuk" | "daftar" }) {
  const router = useRouter();
  const next = tujuanAman(useSearchParams().get("next"));
  const [f, setF] = useState({ nama_lengkap: "", email: "", whatsapp: "", password: "" });
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [umum, setUmum] = useState("");
  const [proses, setProses] = useState(false);
  const daftar = mode === "daftar";
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setProses(true); setGalat({}); setUmum("");
    try {
      await api(daftar ? "/auth/daftar/" : "/auth/masuk/", {
        method: "POST",
        body: daftar ? f : { email: f.email, password: f.password },
      });
      router.replace(next);
      router.refresh();
    } catch (err) {
      setGalat(galatPerField(err));
      if (err instanceof ApiError) {
        const d = err.data as Record<string, unknown>;
        const nf = d.non_field_errors;
        setUmum(Array.isArray(nf) ? String(nf[0]) : typeof d.detail === "string" ? d.detail : "");
      } else setUmum("Tidak dapat terhubung ke server.");
      setProses(false);
    }
  }

  const medan = (k: keyof typeof f, label: string, type = "text", auto?: string) => (
    <label className="block">
      <span className="label-mk">{label}</span>
      <input className="input-mk" type={type} value={f[k]} onChange={set(k)} autoComplete={auto} required={k !== "whatsapp"} />
      {galat[k] && <span role="alert" className="mt-1 block text-[10.5px] text-marun">{galat[k]}</span>}
    </label>
  );

  return (
    <form onSubmit={kirim} className="space-y-3.5">
      {daftar && medan("nama_lengkap", "Nama lengkap", "text", "name")}
      {medan("email", "Email", "email", "email")}
      {daftar && medan("whatsapp", "Nomor WhatsApp (opsional)", "tel", "tel")}
      {medan("password", "Kata sandi", "password", daftar ? "new-password" : "current-password")}
      {umum && <p role="alert" className="text-[11.5px] text-marun">{umum}</p>}
      <button className="tombol-marun w-full" disabled={proses}>{proses ? "Memproses..." : daftar ? "Buat akun" : "Masuk"}</button>
      <p className="pt-1 text-center text-[11.5px] text-tinta-lembut">
        {daftar ? "Sudah punya akun? " : "Belum punya akun? "}
        <Link href={`/${daftar ? "masuk" : "daftar"}${next !== "/koleksi" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-marun hover:underline">
          {daftar ? "Masuk" : "Daftar"}
        </Link>
      </p>
    </form>
  );
}
