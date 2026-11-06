// Wholesale portal copy (English and Thai). Kept out of ui-text-shop.js so the
// retail storefront bundle does not carry B2B strings.

export const wholesaleEn = {
  eyebrow: "Maris Wholesale",
  title: "Wholesale portal",
  lead: "Partner pricing, minimum order quantities, and purchase orders for approved retailers and brands.",
  inquiry: {
    title: "Start with an inquiry",
    text: "Tell us about your store or brand and the fine jewelry, real gold, real diamond, or real gemstone pieces you need. The atelier replies with terms and next steps before you apply for portal access.",
    action: "Send an inquiry",
    emailLabel: "Or email us directly",
    email: "marisjewelryth@gmail.com",
    portalNote: "Already have an approved wholesale account? Sign in below."
  },
  loading: "Loading your wholesale account…",
  unavailable: "The wholesale portal is not available right now. Please try again later or contact the atelier.",
  signedOut: {
    title: "Sign in to apply",
    text: "A wholesale account is linked to your Maris account. Sign in, or create an account first, then come back to apply.",
    action: "Sign in or create an account",
    learnMore: "How wholesale works"
  },
  form: {
    title: "Apply for a wholesale account",
    intro: "Tell us about your business. The atelier reviews every application and sets your wholesale terms before prices are shown.",
    companyName: "Company / store name",
    businessType: "Business type",
    taxId: "Tax ID (optional)",
    businessAddress: "Business address",
    country: "Country",
    website: "Website or social page (optional)",
    contactName: "Contact person",
    contactPhone: "Phone",
    lineId: "LINE ID (optional)",
    expectedMonthlyVolume: "Expected order volume (optional)",
    expectedMonthlyVolumeHint: "For example: 20–50 pieces per month",
    interestedCategories: "Categories you are interested in",
    applicantNote: "Anything else we should know (optional)",
    submit: "Submit application",
    resubmit: "Update application",
    submitting: "Sending…",
    cancelEdit: "Cancel",
    invalid: "Please check the highlighted fields.",
    saved: "Application sent. The atelier will review it shortly."
  },
  businessTypes: {
    retailer: "Jewelry store / retailer",
    online_store: "Online store",
    private_label: "Private label / own brand",
    distributor: "Distributor",
    corporate_gifting: "Corporate gifting",
    other: "Other"
  },
  categories: {
    "fine-jewelry": "Fine jewelry",
    "real-gold": "Real gold",
    "real-diamond": "Real diamond",
    "real-gemstone": "Real gemstone"
  },
  status: {
    pending: { title: "Application under review", text: "Thank you, {company}. The atelier is reviewing your application and will contact you to confirm your wholesale terms." },
    rejected: { title: "Application not approved", text: "We could not approve this application as submitted. You can update the details and send it again, or contact the atelier." },
    suspended: { title: "Account on hold", text: "Your wholesale account is currently on hold. Please contact the atelier to continue ordering." },
    edit: "Edit application",
    contact: "Contact the atelier"
  },
  terms: {
    discount: "Account discount",
    paymentTerms: "Payment terms",
    company: "Account"
  },
  paymentTerms: {
    prepaid: "Full payment before production",
    deposit_50: "50% deposit, balance before shipping",
    net_15: "Net 15 days",
    net_30: "Net 30 days"
  },
  tabs: {
    catalogue: "Catalogue",
    cart: "Purchase order",
    orders: "My orders",
    label: "Wholesale sections"
  },
  catalogue: {
    search: "Search by name or code",
    category: "Category",
    allCategories: "All categories",
    empty: "No wholesale pieces are listed yet. The atelier can still quote any piece — send a note with your purchase order.",
    noMatch: "No pieces match this search.",
    moq: "Minimum {qty} pcs",
    casePack: "In multiples of {qty}",
    leadTime: "Lead time ~{days} days",
    priceBreaks: "Price per piece",
    fromQty: "{qty}+ pcs",
    basePrice: "Any quantity",
    priceOnRequest: "Price on request",
    quantity: "Quantity",
    add: "Add to PO",
    update: "Update PO",
    added: "Added to purchase order.",
    inCart: "{qty} in PO",
    discountNote: "Prices include your {discount}% account discount."
  },
  cart: {
    empty: "Your purchase order is empty. Add pieces from the catalogue.",
    item: "Piece",
    unitPrice: "Unit price",
    lineTotal: "Line total",
    remove: "Remove",
    unavailable: "No longer offered — remove this line.",
    errors: {
      invalid_quantity: "Enter a valid quantity.",
      below_moq: "Minimum is {qty} pcs.",
      case_pack: "Order in multiples of {qty}."
    },
    shippingAddress: "Ship to",
    customerReference: "Your PO number (optional)",
    requestedShipDate: "Requested ship date (optional)",
    customerNote: "Note to the atelier (optional)",
    pieces: "Pieces",
    subtotal: "Estimated subtotal",
    unpricedNote: "{count} line(s) are price on request; the atelier will quote them.",
    finalNote: "Submitting sends a purchase order for review. Nothing is charged online: the atelier confirms prices, shipping, and timing before production.",
    submit: "Submit purchase order",
    submitting: "Submitting…",
    fixErrors: "Fix the highlighted lines before submitting.",
    submitted: "Purchase order {number} sent. You can follow it under My orders."
  },
  orders: {
    empty: "No purchase orders yet.",
    number: "Order",
    submitted: "Submitted",
    status: "Status",
    total: "Total",
    view: "View",
    hide: "Hide",
    customerReference: "Your PO",
    shipTo: "Ship to",
    requestedShipDate: "Requested ship date",
    quoteValidUntil: "Quote valid until",
    tracking: "Tracking number",
    subtotal: "Subtotal",
    discount: "Discount",
    shipping: "Shipping",
    totalLabel: "Total",
    pendingPrice: "To be quoted",
    history: "Timeline",
    accept: "Accept quote",
    cancel: "Cancel order",
    confirmCancel: "Cancel this purchase order?",
    acceptNote: "Accepting confirms this order at the quoted total. The atelier will contact you about payment.",
    actor: { customer: "You", atelier: "Maris atelier" }
  },
  orderStatus: {
    submitted: "Submitted",
    quoted: "Quote ready",
    confirmed: "Confirmed",
    in_production: "In production",
    ready: "Ready to ship",
    shipped: "Shipped",
    completed: "Completed",
    cancelled: "Cancelled"
  },
  currency: "THB",
  genericError: "Something went wrong. Please try again."
};

