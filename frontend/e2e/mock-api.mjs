// Mock API stateful untuk Playwright. Guard dashboard berjalan di server Next,
// jadi page.route tidak bisa mencegatnya; server kecil ini yang menjawab.
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";

const PORT = 8010;

let state;

function reset() {
  const aksi = ["price_change", "stock_adjust", "void_return", "role_change", "admin_login"];
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
    const halaman = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const ukuran = 50;
    const mulai = (halaman - 1) * ukuran;
    const potong = state.audit.slice(mulai, mulai + ukuran);
    kirim(res, 200, {
      count: state.audit.length,
      next: mulai + ukuran < state.audit.length ? `/api/v1/audit/?page=${halaman + 1}` : null,
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

  kirim(res, 404, { detail: `Tidak ada rute mock: ${method} ${path}` });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`mock api di http://127.0.0.1:${PORT}`);
});
