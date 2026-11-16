import { BottomNav } from "@/components/nav";
import { requireAdmin } from "@/lib/auth/session";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <main className="mx-auto max-w-xl px-4 pb-28 pt-5">{children}</main>
      <BottomNav />
    </>
  );
}