export const wholesaleTh = {
  eyebrow: "Maris Wholesale",
  title: "พอร์ทัลขายส่ง",
  lead: "ราคาพาร์ทเนอร์ จำนวนสั่งขั้นต่ำ และใบสั่งซื้อสำหรับร้านค้าและแบรนด์ที่ได้รับอนุมัติ",
  inquiry: {
    title: "เริ่มต้นด้วยการส่ง Inquiry",
    text: "บอกเราเกี่ยวกับร้านหรือแบรนด์ของคุณ และเครื่องประดับ Fine Jewelry ทองแท้ เพชรแท้ หรือพลอยแท้ที่ต้องการ ทีมงานจะตอบกลับพร้อมเงื่อนไขและขั้นตอนถัดไป ก่อนที่คุณจะสมัครใช้พอร์ทัล",
    action: "ส่ง Inquiry",
    emailLabel: "หรืออีเมลถึงเราโดยตรง",
    email: "marisjewelryth@gmail.com",
    portalNote: "มีบัญชีขายส่งที่ได้รับอนุมัติแล้ว? เข้าสู่ระบบด้านล่าง"
  },
  loading: "กำลังโหลดบัญชีขายส่งของคุณ…",
  unavailable: "ขณะนี้พอร์ทัลขายส่งยังใช้งานไม่ได้ กรุณาลองใหม่ภายหลังหรือติดต่อทีมงาน",
  signedOut: {
    title: "เข้าสู่ระบบเพื่อสมัคร",
    text: "บัญชีขายส่งผูกกับบัญชี Maris ของคุณ กรุณาเข้าสู่ระบบหรือสร้างบัญชีก่อน แล้วกลับมาสมัครที่หน้านี้",
    action: "เข้าสู่ระบบหรือสร้างบัญชี",
    learnMore: "ขั้นตอนการขายส่ง"
  },
  form: {
    title: "สมัครบัญชีขายส่ง",
    intro: "แนะนำธุรกิจของคุณ ทีมงานจะตรวจสอบใบสมัครทุกใบและกำหนดเงื่อนไขขายส่งก่อนแสดงราคา",
    companyName: "ชื่อบริษัท / ร้าน",
    businessType: "ประเภทธุรกิจ",
    taxId: "เลขประจำตัวผู้เสียภาษี (ไม่บังคับ)",
    businessAddress: "ที่อยู่ธุรกิจ",
    country: "ประเทศ",
    website: "เว็บไซต์หรือเพจโซเชียล (ไม่บังคับ)",
    contactName: "ผู้ติดต่อ",
    contactPhone: "เบอร์โทร",
    lineId: "LINE ID (ไม่บังคับ)",
    expectedMonthlyVolume: "ปริมาณสั่งซื้อโดยประมาณ (ไม่บังคับ)",
    expectedMonthlyVolumeHint: "เช่น 20–50 ชิ้นต่อเดือน",
    interestedCategories: "หมวดสินค้าที่สนใจ",
    applicantNote: "ข้อมูลเพิ่มเติม (ไม่บังคับ)",
    submit: "ส่งใบสมัคร",
    resubmit: "อัปเดตใบสมัคร",
    submitting: "กำลังส่ง…",
    cancelEdit: "ยกเลิก",
    invalid: "กรุณาตรวจสอบช่องที่ไฮไลต์",
    saved: "ส่งใบสมัครแล้ว ทีมงานจะตรวจสอบโดยเร็ว"
  },
  businessTypes: {
    retailer: "ร้านเครื่องประดับ / ค้าปลีก",
    online_store: "ร้านออนไลน์",
    private_label: "รับผลิตแบรนด์ตัวเอง",
    distributor: "ตัวแทนจำหน่าย",
    corporate_gifting: "ของขวัญองค์กร",
    other: "อื่น ๆ"
  },
  categories: {
    "fine-jewelry": "เครื่องประดับ Fine Jewelry",
    "real-gold": "ทองแท้",
    "real-diamond": "เพชรแท้",
    "real-gemstone": "พลอยแท้"
  },
  status: {
    pending: { title: "กำลังตรวจสอบใบสมัคร", text: "ขอบคุณ {company} ทีมงานกำลังตรวจสอบใบสมัคร และจะติดต่อกลับเพื่อยืนยันเงื่อนไขขายส่ง" },
    rejected: { title: "ใบสมัครยังไม่ผ่านการอนุมัติ", text: "เรายังอนุมัติใบสมัครนี้ไม่ได้ คุณแก้ไขข้อมูลแล้วส่งใหม่ หรือติดต่อทีมงานได้" },
    suspended: { title: "บัญชีถูกพักไว้", text: "บัญชีขายส่งของคุณถูกพักไว้ชั่วคราว กรุณาติดต่อทีมงานเพื่อสั่งซื้อต่อ" },
    edit: "แก้ไขใบสมัคร",
    contact: "ติดต่อทีมงาน"
  },
  terms: {
    discount: "ส่วนลดบัญชี",
    paymentTerms: "เงื่อนไขการชำระเงิน",
    company: "บัญชี"
  },
  paymentTerms: {
    prepaid: "ชำระเต็มจำนวนก่อนผลิต",
    deposit_50: "มัดจำ 50% ส่วนที่เหลือก่อนจัดส่ง",
    net_15: "เครดิต 15 วัน",
    net_30: "เครดิต 30 วัน"
  },
  tabs: {
    catalogue: "แคตตาล็อก",
    cart: "ใบสั่งซื้อ",
    orders: "คำสั่งซื้อของฉัน",
    label: "ส่วนของพอร์ทัลขายส่ง"
  },
  catalogue: {
    search: "ค้นหาด้วยชื่อหรือรหัส",
    category: "หมวดสินค้า",
    allCategories: "ทุกหมวด",
    empty: "ยังไม่มีสินค้าขายส่งในรายการ ทีมงานยังเสนอราคาสินค้าชิ้นอื่นได้ — ระบุไว้ในหมายเหตุของใบสั่งซื้อ",
    noMatch: "ไม่พบสินค้าที่ค้นหา",
    moq: "ขั้นต่ำ {qty} ชิ้น",
    casePack: "สั่งทีละ {qty} ชิ้น",
    leadTime: "ผลิตประมาณ {days} วัน",
    priceBreaks: "ราคาต่อชิ้น",
    fromQty: "{qty} ชิ้นขึ้นไป",
    basePrice: "ทุกจำนวน",
    priceOnRequest: "สอบถามราคา",
    quantity: "จำนวน",
    add: "เพิ่มลงใบสั่งซื้อ",
    update: "อัปเดตใบสั่งซื้อ",
    added: "เพิ่มลงใบสั่งซื้อแล้ว",
    inCart: "ในใบสั่งซื้อ {qty} ชิ้น",
    discountNote: "ราคานี้รวมส่วนลดบัญชี {discount}% แล้ว"
  },
  cart: {
    empty: "ใบสั่งซื้อยังว่างอยู่ เลือกสินค้าจากแคตตาล็อก",
    item: "สินค้า",
    unitPrice: "ราคาต่อชิ้น",
    lineTotal: "รวม",
    remove: "ลบ",
    unavailable: "สินค้านี้ไม่เปิดขายส่งแล้ว — กรุณาลบรายการนี้",
    errors: {
      invalid_quantity: "กรุณาใส่จำนวนที่ถูกต้อง",
      below_moq: "ขั้นต่ำ {qty} ชิ้น",
      case_pack: "สั่งเป็นจำนวนทีละ {qty} ชิ้น"
    },
    shippingAddress: "ที่อยู่จัดส่ง",
    customerReference: "เลขที่ PO ของคุณ (ไม่บังคับ)",
    requestedShipDate: "วันที่ต้องการให้จัดส่ง (ไม่บังคับ)",
    customerNote: "หมายเหตุถึงทีมงาน (ไม่บังคับ)",
    pieces: "จำนวนชิ้น",
    subtotal: "ยอดรวมโดยประมาณ",
    unpricedNote: "มี {count} รายการที่ต้องสอบถามราคา ทีมงานจะเสนอราคาให้",
    finalNote: "การส่งจะเป็นการส่งใบสั่งซื้อให้ทีมงานตรวจสอบ ไม่มีการตัดเงินออนไลน์ ทีมงานจะยืนยันราคา ค่าส่ง และระยะเวลาก่อนผลิต",
    submit: "ส่งใบสั่งซื้อ",
    submitting: "กำลังส่ง…",
    fixErrors: "กรุณาแก้ไขรายการที่ไฮไลต์ก่อนส่ง",
    submitted: "ส่งใบสั่งซื้อ {number} แล้ว ติดตามสถานะได้ที่ คำสั่งซื้อของฉัน"
  },
  orders: {
    empty: "ยังไม่มีใบสั่งซื้อ",
    number: "เลขที่",
    submitted: "วันที่ส่ง",
    status: "สถานะ",
    total: "ยอดรวม",
    view: "ดู",
    hide: "ซ่อน",
    customerReference: "PO ของคุณ",
    shipTo: "จัดส่งที่",
    requestedShipDate: "วันที่ต้องการให้จัดส่ง",
    quoteValidUntil: "ใบเสนอราคาใช้ได้ถึง",
    tracking: "เลขพัสดุ",
    subtotal: "รวมสินค้า",
    discount: "ส่วนลด",
    shipping: "ค่าจัดส่ง",
    totalLabel: "ยอดรวมทั้งสิ้น",
    pendingPrice: "รอเสนอราคา",
    history: "ไทม์ไลน์",
    accept: "ยอมรับใบเสนอราคา",
    cancel: "ยกเลิกคำสั่งซื้อ",
    confirmCancel: "ยืนยันยกเลิกใบสั่งซื้อนี้?",
    acceptNote: "เมื่อยอมรับ คำสั่งซื้อจะยืนยันตามยอดที่เสนอ ทีมงานจะติดต่อเรื่องการชำระเงิน",
    actor: { customer: "คุณ", atelier: "ทีมงาน Maris" }
  },
  orderStatus: {
    submitted: "ส่งแล้ว",
    quoted: "เสนอราคาแล้ว",
    confirmed: "ยืนยันแล้ว",
    in_production: "กำลังผลิต",
    ready: "พร้อมจัดส่ง",
    shipped: "จัดส่งแล้ว",
    completed: "เสร็จสมบูรณ์",
    cancelled: "ยกเลิก"
  },
  currency: "บาท",
  genericError: "เกิดข้อผิดพลาด กรุณาลองใหม่"
};
