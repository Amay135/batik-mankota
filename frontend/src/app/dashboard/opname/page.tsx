import type { Metadata } from "next";

import { OpnameDasbor } from "@/components/dasbor/opname";

export const metadata: Metadata = { title: "Opname" };

export default function Page() {
  return <OpnameDasbor />;
}
