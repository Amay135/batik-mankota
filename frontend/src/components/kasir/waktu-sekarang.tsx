"use client";

import { useEffect, useState } from "react";

function format(): string {
  const d = new Date();
  const tanggal = d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
  const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" });
  return `${tanggal}, ${jam} WIB`;
}

export default function WaktuSekarang() {
  const [teks, setTeks] = useState("");

  useEffect(() => {
    setTeks(format());
    const id = setInterval(() => setTeks(format()), 60_000);
    return () => clearInterval(id);
  }, []);

  return <span>Waktu saat ini {teks}</span>;
}