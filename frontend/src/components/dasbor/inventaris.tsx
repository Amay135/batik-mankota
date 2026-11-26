"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { INVENTARIS_TABS } from "@/lib/admin-menu";

import { LabelQr } from "./label-qr";
import { OpnameDasbor } from "./opname";
import { StokDasbor } from "./stok";
import { StokMenipis } from "./stok-menipis";

const NILAI_TAB: readonly string[] = INVENTARIS_TABS.map((tab) => tab.nilai);

type Props = { awalTab?: string; awalProduk?: string; awalVarian?: string };

/** Satu halaman Inventaris dengan satu tingkat tab; isi tiap tab memakai komponen lama apa adanya. */
export function InventarisDasbor({ awalTab, awalProduk, awalVarian }: Props) {
  const [tab, setTab] = useState(awalTab && NILAI_TAB.includes(awalTab) ? awalTab : "stok");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Inventaris</h1>
        <p className="mt-1 text-[12px] text-dash-text-muted">
          Stok per varian, riwayat mutasi, opname, stok menipis, dan label QR dalam satu tempat.
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-dash-bg-alt p-1 text-dash-text">
          {INVENTARIS_TABS.map((item) => (
            <TabsTrigger
              key={item.nilai}
              value={item.nilai}
              className="data-[state=active]:bg-dash-surface data-[state=active]:text-dash-text"
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <StokDasbor tab={tab} onTabChange={setTab} />

        <TabsContent value="opname">
          <OpnameDasbor />
        </TabsContent>

        <TabsContent value="menipis">
          <StokMenipis />
        </TabsContent>

        <TabsContent value="label">
          <LabelQr awalProduk={awalProduk} awalVarian={awalVarian} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
