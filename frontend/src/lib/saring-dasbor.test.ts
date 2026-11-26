import { describe, expect, it } from "vitest";

import { saringProduk, saringUlasan } from "./saring-dasbor";

const produk = [
  { id: 1, nama: "Batik Parang", kategori: 1, motif: "parang", aktif: true },
  { id: 2, nama: "Batik Sogan", kategori: 1, motif: "sogan", aktif: true },
  { id: 3, nama: "Kemeja Kawung", kategori: 2, motif: "kawung", aktif: false },
];

const ulasan = [
  { id: 1, produk: "batik-parang", rating: 5, tampil: true },
  { id: 2, produk: "batik-sogan", rating: 3, tampil: false },
];

describe("saringProduk", () => {
  const kosong = { q: "", kategori: "", motif: "", aktif: "" };

  it("mengembalikan semua saat filter kosong", () => {
    expect(saringProduk(produk, kosong)).toHaveLength(3);
  });

  it("mencari nama tanpa peduli huruf besar/kecil dan spasi tepi", () => {
    expect(saringProduk(produk, { ...kosong, q: "  parang " }).map((p) => p.id)).toEqual([1]);
  });

  it("menyaring kategori, motif, dan status terbit", () => {
    expect(saringProduk(produk, { ...kosong, kategori: "1" }).map((p) => p.id)).toEqual([1, 2]);
    expect(saringProduk(produk, { ...kosong, motif: "kawung" }).map((p) => p.id)).toEqual([3]);
    expect(saringProduk(produk, { ...kosong, aktif: "false" }).map((p) => p.id)).toEqual([3]);
  });

  it("menganggap aktif yang tidak diisi sebagai terbit", () => {
    const tanpaAktif = [{ ...produk[0], aktif: undefined }];
    expect(saringProduk(tanpaAktif, { ...kosong, aktif: "true" })).toHaveLength(1);
  });
});

describe("saringUlasan", () => {
  const kosong = { produk: "", rating: "", tampil: "" };

  it("mengembalikan semua saat filter kosong", () => {
    expect(saringUlasan(ulasan, kosong)).toHaveLength(2);
  });

  it("menyaring produk, rating, dan status tampil", () => {
    expect(saringUlasan(ulasan, { ...kosong, produk: "batik-sogan" }).map((u) => u.id)).toEqual([2]);
    expect(saringUlasan(ulasan, { ...kosong, rating: "5" }).map((u) => u.id)).toEqual([1]);
    expect(saringUlasan(ulasan, { ...kosong, tampil: "false" }).map((u) => u.id)).toEqual([2]);
  });
});
