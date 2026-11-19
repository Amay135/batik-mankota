"use client";

import { createPortal } from "react-dom";
import { rupiah } from "@/lib/format";
import { formatWaktu, type Transaksi } from "./riwayat-context";

type Props = {
  trx: Transaksi;
  dibayar: boolean;
  onKonfirmasiQris: () => void;
  onClose: () => void;
  onSelesai: () => void;
};

function Baris({ label, nilai, tebal = false }: { label: string; nilai: string; tebal?: boolean }) {
  return (
    <div className={`flex justify-between py-0.5 ${tebal ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span>{nilai}</span>
    </div>
  );
}

export default function ModalPembayaran({ trx, dibayar, onKonfirmasiQris, onClose, onSelesai }: Props) {
  return createPortal(
    <>
      {/* Saat mencetak, sembunyikan semua elemen halaman kecuali struk. */}
      <style>{`@media print { body > *:not([data-struk-root]) { display: none !important; } }`}</style>

      <div
        data-struk-root
        className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/45 p-4 print:static print:block print:bg-white print:p-0"
        onClick={() => !dibayar && onClose()}
      >
        <div
          className="w-full max-w-[340px] rounded-xl border border-[#e8dfcf] bg-white p-5 text-[#2b2420] print:max-w-none print:rounded-none print:border-0 print:p-0"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {dibayar ? (
            <>
              <div className="mb-3 text-center print:hidden">
                <div className="mx-auto mb-2 grid size-11 place-items-center rounded-full bg-[#6b2430] text-xl text-white">✓</div>
                <div className="text-lg font-medium">Pembayaran diterima</div>
              </div>

              {/* ===== STRUK ===== */}
              <div className="font-mono text-[11px] leading-[1.45]">
                <div className="text-center">
                  <div className="text-[14px] font-bold">Batik Mankota</div>
                  <div>Cabang Laweyan</div>
                </div>

                <div className="my-2 border-t border-dashed border-[#c9beab]" />
                <Baris label="No." nilai={trx.nomor} />
                <Baris label="Tanggal" nilai={formatWaktu(new Date(trx.waktu))} />
                <Baris label="Kasir" nilai={trx.kasir} />

                <div className="my-2 border-t border-dashed border-[#c9beab]" />
                {trx.items.map((i) => (
                  <div key={i.id} className="py-0.5">
                    <div>{i.name}</div>
                    <div className="flex justify-between text-[#6e6159]">
                      <span>
                        {i.qty} x {rupiah(i.price)}
                      </span>
                      <span>{rupiah(i.qty * i.price)}</span>
                    </div>
                  </div>
                ))}

                <div className="my-2 border-t border-dashed border-[#c9beab]" />
                <Baris label="Subtotal" nilai={rupiah(trx.subtotal)} />
                {trx.discount > 0 && <Baris label={`Diskon (${trx.discountPct}%)`} nilai={`-${rupiah(trx.discount)}`} />}
                <Baris label="Pajak" nilai="Termasuk harga" />
                <div className="my-1 border-t border-dashed border-[#c9beab]" />
                <Baris label="TOTAL" nilai={rupiah(trx.total)} tebal />

                <div className="my-2 border-t border-dashed border-[#c9beab]" />
                <Baris label="Metode" nilai={trx.metode} />
                {trx.metode === "Tunai" && (
                  <>
                    <Baris label="Uang diterima" nilai={rupiah(trx.cash)} />
                    <Baris label="Kembalian" nilai={rupiah(trx.change)} tebal />
                  </>
                )}

                <div className="my-2 border-t border-dashed border-[#c9beab]" />
                <div className="text-center">Terima kasih telah berbelanja</div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 print:hidden">
                <button
                  className="h-10 rounded-md border border-[#e8dfcf] bg-white text-[12px] font-semibold text-[#6b2430]"
                  onClick={() => window.print()}
                >
                  Cetak struk
                </button>
                <button
                  className="h-10 rounded-md bg-[#6b2430] text-[12px] font-semibold text-white hover:bg-[#5a1d28]"
                  onClick={onSelesai}
                >
                  Selesai
                </button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="text-lg font-medium">Pembayaran QRIS</div>
              <p className="mb-3 mt-1 text-[11px] text-[#8a7f73]">Minta pelanggan memindai kode di bawah</p>
              <div className="mx-auto mb-3 w-fit rounded-lg border border-[#e8dfcf] p-3">
                {/* Placeholder. Nanti diganti QRIS asli dari backend lewat payment gateway. */}
                <img src="/qris-placeholder.svg" alt="Kode QRIS" width={180} height={180} />
              </div>
              <div className="mb-4 text-[22px] font-bold">{rupiah(trx.total)}</div>
              <button
                className="mb-2 h-10 w-full rounded-md bg-[#6b2430] text-[12.5px] font-semibold text-white hover:bg-[#5a1d28]"
                onClick={onKonfirmasiQris}
              >
                Simulasi pembayaran berhasil
              </button>
              <button
                className="h-9 w-full rounded-md border border-[#e8dfcf] bg-white text-[11px]"
                onClick={onClose}
              >
                Batal
              </button>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}