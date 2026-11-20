import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "管理後台" };

const NAV = [
  ["/admin", "總覽"], ["/admin/orders", "訂單"], ["/admin/products", "產品"], ["/admin/import", "批量匯入"], ["/admin/methods", "印刷方式"], ["/admin/shipping", "運費設定"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="container-x py-8">
      <nav className="mb-8 flex flex-wrap gap-2 border-b border-line pb-4">
        {NAV.map(([href, label]) => <Link key={href} href={href} className="chip">{label}</Link>)}
      </nav>
      {children}
    </div>
  );
}
