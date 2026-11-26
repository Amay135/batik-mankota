import { redirect } from "next/navigation";

export default function Page() {
  redirect("/dashboard/inventaris?tab=opname");
}
