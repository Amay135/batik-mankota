// Mock API stateful untuk Playwright. Guard dashboard berjalan di server Next,
// jadi page.route tidak bisa mencegatnya; server kecil ini yang menjawab.
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";

const PORT = 8010;

let state;

function reset() {
  const aksi = ["price_change", "stock_adjust", "void_return", "role_change", "admin_login"];
  const sekarang = new Date().toISOString();
  state = {
    sesi: new Map(),
    users: [
      { id: 1, email: "admin@mankota.id", password: "admin12345", nama_lengkap: "Admin Utama", whatsapp: "", role: "admin", is_active: true, otp_enabled: true },
      { id: 2, email: "admin2@mankota.id", password: "admin12345", nama_lengkap: "Admin Baru", whatsapp: "", role: "admin", is_active: true, otp_enabled: false },
      { id: 3, email: "kasir@mankota.id", password: "kasir12345", nama_lengkap: "Kasir Satu", whatsapp: "", role: "kasir", is_active: true, otp_enabled: false },
      { id: 4, email: "user@mankota.id", password: "user12345", nama_lengkap: "Pelanggan", whatsapp: "", role: "user", is_active: true, otp_enabled: false },
    ],
    audit: Array.from({ length: 60 }, (_, i) => ({
      id: i + 1,
      actor_id: 1,
      actor_email: "admin@mankota.id",
      action: aksi[i % aksi.length],
      entity: "product",
      entity_id: String(100 + i),
      before: { harga: 100000 },
      after: { harga: 120000 },
      ip: "127.0.0.1",
      created_at: new Date(Date.UTC(2026, 9, 20, 3) + i * 3600_000).toISOString(),
    })),
    kategori: [
      { id: 1, nama: "Pria", slug: "pria", label_pendek: "Pria", urutan: 0 },
      { id: 2, nama: "Wanita", slug: "wanita", label_pendek: "Wanita", urutan: 1 },
    ],
    motif: [
      { id: 1, nama: "Parang", slug: "parang", deskripsi: "Motif parang." },
      { id: 2, nama: "Kawung", slug: "kawung", deskripsi: "" },
    ],
    produk: [
      {
        id: 1,
        nama: "Batik Parang",
        slug: "batik-parang",
        kategori: 1,
        teknik: "tulis",
        motif: "parang",
        bentuk: "kemeja",
        warna_utama: "soga",
        koleksi: "",
        perajin: "",
        deskripsi: "",
        bahan_detail: "",
        perawatan: "",
        cerita_judul: "",
        cerita_isi: "",
        harga: 350000,
        rating: "4.8",
        jumlah_ulasan: 1,
        terjual: 3,
        unggulan: true,
        aktif: true,
        dibuat: sekarang,
        varian: [
          { id: 1, produk: 1, warna: "soga", ukuran: "M", sku: "PARANG-M", harga_beli: 200000, qr_token: "tok-parang-m", aktif: true, stok: 8, status_stok: "Tersedia" },
          { id: 2, produk: 1, warna: "soga", ukuran: "L", sku: "PARANG-L", harga_beli: 200000, qr_token: "tok-parang-l", aktif: true, stok: 2, status_stok: "Tinggal sedikit" },
        ],
        foto: [],
      },
      {
        id: 2,
        nama: "Batik Kosong",
        slug: "batik-kosong",
        kategori: 2,
        teknik: "cap",
        motif: "kawung",
        bentuk: "kain",
        warna_utama: "indigo",
        koleksi: "",
        perajin: "",
        deskripsi: "",
        bahan_detail: "",
        perawatan: "",
        cerita_judul: "",
        cerita_isi: "",
        harga: 150000,
        rating: "0",
        jumlah_ulasan: 0,
        terjual: 0,
        unggulan: false,
        aktif: true,
        dibuat: sekarang,
        varian: [],
        foto: [],
      },
    ],
    stok: [
      { varian: 1, sku: "PARANG-M", produk: "Batik Parang", ukuran: "M", warna: "soga", kategori: "pria", stok_fisik: 10, stok_terpesan: 2, stok_minimum: 5 },
      { varian: 2, sku: "PARANG-L", produk: "Batik Parang", ukuran: "L", warna: "soga", kategori: "pria", stok_fisik: 2, stok_terpesan: 0, stok_minimum: 5 },
    ],
    mutasi: [
      { id: 1, varian: 1, sku: "PARANG-M", tipe: "PURCHASE_IN", tipe_label: "Pembelian masuk", qty_delta: 10, ref_type: "purchase", ref_id: "1", pelaku: "admin@mankota.id", catatan: "Stok awal", dibuat: sekarang },
    ],
    ulasan: [
      { id: 1, produk: "batik-parang", pengguna: "user@mankota.id", rating: 5, teks: "Bahan nyaman.", tampil: true, dibuat: sekarang },
    ],
    panduan: [
      { id: 1, kategori: 1, tabel: [["Ukuran", "Lingkar dada"], ["M", "100 cm"], ["L", "108 cm"]], diperbarui: sekarang },
    ],
    opname: new Map(),
    urut: { kategori: 3, motif: 3, produk: 3, varian: 3, foto: 1, ulasan: 1, panduan: 2, opname: 1, mutasi: 2 },
  };
}
reset();

