import Link from "next/link";

export default function PesananTidakAda() {
  return (
    <div className="wadah py-32 text-center">
      <h1 className="text-[36px]">Pesanan tidak ditemukan.</h1>
      <Link href="/koleksi" className="tombol-marun mt-6">Kembali ke koleksi</Link>
    </div>
  );
}
