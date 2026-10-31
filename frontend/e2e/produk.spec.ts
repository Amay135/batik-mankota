import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:8010/__reset");
});

async function masuk(page: Page, email: string, sandi: string) {
  await page.goto("/masuk");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill(sandi);
  await page.getByRole("button", { name: "Masuk" }).click();
}

async function masukAdmin(page: Page) {
  await masuk(page, "admin@mankota.id", "admin12345");
  await page.waitForURL("**/verifikasi-2fa");
  await page.getByLabel("Kode 6 digit").fill("123456");
  await page.getByRole("button", { name: "Verifikasi" }).click();
  await page.waitForURL("**/dashboard");
}

test("kasir tidak melihat tombol beli", async ({ page }) => {
  await masuk(page, "kasir@mankota.id", "kasir12345");
  await page.waitForURL("**/koleksi");
  await page.goto("/produk/demo");
  await expect(page.getByRole("heading", { name: "Batik Demo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tambah ke Keranjang" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Beli Sekarang" })).toHaveCount(0);
});

test("admin tidak melihat tombol beli", async ({ page }) => {
  await masukAdmin(page);
  await page.goto("/produk/demo");
  await expect(page.getByRole("heading", { name: "Batik Demo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tambah ke Keranjang" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Beli Sekarang" })).toHaveCount(0);
});

test("admin tidak melihat favorit/stepper dan tidak memuat keranjang", async ({ page }) => {
  await masukAdmin(page);
  const permintaanKeranjang: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "GET" && r.url().includes("/api/v1/keranjang")) permintaanKeranjang.push(r.url());
  });

  await page.goto("/produk/demo");
  await expect(page.getByRole("heading", { name: "Batik Demo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Simpan ke favorit" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Kurangi" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tambah", exact: true })).toHaveCount(0);
  expect(permintaanKeranjang).toEqual([]);
});

test("user melihat tombol beli", async ({ page }) => {
  await masuk(page, "user@mankota.id", "user12345");
  await page.waitForURL("**/koleksi");
  await page.goto("/produk/demo");
  await expect(page.getByRole("button", { name: "Tambah ke Keranjang" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Beli Sekarang" })).toBeVisible();
});
