export type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
  cat: string;
  type: string;
  size: string;
  tone: string;
  img: string;
};

export type CartLine = { id: number; qty: number };

export const PRODUCTS: Product[] = [
  { id: 1, name: "Kemeja Parang Indigo", price: 385000, stock: 76, cat: "Pria", type: "Batik cap", size: "L", tone: "#6d7fa6", img: "/products/kemeja-parang-indigo.jpg" },
  { id: 2, name: "Blus Kawung Soga", price: 425000, stock: 32, cat: "Wanita", type: "Batik cap", size: "S", tone: "#b98a5c", img: "/products/blus-kawung-soga.jpg" },
  { id: 3, name: "Kain Sekar Jagad", price: 650000, stock: 18, cat: "Kain", type: "Batik tulis", size: "-", tone: "#7a6a58", img: "/products/kain-sekar-jagad.jpg" },
  { id: 4, name: "Kemeja Truntum Soga", price: 365000, stock: 46, cat: "Pria", type: "Batik cap", size: "M", tone: "#a9743f", img: "/products/kemeja-truntum-soga.jpg" },
  { id: 5, name: "Dress Sekar Senja", price: 575000, stock: 21, cat: "Wanita", type: "Batik cap", size: "M", tone: "#c58a4e", img: "/products/dress-sekar-senja.jpg" },
  { id: 6, name: "Selendang Mega Mendung", price: 285000, stock: 15, cat: "Aksesori", type: "Batik tulis", size: "-", tone: "#4f6a8f", img: "/products/selendang-mega-mendung.jpg" },
];

export const CATEGORIES = ["Semua", "Pria", "Wanita", "Kain", "Aksesori"];
export const PAYMENTS = ["Tunai", "QRIS", "Debit"];
export const DISCOUNTS = [
  { label: "Tanpa diskon", pct: 0 },
  { label: "5% · Member Perak", pct: 5 },
  { label: "10% · Member Emas", pct: 10 },
];