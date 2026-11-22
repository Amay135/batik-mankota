"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rupiah } from "@/lib/format";
import { DISCOUNTS, PAYMENTS, PRODUCTS, type CartLine } from "./data";
import { Chevron, PrinterIcon, UserIcon } from "./icons";
import ModalPembayaran from "./modal-pembayaran";
import { namaTampil, usePengguna } from "./pengguna-context";
import { useRiwayat, type Transaksi } from "./riwayat-context";

type Props = {
  cart: CartLine[];
  onChangeQty: (id: number, d: number) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
};

const labelCls = "mb-1 block text-[10px] text-[#8a7f73]";
const fieldCls =
  "h-[34px] w-full rounded-md border border-[#e8dfcf] bg-white px-2 text-[11px] text-[#2b2420]";

export default function PanelKeranjang({ cart, onChangeQty, onRemove, onClear }: Props) {
  const router = useRouter();
  const status = usePengguna();
  const { nomorBerikut, tambah } = useRiwayat();

  const [discountPct, setDiscountPct] = useState(5);
  const [payment, setPayment] = useState("Tunai");
  const [cash, setCash] = useState(800000);
  const [trx, setTrx] = useState<Transaksi | null>(null);
  const [dibayar, setDibayar] = useState(false);

  const items = cart.flatMap((c) => {
    const p = PRODUCTS.find((x) => x.id === c.id);
    return p ? [{ ...p, qty: c.qty }] : [];
  });
  const totalQty = items.reduce((a, i) => a + i.qty, 0);
  const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0);
  // Rupiah bulat. Angka resmi nanti dihitung backend; ini hanya tampilan.
  const discount = Math.round((subtotal * discountPct) / 100);
  const total = subtotal - discount;
  const change = Math.max(0, cash - total);

  const cashKurang = payment === "Tunai" && cash < total;
  const canPay = items.length > 0 && !cashKurang;

  function bayar() {
    if (trx) return;
    const baru: Transaksi = {
      nomor: nomorBerikut,
      waktu: new Date().toISOString(),
      kasir: namaTampil(status),
      metode: payment,
      items: items.map(({ id, name, qty, price }) => ({ id, name, qty, price })),
      subtotal,
      discountPct,
      discount,
      total,
      cash: payment === "Tunai" ? cash : total,
      change: payment === "Tunai" ? change : 0,
    };
    setTrx(baru);
    if (payment === "QRIS") {
      setDibayar(false); // tunggu konfirmasi QRIS
    } else {
      tambah(baru); // Tunai dan Debit langsung tercatat
      setDibayar(true);
    }
  }

  function konfirmasiQris() {
    if (!trx) return;
    const final = { ...trx, waktu: new Date().toISOString() };
    tambah(final);
    setTrx(final);
    setDibayar(true);
  }

  function selesai() {
    setTrx(null);
    setDibayar(false);
    onClear();
    router.push("/kasir/riwayat");
  }

  return (
    <aside className="rounded-[10px] border border-[#e8dfcf] bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[13px] font-semibold">Keranjang Transaksi</h2>
        <span className="text-[9px] text-[#8a7f73]">{nomorBerikut}</span>
      </div>

      <button className="flex w-full cursor-pointer items-center gap-2 rounded-[7px] border border-[#e8dfcf] bg-white px-2.5 py-[9px] text-left text-[11.5px] text-[#2b2420]">
        <UserIcon size={16} />
        <span className="flex-1">Rina Wulandari · Member Perak</span>
        <Chevron size={13} />
      </button>
      <div className="mx-0.5 mb-3 mt-1.5 flex justify-between text-[9.5px] text-[#8a7f73]">
        <span>Poin tersedia 1.240</span>
        <span>{items.length} produk · {totalQty} pcs</span>
      </div>

      <div className="border-t border-[#e8dfcf]">
        {items.map((i) => (
          <div className="flex gap-2.5 border-b border-[#e8dfcf] py-3" key={i.id}>
            <div className="relative h-11 w-[38px] shrink-0 overflow-hidden rounded-[5px]" style={{ background: i.tone }}>
              <img
                className="absolute inset-0 size-full object-cover"
                src={i.img}
                alt=""
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold">{i.name}</div>
              <div className="my-0.5 text-[9.5px] text-[#8a7f73]">
                {i.cat === "Pria" ? "Indigo" : "Soga"} · {i.size}
              </div>
              <div className="text-[11px] font-semibold">{rupiah(i.price)}</div>
            </div>
            <div className="flex flex-col items-end justify-between">
              <button
                className="cursor-pointer border-0 bg-transparent p-0 text-sm leading-none text-[#8a7f73]"
                onClick={() => onRemove(i.id)}
                aria-label="Hapus"
              >
                ×
              </button>
              <div className="flex items-center rounded-[5px] border border-[#e8dfcf]">
                <button className="h-5 w-[18px] cursor-pointer border-0 bg-transparent text-xs" onClick={() => onChangeQty(i.id, -1)}>−</button>
                <span className="min-w-[22px] text-center text-[10px]">{i.qty}</span>
                <button className="h-5 w-[18px] cursor-pointer border-0 bg-transparent text-xs" onClick={() => onChangeQty(i.id, 1)}>+</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="my-3.5 grid grid-cols-[1.3fr_1fr] gap-2.5">
        <div>
          <label className={labelCls}>Diskon transaksi</label>
          <select className={fieldCls} value={discountPct} onChange={(e) => setDiscountPct(Number(e.target.value))}>
            {DISCOUNTS.map((d) => (
              <option key={d.pct} value={d.pct}>{d.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Nilai diskon</label>
          <input className={fieldCls} readOnly value={rupiah(discount)} />
        </div>
      </div>

      <dl className="m-0 border-t border-[#e8dfcf] pt-2.5">
        <div className="flex justify-between py-1 text-[10.5px]"><dt className="text-[#8a7f73]">Subtotal</dt><dd className="m-0 font-medium">{rupiah(subtotal)}</dd></div>
        <div className="flex justify-between py-1 text-[10.5px]"><dt className="text-[#8a7f73]">Diskon ({discountPct}%)</dt><dd className="m-0 font-medium">−{rupiah(discount)}</dd></div>
        <div className="flex justify-between py-1 text-[10.5px]"><dt className="text-[#8a7f73]">Pajak</dt><dd className="m-0 font-medium">Termasuk harga</dd></div>
      </dl>

      <div className="mt-2 flex items-baseline justify-between border-t border-[#e8dfcf] pt-3">
        <span className="text-[13px] font-semibold">Total</span>
        <strong className="text-[22px] font-bold">{rupiah(total)}</strong>
      </div>

      <div className="mb-2 mt-[18px] text-[10.5px] font-semibold">Metode Pembayaran</div>
      <div className="mb-3.5 grid grid-cols-3 gap-2">
        {PAYMENTS.map((m) => (
          <button
            key={m}
            onClick={() => setPayment(m)}
            className={`h-8 cursor-pointer rounded-md border text-[11px] ${
              m === payment
                ? "border-[#6b2430] bg-[#f7efe6] font-semibold text-[#6b2430]"
                : "border-[#e8dfcf] bg-white"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <label className={labelCls}>Uang diterima</label>
      <input
        className="h-[38px] w-full rounded-md border border-[#e8dfcf] px-2.5 text-xs"
        value={rupiah(cash)}
        onChange={(e) => setCash(Number(e.target.value.replace(/\D/g, "")) || 0)}
      />
      {cashKurang && items.length > 0 && (
        <div className="mt-1 text-[10px] text-[#6b2430]">Uang diterima kurang {rupiah(total - cash)}</div>
      )}
      <div className="mb-3.5 mt-3 flex items-center justify-between text-[11px]">
        <span>Kembalian</span>
        <b className="text-[13px]">{rupiah(change)}</b>
      </div>

      <button
        disabled={!canPay}
        onClick={bayar}
        className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-[7px] border-0 bg-[#6b2430] text-[12.5px] font-semibold text-white hover:bg-[#5a1d28] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <PrinterIcon size={17} /> Bayar &amp; Cetak Struk
      </button>
      <div className="mt-3 flex justify-between">
        <button className="cursor-pointer border-0 bg-transparent p-0 text-[10px] text-[#8a7f73]">Simpan transaksi</button>
        <button className="cursor-pointer border-0 bg-transparent p-0 text-[10px] font-medium text-[#2b2420]" onClick={onClear}>Batalkan</button>
      </div>

      {trx && (
        <ModalPembayaran
          trx={trx}
          dibayar={dibayar}
          onKonfirmasiQris={konfirmasiQris}
          onClose={() => setTrx(null)}
          onSelesai={selesai}
        />
      )}
    </aside>
  );
}