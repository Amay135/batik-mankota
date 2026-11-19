"use client";

import { useState } from "react";
import { API, bacaCsrf } from "./api";

export default function TombolKeluar() {
  const [memproses, setMemproses] = useState(false);
  const [galat, setGalat] = useState("");

  async function keluar() {
    setMemproses(true);
    setGalat("");
    try {
      // Pastikan cookie csrftoken ada sebelum POST.
      await fetch(`${API}/auth/csrf/`, { credentials: "include" });
      const res = await fetch(`${API}/auth/keluar/`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRFToken": bacaCsrf() },
      });
      if (!res.ok) throw new Error("gagal");
      window.location.assign("/masuk?next=%2Fkasir");
    } catch {
      setGalat("Gagal keluar. Coba lagi.");
      setMemproses(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {galat && <span className="text-[10px] text-[#6b2430]">{galat}</span>}
      <button
        type="button"
        onClick={keluar}
        disabled={memproses}
        className="rounded-md border border-[#e8dfcf] bg-white px-3 py-1.5 text-[11px] font-medium text-[#2b2420] transition-colors hover:border-[#6b2430] hover:text-[#6b2430] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {memproses ? "Keluar..." : "Keluar"}
      </button>
    </div>
  );
}