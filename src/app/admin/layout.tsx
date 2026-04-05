import { AdminSidebar } from "@/components/admin/sidebar";

export const metadata = {
  title: "Admin Dashboard — GatSoft Signs",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
