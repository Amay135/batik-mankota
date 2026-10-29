 "use client";

import { useMemo, useState, type ReactNode } from "react";

const KASIR_STYLES = `
.kasir {
  --maroon: #6b2430;
  --maroon-dark: #5a1d28;
  --cream: #f5efe3;
  --cream-2: #efe6d6;
  --line: #e8dfcf;
  --ink: #2b2420;
  --muted: #8a7f73;
  --gold: #e9c58a;
  display: flex;
  min-height: 100vh;
  background: var(--cream);
  color: var(--ink);
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 12px;
}
.kasir * { box-sizing: border-box; }
.kasir button { font-family: inherit; cursor: pointer; }
.kasir input, .kasir select { font-family: inherit; }

/* ---------- sidebar ---------- */
.kasir-side {
  width: 230px;
  flex-shrink: 0;
  background: var(--maroon);
  color: #f3e6d6;
  padding: 18px 16px;
}
.brand { display: flex; align-items: center; gap: 10px; margin-bottom: 26px; }
.brand-name { font-family: Georgia, "Times New Roman", serif; font-size: 20px; color: #fff; line-height: 1; }
.brand-sub { font-size: 7px; letter-spacing: 1.2px; color: var(--gold); margin-top: 4px; }
.side-label { font-size: 9px; letter-spacing: 1px; color: #d9b9ac; margin: 0 0 6px 2px; }
.side-label.work { margin-top: 18px; }
.store-select {
  width: 100%;
  display: flex; justify-content: space-between; align-items: center;
  background: transparent; color: #fff;
  border: 1px solid rgba(255,255,255,.28);
  border-radius: 6px; padding: 8px 10px; font-size: 12px;
}
.side-nav { display: flex; flex-direction: column; gap: 6px; }
.side-nav a {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 7px;
  color: #f3e6d6; font-size: 12px; cursor: pointer;
}
.side-nav a.active { background: var(--cream); color: var(--maroon); font-weight: 600; }

/* ---------- main ---------- */
.kasir-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.topbar {
  height: 52px; background: #fff; border-bottom: 1px solid var(--line);
  display: flex; align-items: center; justify-content: space-between; padding: 0 24px;
}
.crumb { color: var(--muted); }
.crumb b { color: var(--ink); font-weight: 500; }
.topbar-right { display: flex; align-items: center; gap: 18px; }
.bell { background: none; border: 0; color: var(--maroon); }
.user { display: flex; align-items: center; gap: 8px; }
.avatar {
  width: 26px; height: 26px; border-radius: 50%;
  background: #b87a3d; color: #fff; font-size: 10px; font-weight: 600;
  display: grid; place-items: center;
}
.user-name { font-weight: 600; font-size: 11px; }
.user-role { color: var(--muted); font-size: 10px; }

.content { padding: 24px 32px 12px; flex: 1; }
.content h1 { font-family: Georgia, "Times New Roman", serif; font-size: 26px; font-weight: 400; margin: 0 0 4px; }
.subtitle { color: var(--muted); margin: 0 0 16px; }

.shift {
  display: flex; justify-content: space-between; align-items: center;
  border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
  padding: 10px 4px; margin-bottom: 18px; font-size: 11px; color: var(--muted);
}
.shift b { color: var(--ink); font-weight: 500; margin-left: 10px; }
.shift-links { display: flex; gap: 22px; color: var(--ink); }
.close-shift { color: var(--maroon); font-weight: 500; }

.grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 22px; align-items: start; }

/* ---------- produk ---------- */
.search-row { display: flex; gap: 10px; }
.search {
  flex: 1; display: flex; align-items: center; gap: 8px;
  background: #fff; border: 1px solid var(--line); border-radius: 7px;
  padding: 0 12px; height: 38px; color: var(--muted);
}
.search input { flex: 1; border: 0; outline: 0; background: none; font-size: 12px; color: var(--ink); }
.scan {
  display: flex; align-items: center; gap: 6px; height: 38px; padding: 0 16px;
  background: #fff; border: 1px solid var(--line); border-radius: 7px;
  color: var(--maroon); font-weight: 600;
}
.chips { display: flex; gap: 8px; margin: 14px 0 10px; }
.chip {
  padding: 6px 14px; border-radius: 6px; font-size: 11px;
  background: #fff; border: 1px solid var(--line); color: var(--ink);
}
.chip.on { background: var(--maroon); border-color: var(--maroon); color: #fff; }
.meta-row { display: flex; justify-content: space-between; color: var(--muted); font-size: 10.5px; margin-bottom: 10px; }

.products { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.card { background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 8px 8px 10px; }
.photo { position: relative; aspect-ratio: 1 / 0.82; border-radius: 6px; overflow: hidden; margin-bottom: 8px; }
.photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.card-cat { font-size: 9.5px; color: var(--muted); }
.card-name { font-size: 13px; font-weight: 700; margin: 3px 0; }
.card-price { font-size: 12px; font-weight: 600; margin-bottom: 8px; }
.card-foot { display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: var(--muted); }
.add {
  width: 24px; height: 24px; border-radius: 6px; border: 0;
  background: var(--cream); color: var(--maroon); display: grid; place-items: center;
}
.shortcuts { display: flex; justify-content: space-between; margin-top: 14px; color: var(--muted); font-size: 10px; padding: 0 4px; }

/* ---------- keranjang ---------- */
.cart { background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 16px; }
.cart-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
.cart-head h2 { font-size: 13px; font-weight: 600; margin: 0; }
.trx { font-size: 9px; color: var(--muted); }
.customer {
  width: 100%; display: flex; align-items: center; gap: 8px; text-align: left;
  background: #fff; border: 1px solid var(--line); border-radius: 7px;
  padding: 9px 10px; font-size: 11.5px; color: var(--ink);
}
.customer span { flex: 1; }
.points { display: flex; justify-content: space-between; font-size: 9.5px; color: var(--muted); margin: 6px 2px 12px; }

.lines { border-top: 1px solid var(--line); }
.line { display: flex; gap: 10px; padding: 12px 0; border-bottom: 1px solid var(--line); }
.thumb { position: relative; width: 38px; height: 44px; border-radius: 5px; overflow: hidden; flex-shrink: 0; }
.thumb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.line-info { flex: 1; min-width: 0; }
.line-name { font-weight: 600; font-size: 11px; }
.line-var { font-size: 9.5px; color: var(--muted); margin: 2px 0; }
.line-price { font-size: 11px; font-weight: 600; }
.line-right { display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; }
.x { background: none; border: 0; color: var(--muted); font-size: 14px; line-height: 1; padding: 0; }
.qty { display: flex; align-items: center; border: 1px solid var(--line); border-radius: 5px; }
.qty button { width: 18px; height: 20px; border: 0; background: none; font-size: 12px; }
.qty span { min-width: 22px; text-align: center; font-size: 10px; }

.discount { display: grid; grid-template-columns: 1.3fr 1fr; gap: 10px; margin: 14px 0; }
.discount label, .cash-label { display: block; font-size: 10px; color: var(--muted); margin-bottom: 4px; }
.discount select, .discount input {
  width: 100%; height: 34px; border: 1px solid var(--line); border-radius: 6px;
  padding: 0 8px; font-size: 11px; background: #fff; color: var(--ink);
}
.sum { margin: 0; border-top: 1px solid var(--line); padding-top: 10px; }
.sum div { display: flex; justify-content: space-between; padding: 4px 0; font-size: 10.5px; }
.sum dt { color: var(--muted); }
.sum dd { margin: 0; font-weight: 500; }
.total {
  display: flex; justify-content: space-between; align-items: baseline;
  border-top: 1px solid var(--line); margin-top: 8px; padding-top: 12px;
}
.total span { font-size: 13px; font-weight: 600; }
.total strong { font-size: 22px; font-weight: 700; }

.pay-label { font-size: 10.5px; font-weight: 600; margin: 18px 0 8px; }
.pay { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
.pay button { height: 32px; border: 1px solid var(--line); border-radius: 6px; background: #fff; font-size: 11px; }
.pay button.on { background: #f7efe6; border-color: var(--maroon); color: var(--maroon); font-weight: 600; }
.cash { width: 100%; height: 38px; border: 1px solid var(--line); border-radius: 6px; padding: 0 10px; font-size: 12px; }
.change { display: flex; justify-content: space-between; align-items: center; margin: 12px 0 14px; font-size: 11px; }
.change b { font-size: 13px; }
.pay-btn {
  width: 100%; height: 40px; display: flex; align-items: center; justify-content: center; gap: 8px;
  background: var(--maroon); color: #fff; border: 0; border-radius: 7px; font-size: 12.5px; font-weight: 600;
}
.pay-btn:hover { background: var(--maroon-dark); }
.cart-foot { display: flex; justify-content: space-between; margin-top: 12px; }
.cart-foot button { background: none; border: 0; font-size: 10px; color: var(--muted); padding: 0; }
.cart-foot button:last-child { color: var(--ink); font-weight: 500; }

.foot { display: flex; justify-content: space-between; padding: 14px 32px; font-size: 9.5px; color: var(--muted); }

@media (max-width: 1100px) {
  .grid { grid-template-columns: 1fr; }
}

`;

