import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getUser } from "@/lib/auth";

export const newAccessKey = () => randomBytes(18).toString("base64url");
const GUEST_EMAIL = "guest@orders.local";

/** 訪客訂單共用的系統帳號（無法登入）。訪客訂單不會掛到同 Email 的會員底下，避免別人用 Email 看到訂單 */
export async function guestUserId(): Promise<number> {
  const [hit] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, GUEST_EMAIL));
  if (hit) return hit.id;
  const [row] = await db.insert(schema.users).values({ email: GUEST_EMAIL, passwordHash: `guest$${randomBytes(16).toString("hex")}`, name: "訪客結帳" }).returning({ id: schema.users.id });
  return row.id;
}

const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

/** 取得訂單：登入的訂單本人，或帶著正確的 key。都不符合回傳 null */
export async function orderFor(orderNo: string, key: string | null | undefined) {
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.orderNo, orderNo));
  if (!order) return null;
  if (key && order.accessKey && same(key, order.accessKey)) return order;
  const user = await getUser();
  return user && user.id === order.userId ? order : null;
}
/** 訂單頁網址後面要帶的 key 參數 */
export const keyQs = (order: { accessKey: string | null }, lead: "?" | "&" = "?") => (order.accessKey ? `${lead}key=${order.accessKey}` : "");
