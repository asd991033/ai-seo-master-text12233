/** 同一張訂單的瀏覽器事件與伺服器事件用同一個 ID，Meta 才會去重（前後端共用，不能引用 node 模組） */
export const purchaseEventId = (orderNo: string) => `order_${orderNo}`;
