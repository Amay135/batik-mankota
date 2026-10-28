"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  terbuka: boolean;
  judul: string;
  labelKonfirmasi: string;
  proses?: boolean;
  onBatal: () => void;
  onKonfirmasi: () => void;
  children: ReactNode;
};

/** Dialog native; Escape dan klik backdrop menutup lewat onClose. */
export function DialogKonfirmasi({ terbuka, judul, labelKonfirmasi, proses = false, onBatal, onKonfirmasi, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (terbuka && !d.open) d.showModal();
    if (!terbuka && d.open) d.close();
  }, [terbuka]);

  return (
    <dialog ref={ref} aria-label={judul} onClose={onBatal}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onKonfirmasi();
        }}
      >
        <div className="space-y-4 p-5">
          <h2 className="text-lg">{judul}</h2>
          <div className="text-[12px]">{children}</div>
          <div className="flex justify-end gap-2">
            <button type="button" className="tombol-sekunder" onClick={onBatal}>Batal</button>
            <button type="submit" className="tombol-utama" disabled={proses}>{proses ? "Memproses..." : labelKonfirmasi}</button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
