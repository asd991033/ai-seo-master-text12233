import { getUser } from "@/lib/auth";
import { buildReviewTemplate } from "@/lib/reviews";

export async function GET() {
  const user = await getUser();
  if (user?.role !== "admin") return new Response("Forbidden", { status: 403 });
  return new Response(new Uint8Array(await buildReviewTemplate()), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="review-import-template.xlsx"',
    },
  });
}