const rupiah = (n) => "Rp" + Math.round(n).toLocaleString("id-ID");

const PRODUCTS = [
  { id: 1, name: "Kemeja Parang Indigo", price: 385000, stock: 76, cat: "Pria", type: "Batik cap", size: "L", tone: "#6d7fa6", img: "/products/kemeja-parang-indigo.jpg" },
  { id: 2, name: "Blus Kawung Soga", price: 425000, stock: 32, cat: "Wanita", type: "Batik cap", size: "S", tone: "#b98a5c", img: "/products/blus-kawung-soga.jpg" },
  { id: 3, name: "Kain Sekar Jagad", price: 650000, stock: 18, cat: "Kain", type: "Batik tulis", size: "-", tone: "#7a6a58", img: "/products/kain-sekar-jagad.jpg" },
  { id: 4, name: "Kemeja Truntum Soga", price: 365000, stock: 46, cat: "Pria", type: "Batik cap", size: "M", tone: "#a9743f", img: "/products/kemeja-truntum-soga.jpg" },
  { id: 5, name: "Dress Sekar Senja", price: 575000, stock: 21, cat: "Wanita", type: "Batik cap", size: "M", tone: "#c58a4e", img: "/products/dress-sekar-senja.jpg" },
  { id: 6, name: "Selendang Mega Mendung", price: 285000, stock: 15, cat: "Aksesori", type: "Batik tulis", size: "-", tone: "#4f6a8f", img: "/products/selendang-mega-mendung.jpg" },
];

