"use client";

import { inisial, labelRole, namaTampil, usePengguna } from "./pengguna-context";

export default function ProfilPengguna() {
  const status = usePengguna();
  const nama = namaTampil(status);

  return (
    <div className="flex items-center gap-2">
      <span className="grid size-[26px] place-items-center rounded-full bg-[#b87a3d] text-[10px] font-semibold text-white">
        {status.pengguna ? inisial(nama) : "··"}
      </span>
      <span>
        <div className="max-w-[160px] truncate text-[11px] font-semibold">{nama}</div>
        <div className="text-[10px] text-[#8a7f73]">{labelRole(status.pengguna)}</div>
      </span>
    </div>
  );
}