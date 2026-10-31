"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { ApiError, api, pesanGalat } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HasilVerifikasi2fa, Setup2fa } from "@/types/skema";

import { ErrorState } from "./keadaan";

const LABEL_KOLOM = "mb-1.5 block text-[11px] text-dash-text-muted";

export function Verifikasi2fa({ sudahTerdaftar }: { sudahTerdaftar: boolean }) {
  const router = useRouter();
  // Secret hanya hidup di state komponen: tidak di-log, tidak disimpan di storage.
  const [setup, setSetup] = useState<Setup2fa | null>(null);
  const [kode, setKode] = useState("");
  const [pesan, setPesan] = useState("");
  const [proses, setProses] = useState(false);

  async function mulai() {
    setProses(true);
    setPesan("");
    try {
      setSetup(await api<Setup2fa>("/auth/2fa/setup/", { method: "POST" }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setPesan("2FA sudah aktif. Muat ulang halaman lalu masukkan kode dari aplikasi autentikator.");
      } else if (err instanceof ApiError && err.status === 429) {
        setPesan("Terlalu banyak permintaan. Coba lagi dalam satu menit.");
      } else {
        setPesan("Tidak dapat memulai setup 2FA. Coba lagi.");
      }
    } finally {
      setProses(false);
    }
  }

  async function verifikasi(e: React.FormEvent) {
    e.preventDefault();
    setProses(true);
    setPesan("");
    try {
      await api<HasilVerifikasi2fa>("/auth/2fa/verify/", { method: "POST", body: { code: kode } });
      setSetup(null);
      setKode("");
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        const d = err.data;
        // Field error "code" berbentuk array; kode aplikasi berbentuk string.
        const kodeGalat = typeof d.code === "string" ? d.code : "";
        if (kodeGalat === "TOTP_LOCKED") {
          setPesan("Terlalu banyak kode salah. Tunggu sampai kunci dibuka, lalu coba lagi.");
        } else if (err.status === 429) {
          setPesan("Terlalu banyak percobaan. Coba lagi dalam satu menit.");
        } else if (err.status === 409 || kodeGalat === "TOTP_ALREADY_ENROLLED") {
          setPesan("2FA sudah aktif. Muat ulang halaman lalu masukkan kode.");
        } else {
          setPesan(pesanGalat(d) || "Kode salah atau sudah kedaluwarsa.");
        }
      } else {
        setPesan("Tidak dapat terhubung ke server.");
      }
      setProses(false);
    }
  }

  const tampilkanSetup = !sudahTerdaftar || setup !== null;

  return (
    <section className="panel-dasbor space-y-4">
      {tampilkanSetup && setup === null && (
        <>
          <p className="text-[12px] text-dash-text-muted">
            Pasang aplikasi autentikator (mis. Google Authenticator), lalu mulai setup untuk mendapat kode QR.
          </p>
          <Button type="button" onClick={mulai} disabled={proses}>
            {proses ? "Menyiapkan..." : "Mulai setup 2FA"}
          </Button>
        </>
      )}

      {setup && (
        <div className="space-y-3">
          <div className="flex justify-center rounded-md border border-dash-border bg-white p-4">
            <QRCodeSVG value={setup.otpauth_uri} size={168} aria-label="Kode QR setup 2FA" />
          </div>
          <p className="text-[12px] text-dash-text-muted">Tidak bisa memindai QR? Masukkan kode ini manual:</p>
          <p className="select-all break-all rounded-md bg-dash-bg-alt px-3 py-2 font-mono text-[12.5px]">{setup.secret}</p>
        </div>
      )}

      <form onSubmit={verifikasi} className="space-y-3">
        <div>
          <Label htmlFor="kode-2fa" className={LABEL_KOLOM}>Kode 6 digit</Label>
          <Input
            id="kode-2fa"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={kode}
            onChange={(e) => setKode(e.target.value.replace(/\D/g, ""))}
            required
          />
        </div>
        {pesan && <ErrorState pesan={pesan} />}
        <Button type="submit" className="w-full" disabled={proses || kode.length !== 6}>
          {proses ? "Memverifikasi..." : "Verifikasi"}
        </Button>
      </form>
    </section>
  );
}
