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

test("admin: login, TOTP, menu fase 0, kelola akun", async ({ page }) => {
  await masukAdmin(page);

  await expect(page.locator("[data-menu-id]")).toHaveCount(2);
  const id = await page
    .locator("[data-menu-id]")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-menu-id")));
  expect(id).toEqual(["ADM-01", "ADM-03"]);

  await page.getByLabel("Nama lengkap").fill("Kasir Baru");
  await page.getByLabel("Email").fill("kasir.baru@mankota.id");
  await page.getByLabel("Kata sandi").fill("sandi12345");
  await page.getByRole("button", { name: "Tambah akun" }).click();

  const baris = page.getByRole("row", { name: /kasir\.baru@mankota\.id/ });
  await expect(baris).toBeVisible();

  await baris.getByRole("button", { name: "Ubah" }).click();
  const dialogUbah = page.locator("dialog[open]");
  await dialogUbah.getByLabel("Nama lengkap").fill("Kasir Diubah");
  await dialogUbah.getByRole("button", { name: "Simpan" }).click();
  await expect(baris).toContainText("Kasir Diubah");

  await baris.getByRole("button", { name: "Nonaktifkan" }).click();
  await page.locator("dialog[open]").getByRole("button", { name: "Nonaktifkan" }).click();
  await expect(baris.locator(".lencana").first()).toHaveText("Nonaktif");

  await baris.getByRole("button", { name: "Reset sandi" }).click();
  const dialogSandi = page.locator("dialog[open]");
  await dialogSandi.getByLabel("Kata sandi baru").fill("rahasia123");
  await dialogSandi.getByRole("button", { name: "Reset" }).click();
  await expect(page.locator("dialog[open]")).toHaveCount(0);

  await page.screenshot({ path: "e2e/screenshots/adm-01.png", fullPage: true });
});

test("admin tanpa TOTP diarahkan ke setup", async ({ page }) => {
  await masuk(page, "admin2@mankota.id", "admin12345");
  await page.waitForURL("**/verifikasi-2fa");

  await page.getByRole("button", { name: "Mulai setup 2FA" }).click();
  await expect(page.locator('svg[aria-label="Kode QR setup 2FA"]')).toBeVisible();
  await expect(page.getByText("JBSWY3DPEHPK3PXP")).toBeVisible();

  await page.screenshot({ path: "e2e/screenshots/adm-02.png", fullPage: true });
});

test("kode terkunci menampilkan pesan Indonesia", async ({ page }) => {
  await masuk(page, "admin@mankota.id", "admin12345");
  await page.waitForURL("**/verifikasi-2fa");

  await page.getByLabel("Kode 6 digit").fill("000000");
  await page.getByRole("button", { name: "Verifikasi" }).click();
  await expect(page.getByText("Terlalu banyak kode salah.")).toBeVisible();
});

for (const [email, sandi] of [
  ["kasir@mankota.id", "kasir12345"],
  ["user@mankota.id", "user12345"],
]) {
  test(`${email} tidak bisa membuka dashboard`, async ({ page }) => {
    await masuk(page, email, sandi);
    await page.waitForURL("**/koleksi");
    await page.goto("/dashboard");
    await page.waitForURL("**/403");
    await expect(page.getByRole("heading", { name: "Akses ditolak" })).toBeVisible();
  });
}

test("admin tidak bisa membuka checkout pelanggan", async ({ page }) => {
  await masukAdmin(page);
  await page.goto("/checkout");
  await page.waitForURL("**/403");
});

test("audit log tampil dan bisa difilter", async ({ page }) => {
  await masukAdmin(page);
  await page.goto("/dashboard/audit");

  await expect(page.getByRole("heading", { name: "Log Audit" })).toBeVisible();
  await expect(page.getByText("60 baris · halaman 1 dari 2")).toBeVisible();

  await page.getByLabel("Aksi").selectOption("role_change");
  await expect(page.getByText("12 baris · halaman 1 dari 1")).toBeVisible();

  await page.screenshot({ path: "e2e/screenshots/adm-03.png", fullPage: true });
});

test("tombol keluar kembali ke halaman masuk", async ({ page }) => {
  await masukAdmin(page);
  await page.getByRole("button", { name: "Keluar" }).click();
  await page.waitForURL("**/masuk");
});
