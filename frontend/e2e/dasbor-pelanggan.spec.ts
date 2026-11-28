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

test("ADM-18 pelanggan: daftar, cari, tambah, telepon duplikat", async ({ page }) => {
  await masukAdmin(page);
  await page.goto("/dashboard/pelanggan");

  await expect(page.getByRole("heading", { name: "Pelanggan", exact: true })).toBeVisible();
  await expect(page.getByRole("row", { name: /Rina Wulandari/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Budi Santoso/ })).toBeVisible();
  await expect(page.getByText("Total pelanggan")).toBeVisible();

  await page.getByLabel("Cari pelanggan").fill("budi");
  await expect(page.getByRole("row", { name: /Budi Santoso/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Rina Wulandari/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Tambah pelanggan" }).click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Nama pelanggan").fill("Siti Aminah");
  await form.getByLabel("Nomor telepon").fill("0813-1111-2222");
  await form.getByLabel("Email").fill("siti@email.com");
  await form.getByRole("button", { name: "Simpan pelanggan" }).click();
  await expect(page.getByText("Pelanggan baru ditambahkan.")).toBeVisible();

  await page.getByLabel("Cari pelanggan").fill("siti");
  await expect(page.getByRole("row", { name: /Siti Aminah/ })).toBeVisible();

  await page.getByRole("button", { name: "Tambah pelanggan" }).click();
  const duplikat = page.getByRole("dialog");
  await duplikat.getByLabel("Nama pelanggan").fill("Duplikat");
  await duplikat.getByLabel("Nomor telepon").fill("081311112222");
  await duplikat.getByRole("button", { name: "Simpan pelanggan" }).click();
  await expect(duplikat.getByText(/Nomor telepon sudah terdaftar/)).toBeVisible();
  await duplikat.getByRole("button", { name: "Batal" }).click();
});

test("ADM-18 pelanggan: detail, statistik, riwayat, ubah, empty state", async ({ page }) => {
  await masukAdmin(page);

  await page.goto("/dashboard/pelanggan/1");
  await expect(page.getByRole("heading", { name: "Rina Wulandari" })).toBeVisible();
  await expect(page.getByText("Riwayat pembelian")).toBeVisible();
  await expect(page.getByRole("row", { name: /MK-261020-00001/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /MK-261015-00002/ })).toBeVisible();
  await expect(page.getByText("Transaksi selesai")).toBeVisible();

  await page.getByRole("button", { name: "Ubah pelanggan" }).click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Nama pelanggan").fill("Rina W.");
  await form.getByRole("button", { name: "Simpan pelanggan" }).click();
  await expect(page.getByRole("heading", { name: "Rina W." })).toBeVisible();

  await page.goto("/dashboard/pelanggan/2");
  await expect(
    page.getByText("Pelanggan ini belum memiliki riwayat pembelian."),
  ).toBeVisible();
});