const CATEGORIES = ["Semua", "Pria", "Wanita", "Kain", "Aksesori"];
const PAYMENTS = ["Tunai", "QRIS", "Debit"];
const DISCOUNTS = [
  { label: "Tanpa diskon", pct: 0 },
  { label: "5% · Member Perak", pct: 5 },
  { label: "10% · Member Emas", pct: 10 },
];

/* ---------- ikon ---------- */
type IconProps = { children: ReactNode; size?: number };
type IconSizeProps = { size?: number };

const Icon = ({ children, size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const CartIcon = (p: IconSizeProps) => <Icon {...p}><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.6 12.4a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 7H6" /></Icon>;
const UsersIcon = (p: IconSizeProps) => <Icon {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.4" /><path d="M16.5 14.2c2.7.2 4.5 2.4 4.5 5.8" /></Icon>;
const ReceiptIcon = (p: IconSizeProps) => <Icon {...p}><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z" /><path d="M9 8h6M9 12h6" /></Icon>;
const SearchIcon = (p: IconSizeProps) => <Icon {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></Icon>;
const ScanIcon = (p: IconSizeProps) => <Icon {...p}><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10" /></Icon>;
const BellIcon = (p: IconSizeProps) => <Icon {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 21h4" /></Icon>;
const PrinterIcon = (p: IconSizeProps) => <Icon {...p}><path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2" /><rect x="7" y="14" width="10" height="6" rx="1" /></Icon>;
const UserIcon = (p: IconSizeProps) => <Icon {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" /></Icon>;
const PlusIcon = (p: IconSizeProps) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
const Chevron = (p: IconSizeProps) => <Icon {...p}><path d="m7 10 5 5 5-5" /></Icon>;
const Logo = () => (
  <svg width="30" height="30" viewBox="0 0 32 32" fill="none" stroke="#e9c58a" strokeWidth="1.3">
    <path d="M16 3 29 16 16 29 3 16z" /><path d="M16 9 23 16 16 23 9 16z" /><circle cx="16" cy="16" r="1.6" fill="#e9c58a" />
  </svg>
);

export default function KasirPenjualan() {
  const [category, setCategory] = useState("Semua");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([
    { id: 1, qty: 1 },
    { id: 2, qty: 1 },
  ]);
  const [discountPct, setDiscountPct] = useState(5);
  const [payment, setPayment] = useState("Tunai");
  const [cash, setCash] = useState(800000);

  const products = useMemo(
    () =>
      PRODUCTS.filter(
        (p) =>
          (category === "Semua" || p.cat === category) &&
          p.name.toLowerCase().includes(query.toLowerCase())
      ),
    [category, query]
  );

  const items = cart.map((c) => ({ ...PRODUCTS.find((p) => p.id === c.id), qty: c.qty }));
  const totalQty = items.reduce((a, i) => a + i.qty, 0);
  const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0);
  const discount = (subtotal * discountPct) / 100;
  const total = subtotal - discount;
  const change = Math.max(0, cash - total);

  const addItem = (id: number) =>
    setCart((c) =>
      c.some((i) => i.id === id)
        ? c.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i))
        : [...c, { id, qty: 1 }]
    );
  const changeQty = (id: number, d: number) =>
    setCart((c) =>
      c.map((i) => (i.id === id ? { ...i, qty: i.qty + d } : i)).filter((i) => i.qty > 0)
    );
  const removeItem = (id: number) => setCart((c) => c.filter((i) => i.id !== id));

  return (
    <>
      <style jsx global>{KASIR_STYLES}</style>
      <div className="kasir">
      {/* ===== SIDEBAR ===== */}
      <aside className="kasir-side">
        <div className="brand">
          <Logo />
          <div>
            <div className="brand-name">Mankota</div>
            <div className="brand-sub">BATIK • BANGUN KUASATARA</div>
          </div>
        </div>

        <div className="side-label">TOKO AKTIF</div>
        <button className="store-select">
          <span>Mankota · Laweyan</span>
          <Chevron size={14} />
        </button>

        <div className="side-label work">RUANG KERJA</div>
          <nav className="side-nav">
            <Link href="/kasir" className="active">
              <CartIcon /> Kasir &amp; Penjualan
            </Link>

            <Link href="/pelanggan">
              <UsersIcon /> Pelanggan &amp; Member
            </Link>

            <Link href="/riwayat-transaksi">
              <ReceiptIcon /> Riwayat Transaksi
            </Link>
          </nav>
      </aside>

      {/* ===== KONTEN ===== */}
      <div className="kasir-main">
        <header className="topbar">
          <div className="crumb">Operasional / <b>Kasir &amp; Penjualan</b></div>
          <div className="topbar-right">
            <button className="bell"><BellIcon size={17} /></button>
            <div className="user">
              <span className="avatar">AP</span>
              <span>
                <div className="user-name">Ayu Pramesti</div>
                <div className="user-role">Pemilik toko</div>
              </span>
            </div>
          </div>
        </header>

        <main className="content">
          <h1>Kasir &amp; Penjualan</h1>
          <p className="subtitle">Transaksi cepat, perayaan hangat. Semua penjualan tercatat di satu tempat.</p>

          <div className="shift">
            <span>Shift aktif <b>Kasir: Ayu Pramesti · Dibuka 09.00 WIB · Saldo awal Rp500.000</b></span>
            <span className="shift-links">Riwayat transaksi <span className="close-shift">Tutup shift →</span></span>
          </div>

          <div className="grid">
            {/* ---- kiri: produk ---- */}
            <section>
              <div className="search-row">
                <label className="search">
                  <SearchIcon size={16} />
                  <input
                    placeholder="Cari produk, SKU, atau pindai barcode..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <button className="scan"><ScanIcon size={16} /> Pindai</button>
              </div>

              <div className="chips">
                {CATEGORIES.map((c) => (
                  <button key={c} className={c === category ? "chip on" : "chip"} onClick={() => setCategory(c)}>
                    {c}
                  </button>
                ))}
              </div>

              <div className="meta-row">
                <span>48 produk tersedia</span>
                <span>Harga retail · Cabang Laweyan</span>
              </div>

              <div className="products">
                {products.map((p) => (
                  <article key={p.id} className="card">
                    <div className="photo" style={{ background: p.tone }}>
                      <img src={p.img} alt={p.name} onError={(e) => (e.currentTarget.style.display = "none")} />
                    </div>
                    <div className="card-cat">{p.cat} · {p.type}</div>
                    <div className="card-name">{p.name}</div>
                    <div className="card-price">{rupiah(p.price)}</div>
                    <div className="card-foot">
                      <span>Stok {p.stock}</span>
                      <button className="add" onClick={() => addItem(p.id)} aria-label={`Tambah ${p.name}`}>
                        <PlusIcon size={14} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="shortcuts">
                <span>F2 Cari produk</span>
                <span>F4 Pilih pelanggan</span>
                <span>F8 Bayar transaksi</span>
              </div>
            </section>

            {/* ---- kanan: keranjang ---- */}
            <aside className="cart">
              <div className="cart-head">
                <h2>Keranjang Transaksi</h2>
                <span className="trx">#TRX-0328</span>
              </div>

              <button className="customer">
                <UserIcon size={16} />
                <span>Rina Wulandari · Member Perak</span>
                <Chevron size={13} />
              </button>
              <div className="points">
                <span>Poin tersedia 1.240</span>
                <span>{items.length} produk · {totalQty} pcs</span>
              </div>

              <div className="lines">
                {items.map((i) => (
                  <div className="line" key={i.id}>
                    <div className="thumb" style={{ background: i.tone }}>
                      <img src={i.img} alt="" onError={(e) => (e.currentTarget.style.display = "none")} />
                    </div>
                    <div className="line-info">
                      <div className="line-name">{i.name}</div>
                      <div className="line-var">{i.cat === "Pria" ? "Indigo" : "Soga"} · {i.size}</div>
                      <div className="line-price">{rupiah(i.price)}</div>
                    </div>
                    <div className="line-right">
                      <button className="x" onClick={() => removeItem(i.id)} aria-label="Hapus">×</button>
                      <div className="qty">
                        <button onClick={() => changeQty(i.id, -1)}>−</button>
                        <span>{i.qty}</span>
                        <button onClick={() => changeQty(i.id, 1)}>+</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="discount">
                <div>
                  <label>Diskon transaksi</label>
                  <select value={discountPct} onChange={(e) => setDiscountPct(Number(e.target.value))}>
                    {DISCOUNTS.map((d) => (
                      <option key={d.pct} value={d.pct}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Nilai diskon</label>
                  <input readOnly value={rupiah(discount)} />
                </div>
              </div>

              <dl className="sum">
                <div><dt>Subtotal</dt><dd>{rupiah(subtotal)}</dd></div>
                <div><dt>Diskon ({discountPct}%)</dt><dd>−{rupiah(discount)}</dd></div>
                <div><dt>Pajak</dt><dd>Termasuk harga</dd></div>
              </dl>

              <div className="total">
                <span>Total</span>
                <strong>{rupiah(total)}</strong>
              </div>

              <div className="pay-label">Metode Pembayaran</div>
              <div className="pay">
                {PAYMENTS.map((m) => (
                  <button key={m} className={m === payment ? "on" : ""} onClick={() => setPayment(m)}>{m}</button>
                ))}
              </div>

              <label className="cash-label">Uang diterima</label>
              <input
                className="cash"
                value={rupiah(cash)}
                onChange={(e) => setCash(Number(e.target.value.replace(/\D/g, "")) || 0)}
              />
              <div className="change">
                <span>Kembalian</span>
                <b>{rupiah(change)}</b>
              </div>

              <button className="pay-btn"><PrinterIcon size={17} /> Bayar &amp; Cetak Struk</button>
              <div className="cart-foot">
                <button>Simpan transaksi</button>
                <button onClick={() => setCart([])}>Batalkan</button>
              </div>
            </aside>
          </div>
        </main>

        <footer className="foot">
          <span>Batik Mankota · Ruang operasional</span>
          <span>Terakhir diperbarui 12 Okt 2026, 10.42 WIB</span>
        </footer>
      </div>
      </div>
    </>
  );
}
