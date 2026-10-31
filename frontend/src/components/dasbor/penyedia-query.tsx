"use client";

import { useState, type ReactNode } from "react";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Toaster } from "@/components/ui/sonner";
import { aksiGalat } from "@/lib/galat";

export function PenyediaQuery({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [client] = useState(() => {
    const tangani = (err: unknown) => {
      const { tujuan, pesan } = aksiGalat(err);
      if (tujuan) router.replace(tujuan);
      else if (pesan) toast.error(pesan);
    };

    return new QueryClient({
      defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
      queryCache: new QueryCache({ onError: tangani }),
      mutationCache: new MutationCache({ onError: tangani }),
    });
  });

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
