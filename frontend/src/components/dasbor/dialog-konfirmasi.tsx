"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  terbuka: boolean;
  judul: string;
  labelKonfirmasi: string;
  proses?: boolean;
  /** Bila true, tombol konfirmasi menunggu alasan terisi. */
  alasanWajib?: boolean;
  onBatal: () => void;
  onKonfirmasi: (alasan?: string) => void;
  children: ReactNode;
};

/** Dialog native; Escape dan klik backdrop menutup lewat onClose. */
export function DialogKonfirmasi({
  terbuka,
  judul,
  labelKonfirmasi,
  proses = false,
  alasanWajib = false,
  onBatal,
  onKonfirmasi,
  children,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [alasan, setAlasan] = useState("");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (terbuka && !d.open) d.showModal();
    if (!terbuka && d.open) d.close();
    if (!terbuka) setAlasan("");
  }, [terbuka]);

  return (
    <dialog ref={ref} aria-label={judul} onClose={onBatal}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onKonfirmasi(alasanWajib ? alasan : undefined);
        }}
      >
        <div className="space-y-4 p-5">
          <h2 className="text-lg">{judul}</h2>
          <div className="text-[12px]">{children}</div>
          {alasanWajib && (
            <div>
              <Label htmlFor="alasan-konfirmasi" className="mb-1.5 block text-[11px] text-dash-text-muted">
                Alasan
              </Label>
              <Textarea
                id="alasan-konfirmasi"
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                required
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onBatal}>
              Batal
            </Button>
            <Button type="submit" disabled={proses || (alasanWajib && !alasan.trim())}>
              {proses ? "Memproses..." : labelKonfirmasi}
            </Button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
