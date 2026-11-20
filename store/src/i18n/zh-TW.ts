import { site } from "@/config/site";

/** 繁體中文字典。新增語系時複製本檔翻譯，並在 i18n/index.ts 註冊。 */
const dict = {
  nav: { products: "全部商品", guide: "訂購流程", cart: "購物車", login: "登入 / 註冊", account: "會員中心", admin: "後台", search: "搜尋商品、SKU…", logout: "登出" },
  home: {
    eyebrow: "客製化禮品一站式解決方案",
    title: "把品牌，做成一份拿得出手的禮物",
    lead: "從選品、線上排版、印刷打樣到空運海運到貨，全程一個平台完成。即時報價，數量越多越划算。",
    ctaShop: "開始選品",
    ctaGuide: "了解訂購流程",
    featured: "精選商品",
    viewAll: "看全部商品",
    categories: "依品類選購",
    steps: [
      { t: "選品與即時報價", d: "選擇數量、印刷方式與印刷面積，價格即時計算，沒有隱藏費用。" },
      { t: "線上排版", d: "直接在刀模上放 Logo 與文字，同步看到成品示意圖。" },
      { t: "確認稿件與生產", d: "專人審稿後進入生產，進度隨時可在會員中心查詢。" },
      { t: "空運 / 海運到貨", d: "依重量與材積自動計算運費，急單走空運，大貨走海運更省。" },
    ],
    stepsTitle: "四個步驟，完成你的客製禮品",
    promise: [
      { t: "區間價格透明", d: "每一級數量的單價都公開。" },
      { t: "多種印刷工藝", d: "網印、熱轉印、UV、雷雕、燙金。" },
      { t: "專人審稿", d: "下單後設計師逐一檢查印刷檔。" },
      { t: "空海運雙報價", d: "時效與成本一目了然。" },
    ],
  },
  products: {
    title: "全部商品", all: "全部", empty: "找不到符合條件的商品。", from: "起", moq: "最低訂購", pcs: "件",
    sort: { default: "精選排序", price_asc: "價格由低到高", price_desc: "價格由高到低" },
    resultFor: (q: string) => `「${q}」的搜尋結果`,
  },
  product: {
    sku: "商品編號", material: "材質", size: "尺寸", leadDays: "生產天數", days: "個工作天", weight: "單件重量", packing: "裝箱",
    packingValue: (qty: number, l: number, w: number, h: number, kg: number) => `${qty} 件 / 箱，${l} × ${w} × ${h} cm，約 ${kg} kg`,
    color: "顏色", qty: "數量", tierTitle: "區間價格（素面單價）", tierQty: "數量", tierPrice: "單價", andUp: "以上",
    printTitle: "印刷設定", printNone: "不印刷", position: "印刷位置", area: "印刷面積", method: "印刷方式", colors: "色數",
    colorsUnit: "色", quoteTitle: "即時報價", goods: "商品", setup: "版費", subtotal: "小計（未含運費與稅）", unitAllIn: "含印刷每件均價",
    shipTitle: "運費試算", shipTo: "運送至", air: "空運", sea: "海運", chargeableKg: "計費重", chargeableCbm: "計費體積", eta: "約", etaDays: "天",
    grossWeight: "預估毛重", cartons: "箱數", noShip: "此地區暫無報價，請聯繫客服",
    design: "線上排版", designHint: "在刀模上直接排版並預覽成品示意圖",
    addToCart: "加入購物車", addBlank: "加入購物車（素面）", addLater: "稿件稍後提供，先加入購物車",
    artwork: "已有設計稿？直接上傳", artworkHint: "支援 AI / PDF / EPS / PSD / PNG / JPG / ZIP，50MB 以內", artworkUploaded: "已上傳",
    uploading: "上傳中…", added: "已加入購物車", desc: "商品說明", needPrint: "請先選擇至少一個印刷位置",
    nextTier: (n: number, price: string) => `再加 ${n} 件，單價降為 ${price}`,
  },
  designer: {
    title: "線上排版", back: "返回商品頁", noDraft: "請先在商品頁選擇數量與印刷設定，再進入線上排版。", toProduct: "前往商品頁",
    addText: "加入文字", addImage: "上傳圖片", defaultText: "輸入文字", undo: "復原", redo: "重做", delete: "刪除", duplicate: "複製",
    forward: "上移一層", backward: "下移一層", centerH: "水平置中", centerV: "垂直置中", fit: "填滿印刷範圍",
    showDieline: "顯示刀模", font: "字體", fontSize: "字級", fill: "顏色", bold: "粗體", italic: "斜體", align: "對齊",
    printArea: "印刷範圍", safeLine: "安全線", legendCut: "裁切線", legendFold: "摺線", legendArea: "印刷範圍", legendSafe: "安全線（重要內容請放在內側）",
    mockup: "成品示意圖", mockupNote: "示意圖僅供版面參考，實際顏色與位置以審稿確認為準。", noMockup: "此商品提供刀模展開圖預覽。",
    lowDpi: (dpi: number) => `圖片解析度約 ${dpi} dpi，低於建議的 150 dpi，印刷可能模糊。`,
    okDpi: (dpi: number) => `圖片解析度約 ${dpi} dpi`,
    colorLimit: (n: number, method: string) => `此位置選擇「${method}」${n} 色，請確認設計不超過 ${n} 個顏色。`,
    save: "完成排版，加入購物車", saving: "儲存中…", empty: "請至少在一個印刷位置加入圖片或文字。", saveFailed: "儲存失敗，請稍後再試。",
    tips: "提示：圖片建議 300 dpi、去背 PNG 或向量檔效果最好。", layers: "物件",
    selectHint: "點選畫布上的物件即可編輯。",
  },
  cart: {
    title: "購物車", empty: "購物車是空的。", goShop: "去逛逛", remove: "移除", qty: "數量", blank: "素面（不印刷）", design: "線上排版稿", artwork: "已上傳稿件",
    artworkLater: "稿件稍後提供", summary: "訂單摘要", goods: "商品金額", print: "印刷費", setup: "版費", shipping: "運費", tax: `營業稅 ${Math.round(site.taxRate * 100)}%`,
    total: "應付總額", checkout: "前往結帳", shipTo: "運送地區", shipMode: "運送方式", weight: "預估毛重", volume: "體積", updating: "計算中…",
    lineError: "此品項無法報價，請調整數量或移除", perUnit: "每件", printQuote: "列印報價單",
  },
  checkout: {
    title: "結帳", contact: "收件資訊", name: "收件人", phone: "電話", email: "Email", company: "公司名稱（選填）", taxId: "統一編號（選填）",
    address: "收件地址", note: "訂單備註（選填）", notePh: "例：T 恤各尺寸數量、希望到貨日、發票抬頭…", payment: "付款方式", bank: "銀行轉帳 / ATM",
    bankHint: "送出訂單後會顯示匯款資訊；款項確認後進入審稿與生產。", card: "線上刷卡（即將開放）", submit: "送出訂單", submitting: "送出中…",
    agree: "送出訂單即表示同意審稿後依確認稿生產，客製商品恕不接受無瑕疵退換。", failed: "訂單送出失敗",
  },
  order: {
    title: "訂單", thanks: "訂單已成立，謝謝你！", no: "訂單編號", date: "下單時間", status: "狀態", payInfo: "匯款資訊", payNote: "匯款後請保留收據，我們確認款項後會以 Email 通知並開始審稿。",
    items: "訂購明細", ship: "運送", tracking: "物流單號", paid: "已付款", unpaid: "未付款", myOrders: "我的訂單", none: "還沒有訂單。", view: "查看",
    statuses: {
      pending_payment: "待付款", reviewing: "稿件審核中", in_production: "生產中", shipped: "已出貨", completed: "已完成", cancelled: "已取消",
    } as Record<string, string>,
  },
  auth: {
    login: "登入", register: "註冊", email: "Email", password: "密碼", name: "姓名", phone: "電話", company: "公司名稱（選填）",
    noAccount: "還沒有帳號？", haveAccount: "已經有帳號？", badLogin: "Email 或密碼錯誤", emailTaken: "此 Email 已註冊", weakPassword: "密碼至少需 8 個字元",
    invalid: "請確認欄位格式", profile: "會員資料", hello: (n: string) => `${n}，你好`,
  },
  guide: {
    title: "訂購流程與稿件規範",
    methodsTitle: "印刷方式比較",
    fileTitle: "稿件規範",
    fileRules: [
      "圖片解析度建議 300 dpi（至少 150 dpi），去背請用 PNG。",
      "向量 Logo 請提供 AI / PDF / SVG，文字請先轉外框。",
      "重要內容請放在安全線內側 3 mm；滿版設計請延伸至印刷範圍邊緣。",
      "網版印刷與燙金以色數計價，漸層與照片請改選全彩印刷方式。",
    ],
    shipTitle: "運送與運費",
    shipRules: [
      "運費依整張訂單的毛重與材積自動計算：空運以「實重與材積重（長×寬×高÷6000）取大」計費，海運以體積（CBM）計費。",
      "空運時效快，適合急單與小量；海運單價低，適合大貨。",
      "實際出貨重量若與預估差異過大，客服會在出貨前與你確認。",
    ],
    faqTitle: "常見問題",
    faq: [
      { q: "可以先打樣嗎？", a: "可以。下單時於備註註明需要打樣，客服會提供打樣費用與時程。" },
      { q: "最低訂購量是多少？", a: "每項商品的最低訂購量標示在商品頁，數量越多單價越低。" },
      { q: "下單後多久可以收到？", a: "生產天數標示於商品頁，審稿確認後起算，再加上所選運送方式的時效。" },
      { q: "可以開立發票嗎？", a: "可以。結帳時填寫公司名稱與統一編號即可。" },
    ],
  },
  footer: { about: `${site.brand} 提供企業贈品、活動周邊與品牌禮盒的客製化一站式服務。`, service: "客服信箱", links: "快速連結", rights: "版權所有" },
  common: { loading: "載入中…", save: "儲存", cancel: "取消", close: "關閉", required: "必填", notFound: "找不到頁面", backHome: "回首頁" },
};

export default dict;
export type Dict = typeof dict;
