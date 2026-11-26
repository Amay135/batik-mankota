import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:8010/__reset");
});

async function masukAdmin(page: Page) {
  await page.goto("/masuk");
  await page.getByLabel("Email").fill("admin@mankota.id");
  await page.getByLabel("Kata sandi").fill("admin12345");
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL("**/verifikasi-2fa");
  await page.getByLabel("Kode 6 digit").fill("123456");
  await page.getByRole("button", { name: "Verifikasi" }).click();
  await page.waitForURL("**/dashboard");
}

test("ADM-10 produk: daftar, tambah produk + varian, galat SKU duplikat", async ({ page }) => {
  await masukAdmin(page);
  await page.goto("/dashboard/produk");

  await expect(page.getByRole("heading", { name: "Produk", exact: true })).toBeVisible();
  await expect(page.getByRole("row", { name: /Batik Parang/ })).toBeVisible();

  await page.getByRole("button", { name: "Tambah produk" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Nama", { exact: true }).fill("Batik Kawung");
  await d.getByLabel("Slug").fill("batik-kawung");
  await d.getByLabel("Kategori").selectOption("1");
  await d.getByLabel("Motif").selectOption("kawung");
  await d.getByLabel("Harga jual (Rupiah)").fill("250000");
  await d.getByRole("button", { name: "Tambah varian" }).click();
  await d.getByLabel("SKU").fill("KAWUNG-M");
  await d.getByRole("button", { name: "Simpan produk" }).click();

  await expect(page.getByRole("row", { name: /Batik Kawung/ })).toBeVisible();

  const baris = page.getByRole("row", { name: /Batik Kawung/ });
  await baris.getByRole("button", { name: "Ubah" }).click();
  const ubah = page.getByRole("dialog");
  await ubah.getByRole("button", { name: "Tambah varian" }).click();
  await ubah.getByLabel("SKU").nth(1).fill("PARANG-M");
  await ubah.getByRole("button", { name: "Simpan produk" }).click();
  await expect(ubah.getByText("SKU sudah dipakai.").first()).toBeVisible();
  await ubah.getByRole("button", { name: "Tutup" }).click();

  await page.screenshot({ path: "e2e/screenshots/adm-10.png", fullPage: true });
});

test("ADM-11 label QR: pratinjau, unduh PDF, galat produk tanpa varian", async ({ page }) => {
  await masukAdmin(page);
  await page.goto("/dashboard/inventaris?tab=label&produk=1");

  await expect(page.getByRole("tab", { name: "Label QR" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByAltText("QR PARANG-M")).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Unduh PDF" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("label.pdf");

  await page.getByLabel("Produk").selectOption("2");
  await page.getByRole("button", { name: "Unduh PDF" }).click();
  await expect(page.getByText("Produk tidak punya varian aktif.")).toBeVisible();

  await page.screenshot({ path: "e2e/screenshots/adm-11.png", fullPage: true });
});

test("ADM-12 stok: penyesuaian berhasil, galat stok tidak cukup, riwayat mutasi", async ({ page }) => {
  await masukAdmin(page);
  await page.goto("/dashboard/inventaris?tab=stok");

  await expect(page.getByRole("tab", { name: "Stok", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Stok per varian" })).toBeVisible();
  const baris = page.getByRole("row", { name: /PARANG-L/ });
  await expect(baris).toBeVisible();
  await expect(baris.getByRole("cell").nth(4)).toHaveText("2");

  await baris.getByRole("button", { name: "Sesuaikan" }).click();
  const d = page.locator("dialog[open]");
  await d.getByLabel("Perubahan (positif menambah, negatif mengurangi)").fill("5");
  await d.getByLabel("Alasan").fill("Koreksi hasil hitung");
  await d.getByRole("button", { name: "Sesuaikan" }).click();
  await expect(page.getByText("Stok PARANG-L disesuaikan sebanyak 5.")).toBeVisible();
  await expect(baris.getByRole("cell").nth(4)).toHaveText("7");

  await baris.getByRole("button", { name: "Sesuaikan" }).click();
  const galat = page.locator("dialog[open]");
  await galat.getByLabel("Perubahan (positif menambah, negatif mengurangi)").fill("-100");
  await galat.getByLabel("Alasan").fill("Uji galat");
  await galat.getByRole("button", { name: "Sesuaikan" }).click();
  await expect(galat.getByText("Stok tidak mencukupi.")).toBeVisible();
  await galat.getByRole("button", { name: "Batal" }).click();

  await page.getByRole("tab", { name: "Mutasi Stok" }).click();
  await expect(page.getByRole("row", { name: /Penyesuaian/ })).toBeVisible();

  await page.screenshot({ path: "e2e/screenshots/adm-12.png", fullPage: true });
});

test("ADM-13 opname: buat sesi, terapkan, validasi hitungan", async ({ page }) => {
  await masukAdmin(page);
  await page.goto("/dashboard/inventaris?tab=opname");

  await expect(page.getByRole("tab", { name: "Opname" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Pilih varian" })).toBeVisible();
  await page.getByRole("row", { name: /PARANG-M/ }).getByRole("button", { name: "Tambah" }).click();
  await page.getByLabel("Jumlah fisik PARANG-M").fill("12");
  await page.getByLabel("Catatan sesi").fill("Cek bulanan");
  await page.getByRole("button", { name: "Buat sesi opname" }).click();

  await expect(page.getByRole("heading", { name: "Sesi opname #1" })).toBeVisible();
  await expect(page.getByRole("row", { name: /PARANG-M/ })).toContainText("+2");

  await page.getByRole("button", { name: "Terapkan opname" }).click();
  await page.locator("dialog[open]").getByRole("button", { name: "Terapkan" }).click();
  await expect(page.getByText("Diterapkan", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Sesi baru" }).click();
  await page.getByRole("row", { name: /PARANG-L/ }).getByRole("button", { name: "Tambah" }).click();
  await page.getByLabel("Jumlah fisik PARANG-L").fill("");
  await page.getByLabel("Catatan sesi").fill("Cek kedua");
  await page.getByRole("button", { name: "Buat sesi opname" }).click();
  await expect(page.getByText("Jumlah fisik harus bilangan bulat 0 atau lebih.")).toBeVisible();

  await page.screenshot({ path: "e2e/screenshots/adm-13.png", fullPage: true });
});

test("ADM-14 stok menipis: daftar, galat alasan, ubah minimum", async ({ page }) => {
  await masukAdmin(page);
  await page.goto("/dashboard/inventaris?tab=menipis");

  await expect(page.getByRole("tab", { name: "Stok Menipis" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Daftar stok menipis" })).toBeVisible();
  const baris = page.getByRole("row", { name: /PARANG-L/ });
  await expect(baris).toBeVisible();

  await baris.getByRole("button", { name: "Atur minimum" }).click();
  const d = page.locator("dialog[open]");
  await d.getByLabel("Stok minimum").fill("1");
  await d.getByLabel("Alasan").fill("   ");
  await d.getByRole("button", { name: "Simpan" }).click();
  await expect(d.getByText("Alasan wajib diisi.")).toBeVisible();

  await d.getByLabel("Alasan").fill("Uji minimum");
  await d.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByText("Stok minimum PARANG-L diubah menjadi 1.")).toBeVisible();
  await expect(page.getByText("Tidak ada stok yang menipis.")).toBeVisible();

  await page.screenshot({ path: "e2e/screenshots/adm-14.png", fullPage: true });
});

test("ADM-15 ulasan: filter, sembunyikan, galat server", async ({ page }) => {
  await masukAdmin(page);
  await page.goto("/dashboard/ulasan");

  await expect(page.getByRole("heading", { name: "Ulasan", exact: true })).toBeVisible();
  const baris = page.getByRole("row", { name: /Bahan nyaman/ });
  await expect(baris).toBeVisible();

  await page.getByLabel("Rating").selectOption("1");
  await expect(page.getByText("Tidak ada ulasan yang cocok dengan filter.")).toBeVisible();
  await page.getByLabel("Rating").selectOption("");

  await baris.getByRole("button", { name: "Sembunyikan" }).click();
  await page.locator("dialog[open]").getByRole("button", { name: "Sembunyikan" }).click();
  await expect(baris.locator(".lencana")).toHaveText("Disembunyikan");

  await page.route("**/api/v1/katalog/kelola/ulasan/1/", (route) =>
    route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ code: "NOT_FOUND", message: "Ulasan tidak ditemukan." }),
    }),
  );
  await baris.getByRole("button", { name: "Tampilkan" }).click();
  const d = page.locator("dialog[open]");
  await d.getByRole("button", { name: "Tampilkan" }).click();
  await expect(d.getByText("Ulasan tidak ditemukan.")).toBeVisible();
  await d.getByRole("button", { name: "Batal" }).click();

  await page.screenshot({ path: "e2e/screenshots/adm-15.png", fullPage: true });
});

test("ADM-16 panduan ukuran: ubah tabel, galat server, hapus", async ({ page }) => {
  await masukAdmin(page);
  await page.goto("/dashboard/panduan-ukuran");

  await expect(page.getByRole("heading", { name: "Panduan Ukuran" })).toBeVisible();
  await page.getByRole("row", { name: /Pria/ }).getByRole("button", { name: "Ubah" }).click();
  await page.getByLabel("Baris 3 kolom 2").fill("110 cm");
  await page.getByRole("button", { name: "Simpan panduan" }).click();
  await expect(page.getByText("Panduan ukuran disimpan.")).toBeVisible();

  await page.route("**/api/v1/katalog/kelola/panduan-ukuran/", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ tabel: ["Tabel tidak valid."] }),
        })
      : route.continue(),
  );
  await page.getByLabel("Kategori").selectOption("2");
  await page.getByRole("button", { name: "Simpan panduan" }).click();
  await expect(page.getByText("Tabel tidak valid.")).toBeVisible();
  await page.unroute("**/api/v1/katalog/kelola/panduan-ukuran/");

  await page.getByRole("button", { name: "Simpan panduan" }).click();
  const barisWanita = page.getByRole("row", { name: /Wanita/ });
  await expect(barisWanita).toBeVisible();

  await barisWanita.getByRole("button", { name: "Hapus" }).click();
  await page.locator("dialog[open]").getByRole("button", { name: "Hapus" }).click();
  await expect(page.getByText("Panduan ukuran dihapus.")).toBeVisible();
  await expect(barisWanita).toHaveCount(0);

  await page.screenshot({ path: "e2e/screenshots/adm-16.png", fullPage: true });
});

test("rute inventaris lama dialihkan ke tab yang tepat", async ({ page }) => {
  await masukAdmin(page);
  const rute = [
    ["/dashboard/stok", "Stok"],
    ["/dashboard/stok-menipis", "Stok Menipis"],
    ["/dashboard/opname", "Opname"],
    ["/dashboard/label?produk=1", "Label QR"],
  ] as const;

  for (const [lama, tab] of rute) {
    await page.goto(lama);
    await expect(page).toHaveURL(/\/dashboard\/inventaris\?tab=/);
    await expect(page.getByRole("tab", { name: tab, exact: true })).toHaveAttribute("aria-selected", "true");
  }
});
