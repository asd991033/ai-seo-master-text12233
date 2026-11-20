import { getUser } from "@/lib/auth";
import { buildTemplate } from "@/lib/excel";

export async function GET() {
  const user = await getUser();
  if (user?.role !== "admin") return new Response("Forbidden", { status: 403 });
  return new Response(new Uint8Array(await buildTemplate()), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="product-import-template.xlsx"',
    },
  });
}
