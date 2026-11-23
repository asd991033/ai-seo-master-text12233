"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { sendOrderToSupplier, syncOrderFromSupplier } from "@/lib/supplier";

/** 後台手動送單（自動送單失敗、或需要改郵遞區號／物流時使用） */
export async function sendToSupplier(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id")) || 0;
  if (id) await sendOrderToSupplier(id, { postcode: String(fd.get("postcode") ?? ""), logistics: String(fd.get("logistics") ?? ""), manual: true });
  revalidatePath(`/admin/orders/${id}`);
}

/** 後台手動同步供應商的狀態與物流單號 */
export async function syncSupplier(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id")) || 0;
  if (id) await syncOrderFromSupplier(id);
  revalidatePath(`/admin/orders/${id}`);
}
