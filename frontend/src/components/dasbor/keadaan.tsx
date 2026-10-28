export function Memuat({ pesan = "Memuat data..." }: { pesan?: string }) {
  return <p role="status" className="py-6 text-[12px] text-dash-text-muted">{pesan}</p>;
}

export function Kosong({ pesan }: { pesan: string }) {
  return <p className="py-6 text-[12px] text-dash-text-muted">{pesan}</p>;
}

export function Galat({ pesan }: { pesan: string }) {
  return <p role="alert" className="galat-dasbor py-2">{pesan}</p>;
}
