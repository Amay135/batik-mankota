import Link from "next/link";

export default function ProdukTidakAda() {
  return (
    <div className="wadah py-32 text-center">
      <h1 className="text-[36px]">Produk tidak ditemukan.</h1>
      <p className="mt-2 text-[12px] text-tinta-lembut">Mungkin sudah tidak dijual atau tautannya keliru.</p>
      <Link href="/koleksi" className="tombol-marun mt-6">Kembali ke koleksi</Link>
    </div>
  );
}