function kirim(res, status, data) {
  if (data === undefined) {
    res.writeHead(status);
    res.end();
    return;
  }
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(data));
}

function cookie(req, nama) {
  return (req.headers.cookie ?? "")
    .split(/;\s*/)
    .find((c) => c.startsWith(nama + "="))
    ?.slice(nama.length + 1);
}

function bacaBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

function setCookie(res, nilai) {
  res.setHeader("Set-Cookie", nilai);
}

function sesi(req) {
  return state.sesi.get(cookie(req, "sessionid")) ?? null;
}

function publik(u, s) {
  return {
    id: u.id,
    email: u.email,
    nama_lengkap: u.nama_lengkap,
    whatsapp: u.whatsapp,
    role: u.role,
    totp_enrolled: u.otp_enabled,
    totp_verified: Boolean(s?.verified),
  };
}

function adminAkun(u) {
  return {
    id: u.id,
    email: u.email,
    nama_lengkap: u.nama_lengkap,
    whatsapp: u.whatsapp,
    role: u.role,
    is_active: u.is_active,
    otp_enabled: u.otp_enabled,
  };
}

function butuhAdmin(req, res, wajib2fa = true) {
  const s = sesi(req);
  const u = s ? state.users.find((x) => x.id === s.userId) : null;
  if (!u || u.role !== "admin") {
    kirim(res, 403, { detail: "Hanya admin." });
    return null;
  }
  if (wajib2fa && !s.verified) {
    kirim(res, 403, { detail: "Verifikasi 2FA diperlukan." });
    return null;
  }
  return u;
}

function statusStok(tersedia) {
  if (tersedia < 1) return "Habis";
  return tersedia <= 5 ? "Tinggal sedikit" : "Tersedia";
}

function stokPublik(s) {
  const tersedia = s.stok_fisik - s.stok_terpesan;
  return {
    varian: s.varian,
    sku: s.sku,
    produk: s.produk,
    ukuran: s.ukuran,
    warna: s.warna,
    stok_fisik: s.stok_fisik,
    stok_terpesan: s.stok_terpesan,
    stok_tersedia: tersedia,
    stok_minimum: s.stok_minimum,
    status_stok: statusStok(tersedia),
  };
}

function halaman(data, url, ukuran = 50) {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const mulai = (page - 1) * ukuran;
  return {
    count: data.length,
    next: mulai + ukuran < data.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results: data.slice(mulai, mulai + ukuran),
  };
}

