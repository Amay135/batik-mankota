"use client";

import type { ReactNode } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  terbuka: boolean;
  judul: string;
  onTutup: () => void;
  children: ReactNode;
};

/** Modal form dasbor; konten panjang bisa discroll di dalam panel. */
export function ModalDasbor({ terbuka, judul, onTutup, children }: Props) {
  return (
    <Dialog open={terbuka} onOpenChange={(buka) => !buka && onTutup()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-lg">{judul}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
