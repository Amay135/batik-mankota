"use client";

import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { EmptyState } from "./keadaan";

export type Sortir = { id: string; arah: "asc" | "desc" };

type Props<TData> = {
  kolom: ColumnDef<TData, unknown>[];
  data: TData[];
  total: number;
  halaman: number;
  perHalaman: number;
  onHalaman: (halaman: number) => void;
  kosong: string;
  cari?: { nilai: string; onUbah: (nilai: string) => void; placeholder?: string };
  onSortir?: (sortir: Sortir | null) => void;
};

/** Tabel data dengan pencarian, sortir, dan paginasi server (manual). */
export function DataTable<TData>({
  kolom,
  data,
  total,
  halaman,
  perHalaman,
  onHalaman,
  kosong,
  cari,
  onSortir,
}: Props<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const totalHalaman = Math.max(1, Math.ceil(total / perHalaman));
  const halamanAman = Math.min(halaman, totalHalaman);

  const table = useReactTable({
    data,
    columns: kolom,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: totalHalaman,
    state: { pagination: { pageIndex: halamanAman - 1, pageSize: perHalaman }, sorting },
    onSortingChange: onSortir
      ? (updater) => {
          const next = typeof updater === "function" ? updater(sorting) : updater;
          setSorting(next);
          onSortir(next[0] ? { id: next[0].id, arah: next[0].desc ? "desc" : "asc" } : null);
        }
      : undefined,
  });

  if (data.length === 0) return <EmptyState pesan={kosong} />;

  return (
    <div>
      {cari && (
        <Input
          type="search"
          value={cari.nilai}
          onChange={(e) => cari.onUbah(e.target.value)}
          placeholder={cari.placeholder ?? "Cari..."}
          className="mb-3 max-w-xs"
        />
      )}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="hover:bg-transparent">
              {hg.headers.map((h) => (
                <TableHead key={h.id}>
                  {onSortir && h.column.getCanSort() ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={h.column.getToggleSortingHandler()}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getIsSorted() === "asc" ? "↑" : h.column.getIsSorted() === "desc" ? "↓" : ""}
                    </button>
                  ) : (
                    flexRender(h.column.columnDef.header, h.getContext())
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-3 flex items-center justify-between text-[11.5px] text-dash-text-muted">
        <span>
          {total} baris · halaman {halamanAman} dari {totalHalaman}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 text-[11.5px]"
            onClick={() => onHalaman(Math.max(1, halamanAman - 1))}
            disabled={halamanAman === 1}
          >
            Sebelumnya
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 text-[11.5px]"
            onClick={() => onHalaman(Math.min(totalHalaman, halamanAman + 1))}
            disabled={halamanAman === totalHalaman}
          >
            Berikutnya
          </Button>
        </div>
      </div>
    </div>
  );
}