function cariVarian(id) {
  for (const p of state.produk) {
    const v = p.varian.find((x) => x.id === id);
    if (v) return { produk: p, varian: v };
  }
  return null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const path = url.pathname.replace(/\/+$/, "");
  const method = req.method ?? "GET";

  if (path === "/__reset") {
    if (method === "POST") reset();
    kirim(res, 200, { ok: true });
    return;
  }

  if (path === "/api/v1/auth/csrf" && method === "GET") {
    setCookie(res, "csrftoken=mock; Path=/; SameSite=Lax");
    kirim(res, 200, { csrf: "mock" });
    return;
  }

  if (path === "/api/v1/auth/masuk" && method === "POST") {
    const data = await bacaBody(req);
    const u = state.users.find((x) => x.email === String(data.email ?? "").toLowerCase());
    if (!u || u.password !== data.password) {
      kirim(res, 400, { non_field_errors: ["Email atau kata sandi salah."] });
      return;
    }
    const token = randomUUID();
    const s = { userId: u.id, verified: false };
    state.sesi.set(token, s);
    setCookie(res, `sessionid=${token}; Path=/; HttpOnly; SameSite=Lax`);
    kirim(res, 200, publik(u, s));
    return;
  }

  if (path === "/api/v1/auth/keluar" && method === "POST") {
    const token = cookie(req, "sessionid");
    if (token) state.sesi.delete(token);
    setCookie(res, "sessionid=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
    kirim(res, 204);
    return;
  }

  if (path === "/api/v1/auth/saya" && method === "GET") {
    const s = sesi(req);
    const u = s ? state.users.find((x) => x.id === s.userId) : null;
    if (!u) {
      kirim(res, 401, { detail: "Belum masuk." });
      return;
    }
    kirim(res, 200, publik(u, s));
    return;
  }

  if (path === "/api/v1/auth/2fa/setup" && method === "POST") {
    const u = butuhAdmin(req, res, false);
    if (!u) return;
    kirim(res, 200, {
      secret: "JBSWY3DPEHPK3PXP",
      otpauth_uri: `otpauth://totp/Mankota:${encodeURIComponent(u.email)}?secret=JBSWY3DPEHPK3PXP&issuer=Mankota`,
    });
    return;
  }

  if (path === "/api/v1/auth/2fa/verify" && method === "POST") {
    const u = butuhAdmin(req, res, false);
    if (!u) return;
    const data = await bacaBody(req);
    const s = sesi(req);
    if (String(data.code) === "000000") {
      kirim(res, 429, { code: "TOTP_LOCKED", message: "Terlalu banyak kode salah. Coba lagi nanti." });
      return;
    }
    s.verified = true;
    kirim(res, 200, { otp_enabled: true });
    return;
  }

  if (path === "/api/v1/auth/akun" && method === "GET") {
    if (!butuhAdmin(req, res)) return;
    kirim(res, 200, state.users.filter((u) => u.role !== "user").map(adminAkun));
    return;
  }

  if (path === "/api/v1/auth/akun" && method === "POST") {
    if (!butuhAdmin(req, res)) return;
    const data = await bacaBody(req);
    if (state.users.some((u) => u.email === String(data.email ?? "").toLowerCase())) {
      kirim(res, 400, { email: ["Email ini sudah terdaftar."] });
      return;
    }
    const u = {
      id: Math.max(...state.users.map((x) => x.id)) + 1,
      email: String(data.email ?? "").toLowerCase(),
      password: String(data.password ?? ""),
      nama_lengkap: String(data.nama_lengkap ?? ""),
      whatsapp: String(data.whatsapp ?? ""),
      role: data.role === "admin" ? "admin" : "kasir",
      is_active: true,
      otp_enabled: false,
    };
    state.users.push(u);
    kirim(res, 201, adminAkun(u));
    return;
  }

  const detail = path.match(/^\/api\/v1\/auth\/akun\/(\d+)$/);
  if (detail && method === "PATCH") {
    if (!butuhAdmin(req, res)) return;
    const u = state.users.find((x) => x.id === Number(detail[1]));
    if (!u) {
      kirim(res, 404, { detail: "Tidak ditemukan." });
      return;
    }
    const data = await bacaBody(req);
    for (const k of ["nama_lengkap", "whatsapp", "role", "is_active"]) {
      if (k in data) u[k] = data[k];
    }
    kirim(res, 200, adminAkun(u));
    return;
  }

  const sandi = path.match(/^\/api\/v1\/auth\/akun\/(\d+)\/reset-password$/);
  if (sandi && method === "POST") {
    if (!butuhAdmin(req, res)) return;
    kirim(res, 204);
    return;
  }

  if (path === "/api/v1/audit" && method === "GET") {
    if (!butuhAdmin(req, res)) return;
    const tanggalJakarta = (iso) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(iso));
    const dari = url.searchParams.get("dari");
    const sampai = url.searchParams.get("sampai");
    const pelaku = url.searchParams.get("pelaku");
    const aksi = url.searchParams.get("aksi");
    let baris = state.audit;
    if (dari) baris = baris.filter((b) => tanggalJakarta(b.created_at) >= dari);
    if (sampai) baris = baris.filter((b) => tanggalJakarta(b.created_at) <= sampai);
    if (pelaku) baris = baris.filter((b) => b.actor_email.toLowerCase().includes(pelaku.toLowerCase()));
    if (aksi) baris = baris.filter((b) => b.action === aksi);

    const halaman = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const ukuran = 50;
    const mulai = (halaman - 1) * ukuran;
    const potong = baris.slice(mulai, mulai + ukuran);
    kirim(res, 200, {
      count: baris.length,
      next: mulai + ukuran < baris.length ? `/api/v1/audit/?page=${halaman + 1}` : null,
      previous: halaman > 1 ? `/api/v1/audit/?page=${halaman - 1}` : null,
      results: potong,
    });
    return;
  }

  const produkDetail = path.match(/^\/api\/v1\/katalog\/produk\/([\w-]+)$/);
  if (produkDetail && method === "GET") {
    kirim(res, 200, {
      id: 1,
      slug: produkDetail[1],
      nama: "Batik Demo",
      kategori: { slug: "tulis", nama: "Batik Tulis", label_pendek: "Tulis" },
      teknik: "tulis",
      teknik_label: "Batik Tulis",
      label: "Baru",
      harga: 350000,
      unggulan: true,
      motif: "parang",
      bentuk: "kain",
      warna_utama: "soga",
      foto_utama: null,
      deskripsi: "Batik demo untuk pengujian.",
      bahan_detail: "Katun primisima.",
      perawatan: "Cuci tangan dengan sabun lembut.",
      koleksi: "Sogan Klasik",
      perajin: "Bu Siti",
      cerita_judul: "Cerita demo",
      cerita_isi: "Cerita singkat untuk pengujian.",
      rating: "4.8",
      jumlah_ulasan: 12,
      terjual: 30,
      varian: [{ id: 1, warna: "soga", ukuran: "L", sku: "DEMO-L", stok: 5 }],
      foto: [{ jenis: "depan", url: null }],
      tersedia: true,
      terkait: [],
    });
    return;
  }

  if (path === "/api/v1/katalog/produk" && method === "GET") {
    kirim(res, 200, { jumlah: 0, halaman: 1, per_halaman: 6, total_halaman: 1, dari: 0, sampai: 0, hasil: [], meta: { total_produk: 0, total_perajin: 0, harga_min: 0, harga_maks: 0 } });
    return;
  }

  if (path === "/api/v1/katalog/kategori" && method === "GET") {
    kirim(res, 200, { total: 0, kategori: [] });
    return;
  }

  if (path === "/api/v1/keranjang" && method === "GET") {
    kirim(res, 200, {
      item: [],
      ringkasan: { jumlah_produk: 0, jumlah_barang: 0, subtotal: 0, ongkir: 0, promo_ongkir: 0, diskon_voucher: 0, kode_voucher: "", voucher_galat: null, total: 0, gratis_ongkir_min: 0 },
    });
    return;
  }

  // ---- Fase 1: katalog admin ----

  if (path === "/api/v1/katalog/kelola/kategori" || path === "/api/v1/katalog/kelola/motif") {
    if (!butuhAdmin(req, res)) return;
    const jenis = path.endsWith("kategori") ? "kategori" : "motif";
    if (method === "GET") {
      kirim(res, 200, state[jenis]);
      return;
    }
    if (method === "POST") {
      const data = await bacaBody(req);
      if (state[jenis].some((x) => x.slug === data.slug)) {
        kirim(res, 400, { slug: ["Slug sudah dipakai."] });
        return;
      }
      const baru =
        jenis === "kategori"
          ? { id: state.urut.kategori++, nama: data.nama, slug: data.slug, label_pendek: data.label_pendek ?? "", urutan: Number(data.urutan ?? 0) }
          : { id: state.urut.motif++, nama: data.nama, slug: data.slug, deskripsi: data.deskripsi ?? "" };
      state[jenis].push(baru);
      kirim(res, 201, baru);
      return;
    }
  }

  const masterDetail = path.match(/^\/api\/v1\/katalog\/kelola\/(kategori|motif)\/(\d+)$/);
  if (masterDetail) {
    if (!butuhAdmin(req, res)) return;
    const jenis = masterDetail[1];
    const id = Number(masterDetail[2]);
    const item = state[jenis].find((x) => x.id === id);
    if (!item) {
      kirim(res, 404, { detail: "Tidak ditemukan." });
      return;
    }
    if (method === "PATCH") {
      Object.assign(item, await bacaBody(req));
      kirim(res, 200, item);
      return;
    }
    if (method === "DELETE") {
      if (jenis === "kategori" && state.produk.some((p) => p.kategori === id)) {
        kirim(res, 409, { code: "MASIH_DIPAKAI", message: "Kategori masih dipakai produk." });
        return;
      }
      if (jenis === "motif" && state.produk.some((p) => p.motif === item.slug)) {
        kirim(res, 409, { code: "MASIH_DIPAKAI", message: "Motif masih dipakai produk." });
        return;
      }
      state[jenis] = state[jenis].filter((x) => x.id !== id);
      kirim(res, 204);
      return;
    }
  }

  if (path === "/api/v1/katalog/kelola/produk") {
    if (!butuhAdmin(req, res)) return;
    if (method === "GET") {
      kirim(res, 200, state.produk);
      return;
    }
    if (method === "POST") {
      const data = await bacaBody(req);
      const produk = {
        id: state.urut.produk++,
        ...data,
        rating: "0",
        jumlah_ulasan: 0,
        terjual: 0,
        dibuat: new Date().toISOString(),
        varian: [],
        foto: [],
      };
      state.produk.push(produk);
      kirim(res, 201, produk);
      return;
    }
  }

  const produkAdmin = path.match(/^\/api\/v1\/katalog\/kelola\/produk\/(\d+)$/);
  if (produkAdmin) {
    if (!butuhAdmin(req, res)) return;
    const produk = state.produk.find((p) => p.id === Number(produkAdmin[1]));
    if (!produk) {
      kirim(res, 404, { detail: "Tidak ditemukan." });
      return;
    }
    if (method === "PATCH") {
      Object.assign(produk, await bacaBody(req));
      kirim(res, 200, produk);
      return;
    }
  }

  const varianBaru = path.match(/^\/api\/v1\/katalog\/kelola\/produk\/(\d+)\/varian$/);
  if (varianBaru && method === "POST") {
    if (!butuhAdmin(req, res)) return;
    const produk = state.produk.find((p) => p.id === Number(varianBaru[1]));
    if (!produk) {
      kirim(res, 404, { detail: "Tidak ditemukan." });
      return;
    }
    const data = await bacaBody(req);
    if (state.produk.some((p) => p.varian.some((v) => v.sku === data.sku))) {
      kirim(res, 400, { sku: ["SKU sudah dipakai."] });
      return;
    }
    const varian = {
      id: state.urut.varian++,
      produk: produk.id,
      warna: data.warna,
      ukuran: data.ukuran,
      sku: data.sku,
      harga_beli: Number(data.harga_beli ?? 0),
      qr_token: `tok-${data.sku}`,
      aktif: data.aktif ?? true,
      stok: 0,
      status_stok: "Habis",
    };
    produk.varian.push(varian);
    state.stok.push({
      varian: varian.id,
      sku: varian.sku,
      produk: produk.nama,
      ukuran: varian.ukuran,
      warna: varian.warna,
      kategori: state.kategori.find((k) => k.id === produk.kategori)?.slug ?? "",
      stok_fisik: 0,
      stok_terpesan: 0,
      stok_minimum: 0,
    });
    kirim(res, 201, varian);
    return;
  }

  const varianAdmin = path.match(/^\/api\/v1\/katalog\/kelola\/varian\/(\d+)$/);
  if (varianAdmin && method === "PATCH") {
    if (!butuhAdmin(req, res)) return;
    const found = cariVarian(Number(varianAdmin[1]));
    if (!found) {
      kirim(res, 404, { detail: "Tidak ditemukan." });
      return;
    }
    const data = await bacaBody(req);
    if (
      data.sku &&
      state.produk.some((p) => p.varian.some((v) => v.sku === data.sku && v.id !== found.varian.id))
    ) {
      kirim(res, 400, { sku: ["SKU sudah dipakai."] });
      return;
    }
    Object.assign(found.varian, data);
    const stok = state.stok.find((s) => s.varian === found.varian.id);
    if (stok) Object.assign(stok, { sku: found.varian.sku, ukuran: found.varian.ukuran, warna: found.varian.warna });
    kirim(res, 200, found.varian);
    return;
  }

  const fotoBaru = path.match(/^\/api\/v1\/katalog\/kelola\/produk\/(\d+)\/foto$/);
  if (fotoBaru && method === "POST") {
    if (!butuhAdmin(req, res)) return;
    const produk = state.produk.find((p) => p.id === Number(fotoBaru[1]));
    if (!produk) {
      kirim(res, 404, { detail: "Tidak ditemukan." });
      return;
    }
    // Multipart tidak diurai; cukup kembalikan foto dengan URL gambar mock.
    const foto = {
      id: state.urut.foto++,
      jenis: "depan",
      alt: "",
      urutan: produk.foto.length,
      url: "/api/v1/katalog/varian/1/qr/",
    };
    produk.foto.push(foto);
    kirim(res, 201, foto);
    return;
  }

  const fotoHapus = path.match(/^\/api\/v1\/katalog\/kelola\/foto\/(\d+)$/);
  if (fotoHapus && method === "DELETE") {
    if (!butuhAdmin(req, res)) return;
    for (const p of state.produk) p.foto = p.foto.filter((f) => f.id !== Number(fotoHapus[1]));
    kirim(res, 204);
    return;
  }

  if (path === "/api/v1/katalog/kelola/ulasan" && method === "GET") {
    if (!butuhAdmin(req, res)) return;
    kirim(res, 200, state.ulasan);
    return;
  }

  const ulasanAdmin = path.match(/^\/api\/v1\/katalog\/kelola\/ulasan\/(\d+)$/);
  if (ulasanAdmin && method === "PATCH") {
    if (!butuhAdmin(req, res)) return;
    const ulasan = state.ulasan.find((u) => u.id === Number(ulasanAdmin[1]));
    if (!ulasan) {
      kirim(res, 404, { detail: "Tidak ditemukan." });
      return;
    }
    Object.assign(ulasan, await bacaBody(req));
    kirim(res, 200, ulasan);
    return;
  }

  if (path === "/api/v1/katalog/kelola/panduan-ukuran") {
    if (!butuhAdmin(req, res)) return;
    if (method === "GET") {
      kirim(res, 200, state.panduan);
      return;
    }
    if (method === "POST") {
      const data = await bacaBody(req);
      if (state.panduan.some((p) => p.kategori === Number(data.kategori))) {
        kirim(res, 400, { kategori: ["Panduan kategori ini sudah ada."] });
        return;
      }
      const baru = {
        id: state.urut.panduan++,
        kategori: Number(data.kategori),
        tabel: data.tabel,
        diperbarui: new Date().toISOString(),
      };
      state.panduan.push(baru);
      kirim(res, 201, baru);
      return;
    }
  }

  const panduanAdmin = path.match(/^\/api\/v1\/katalog\/kelola\/panduan-ukuran\/(\d+)$/);
  if (panduanAdmin) {
    if (!butuhAdmin(req, res)) return;
    const item = state.panduan.find((p) => p.id === Number(panduanAdmin[1]));
    if (!item) {
      kirim(res, 404, { detail: "Tidak ditemukan." });
      return;
    }
    if (method === "PATCH") {
      Object.assign(item, await bacaBody(req), { diperbarui: new Date().toISOString() });
      kirim(res, 200, item);
      return;
    }
    if (method === "DELETE") {
      state.panduan = state.panduan.filter((p) => p.id !== item.id);
      kirim(res, 204);
      return;
    }
  }

  const qrVarian = path.match(/^\/api\/v1\/katalog\/varian\/(\d+)\/qr$/);
  if (qrVarian && method === "GET") {
    if (!butuhAdmin(req, res)) return;
    res.writeHead(200, { "content-type": "image/svg+xml" });
    res.end('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="#fff"/><rect x="4" y="4" width="40" height="40" fill="#262120"/></svg>');
    return;
  }

  if (path === "/api/v1/katalog/label" && method === "POST") {
    if (!butuhAdmin(req, res)) return;
    const data = await bacaBody(req);
    if (data.produk) {
      const produk = state.produk.find((p) => p.id === Number(data.produk));
      if (!produk || produk.varian.filter((v) => v.aktif).length === 0) {
        kirim(res, 400, { varian: ["Produk tidak punya varian aktif."] });
        return;
      }
    }
    res.writeHead(200, { "content-type": "application/pdf" });
    res.end(Buffer.from("%PDF-1.4\n% mock label\n%%EOF"));
    return;
  }

  // ---- Fase 1: stok ----

  if (path === "/api/v1/stok" && method === "GET") {
    if (!butuhAdmin(req, res)) return;
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    const kategori = url.searchParams.get("kategori");
    const ukuran = url.searchParams.get("ukuran");
    const warna = url.searchParams.get("warna");
    let data = state.stok;
    if (q) data = data.filter((s) => s.sku.toLowerCase().includes(q) || s.produk.toLowerCase().includes(q));
    if (kategori) data = data.filter((s) => s.kategori === kategori);
    if (ukuran) data = data.filter((s) => s.ukuran === ukuran);
    if (warna) data = data.filter((s) => s.warna === warna);
    kirim(res, 200, halaman(data.map(stokPublik), url));
    return;
  }

  if (path === "/api/v1/stok/menipis" && method === "GET") {
    if (!butuhAdmin(req, res)) return;
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    let data = state.stok.filter((s) => s.stok_fisik - s.stok_terpesan <= s.stok_minimum);
    if (q) data = data.filter((s) => s.sku.toLowerCase().includes(q) || s.produk.toLowerCase().includes(q));
    kirim(res, 200, halaman(data.map(stokPublik), url));
    return;
  }

  if (path === "/api/v1/stok/mutasi" && method === "GET") {
    if (!butuhAdmin(req, res)) return;
    const varianId = url.searchParams.get("varian_id");
    const tipe = url.searchParams.get("tipe");
    const dari = url.searchParams.get("dari");
    const sampai = url.searchParams.get("sampai");
    let data = state.mutasi;
    if (varianId) data = data.filter((m) => m.varian === Number(varianId));
    if (tipe) data = data.filter((m) => m.tipe === tipe);
    if (dari) data = data.filter((m) => m.dibuat.slice(0, 10) >= dari);
    if (sampai) data = data.filter((m) => m.dibuat.slice(0, 10) <= sampai);
    kirim(res, 200, halaman(data, url));
    return;
  }

  if (path === "/api/v1/stok/penyesuaian" && method === "POST") {
    if (!butuhAdmin(req, res)) return;
    const data = await bacaBody(req);
    const stok = state.stok.find((s) => s.varian === Number(data.varian_id));
    if (!stok) {
      kirim(res, 409, { code: "STOCK_NOT_FOUND", message: "Stok varian tidak ditemukan." });
      return;
    }
    const baru = stok.stok_fisik + Number(data.qty_delta);
    if (baru < stok.stok_terpesan) {
      kirim(res, 409, { code: "INSUFFICIENT_STOCK", message: "Stok tidak mencukupi." });
      return;
    }
    stok.stok_fisik = baru;
    const mutasi = {
      id: state.urut.mutasi++,
      varian: stok.varian,
      sku: stok.sku,
      tipe: "ADJUST",
      tipe_label: "Penyesuaian",
      qty_delta: Number(data.qty_delta),
      ref_type: "adjustment",
      ref_id: "",
      pelaku: "admin@mankota.id",
      catatan: String(data.alasan ?? ""),
      dibuat: new Date().toISOString(),
    };
    state.mutasi.unshift(mutasi);
    kirim(res, 201, mutasi);
    return;
  }

  const minimumStok = path.match(/^\/api\/v1\/stok\/(\d+)\/minimum$/);
  if (minimumStok && method === "PATCH") {
    if (!butuhAdmin(req, res)) return;
    const stok = state.stok.find((s) => s.varian === Number(minimumStok[1]));
    if (!stok) {
      kirim(res, 404, { code: "STOCK_NOT_FOUND", message: "Stok varian tidak ditemukan." });
      return;
    }
    const data = await bacaBody(req);
    if (!String(data.alasan ?? "").trim()) {
      kirim(res, 400, { alasan: ["Alasan wajib diisi."] });
      return;
    }
    stok.stok_minimum = Number(data.min_stock);
    kirim(res, 200, stokPublik(stok));
    return;
  }

  if (path === "/api/v1/stok/opname" && method === "POST") {
    if (!butuhAdmin(req, res)) return;
    const data = await bacaBody(req);
    const items = [];
    for (const item of data.items ?? []) {
      const stok = state.stok.find((s) => s.varian === Number(item.varian_id));
      if (!stok) {
        kirim(res, 409, { code: "STOCK_NOT_FOUND", message: "Stok varian tidak ditemukan." });
        return;
      }
      items.push({
        varian: stok.varian,
        sku: stok.sku,
        produk: stok.produk,
        ukuran: stok.ukuran,
        warna: stok.warna,
        system_qty: stok.stok_fisik,
        counted_qty: Number(item.qty_fisik),
        selisih: Number(item.qty_fisik) - stok.stok_fisik,
      });
    }
    if (new Set(items.map((i) => i.varian)).size !== items.length) {
      kirim(res, 400, { code: "INVALID_OPNAME", message: "Varian opname tidak boleh duplikat." });
      return;
    }
    const sesi = {
      id: state.urut.opname++,
      status: "DRAFT",
      status_label: "Draf",
      catatan: String(data.catatan ?? ""),
      dibuat_oleh: "admin@mankota.id",
      created_at: new Date().toISOString(),
      applied_at: null,
      items,
    };
    state.opname.set(sesi.id, sesi);
    kirim(res, 201, sesi);
    return;
  }

  const opnameDetail = path.match(/^\/api\/v1\/stok\/opname\/(\d+)$/);
  if (opnameDetail && method === "GET") {
    if (!butuhAdmin(req, res)) return;
    const sesi = state.opname.get(Number(opnameDetail[1]));
    if (!sesi) {
      kirim(res, 404, { detail: "Tidak ditemukan." });
      return;
    }
    kirim(res, 200, sesi);
    return;
  }

  const opnameTerapkan = path.match(/^\/api\/v1\/stok\/opname\/(\d+)\/terapkan$/);
  if (opnameTerapkan && method === "POST") {
    if (!butuhAdmin(req, res)) return;
    const sesi = state.opname.get(Number(opnameTerapkan[1]));
    if (!sesi) {
      kirim(res, 404, { detail: "Tidak ditemukan." });
      return;
    }
    if (sesi.status === "APPLIED") {
      kirim(res, 409, { code: "OPNAME_ALREADY_APPLIED", message: "Opname sudah diterapkan." });
      return;
    }
    for (const item of sesi.items) {
      const stok = state.stok.find((s) => s.varian === item.varian);
      if (stok) stok.stok_fisik = item.counted_qty;
    }
    sesi.status = "APPLIED";
    sesi.status_label = "Diterapkan";
    sesi.applied_at = new Date().toISOString();
    kirim(res, 200, sesi);
    return;
  }

  kirim(res, 404, { detail: `Tidak ada rute mock: ${method} ${path}` });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`mock api di http://127.0.0.1:${PORT}`);
});
