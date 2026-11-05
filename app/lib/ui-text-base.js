// Interface strings shared by every page (header, footer, cookie banner, forms,
// home), keyed by locale. Client components read only this file through
// useLocale, so the larger storefront dictionary in ui-text-shop.js is loaded
// only on the pages that use it. The English values
// are the strings the components used before translation, unchanged.

const en = {
  header: {
    announcement: "Private consultation for confirmed Maris pieces.",
    contactLink: "Contact Maris",
    socialLabel: "Social media links",
    closeMenu: "Close menu",
    openMenu: "Open menu",
    homeLabel: "Go to homepage",
    logoAlt: "Maris Jewelry Logo",
    browse: "Browse jewelry",
    primaryNav: "Primary navigation",
    account: "Account",
    wishlist: "Wishlist",
    bag: "Shopping bag",
    iconsLabel: "Account and shopping links",
    primary: [
      { href: "/category/wedding-set", label: "Wedding set" },
      { href: "/category/engagement-ring", label: "Engagement ring" }
    ],
    groups: [
      {
        label: "Wedding band",
        items: [
          { href: "/category/wedding-bands", label: "Wedding Bands" },
          { href: "/category/mens-wedding-bands", label: "Men's Wedding Bands" }
        ]
      },
      {
        label: "Gift",
        items: [
          { href: "/category/necklaces-pendants", label: "Necklaces & Pendants" },
          { href: "/category/bracelets", label: "Bracelets" },
          { href: "/category/earrings", label: "Earrings" },
          { href: "/category/rings", label: "Rings" }
        ]
      },
      {
        label: "Our Expertise",
        items: [
          { href: "/our-service", label: "Our Service" },
          { href: "/oem-jewelry", label: "OEM Jewelry Service" },
          { href: "/wholesale-retail", label: "Wholesale & Retail" }
        ]
      },
      {
        label: "About Us",
        items: [
          { href: "/about-us", label: "About Us" },
          { href: "/contact-us", label: "Contact Us" },
          { href: "/journal", label: "Articles" }
        ]
      }
    ]
  },
  footer: {
    sections: [
      {
        key: "brand",
        title: "Maris Jewelry",
        body: "Fine jewelry, engagement rings, wedding bands, and custom design support from Bangkok.",
        links: [
          { href: "/about-us", label: "About Us" },
          { href: "/contact-us", label: "Contact Us" },
          { href: "/journal", label: "Articles" }
        ]
      },
      {
        key: "collections",
        title: "Collections",
        links: [
          { href: "/category/engagement-ring", label: "Engagement Rings" },
          { href: "/category/wedding-bands", label: "Wedding Bands" },
          { href: "/category/necklaces-pendants", label: "Necklaces & Pendants" },
          { href: "/category/rings", label: "Rings" }
        ]
      },
      {
        key: "support",
        title: "Support",
        links: [
          { href: "/terms-of-service", label: "Terms of Service" },
          { href: "/shipping", label: "Shipping" },
          { href: "/returns", label: "Returns" },
          { href: "/privacy-policy", label: "Privacy Policy" }
        ]
      },
      {
        key: "newsletter",
        title: "Newsletter",
        body: "Receive collection notes, custom design updates, and Maris Jewelry announcements.",
        newsletter: true
      }
    ],
    copyright: "© 2026 Maris Jewelry. All rights reserved.",
    cookieSettings: "Cookie settings"
  },
  newsletter: {
    success: "You're on the Maris list.",
    failure: "Your email could not be saved.",
    connection: "Please check your connection.",
    joining: "Joining...",
    emailAddress: "Email address",
    pageConsent: "By joining, you agree to receive Maris Jewelry marketing emails. You can unsubscribe at any time. See our",
    privacyPolicy: "Privacy Policy",
    joinPage: "Join Newsletter",
    footerConsent: "By joining, you agree to receive marketing emails. Unsubscribe any time.",
    joinLabel: "Join newsletter",
    join: "Join"
  },
  cookie: {
    categories: [
      {
        key: "necessary",
        title: "Strictly necessary",
        text: "Keep you signed in, protect forms, and remember this choice. The site cannot work without them, so they are always on.",
        locked: true
      },
      {
        key: "analytics",
        title: "Analytics",
        text: "Help us understand which pages and pieces visitors look at, so we can improve the catalogue. No data is sold."
      },
      {
        key: "marketing",
        title: "Marketing",
        text: "Let us measure our social media and advertising campaigns and show you more relevant Maris pieces elsewhere."
      }
    ],
    eyebrow: "Your privacy",
    title: "We use cookies",
    textBefore: "Maris Jewelry uses essential cookies to run this site. With your permission we would also like to use optional cookies for analytics and marketing. You can change your choice at any time from “Cookie settings” in the footer.",
    privacyPolicy: "Privacy policy",
    legend: "Cookie categories",
    alwaysOn: "Always on",
    save: "Save preferences",
    customize: "Customize",
    necessaryOnly: "Necessary only",
    acceptAll: "Accept all"
  },
  lead: {
    messages: {
      contact: {
        status: "Your inquiry has been sent to the Maris atelier.",
        title: "Your inquiry is with us",
        body: "The atelier has received your message and will reply through your preferred contact channel."
      },
      quote: {
        status: "Your quote request has been sent to the Maris atelier.",
        title: "Your quote request is with us",
        body: "The atelier will confirm availability for your selected pieces and reply with pricing direction."
      },
      newsletter: {
        status: "Your details have been sent to the Maris atelier.",
        title: "You're on the Maris list",
        body: "The atelier will use these details for future collection and custom design updates."
      }
    },
    failure: {
      title: "We could not send that",
      body: "Your message did not reach the atelier. Copy the summary below and send it through Line, email, or phone, and we will pick it up from there."
    },
    selectPiece: "Please select at least one piece before sending a quote request.",
    sending: "Sending...",
    sent: "Your message has been sent.",
    checkForm: "Please check the form details.",
    notSent: "Your message could not be sent.",
    notSentConnection: "Your message could not be sent. Please check your connection.",
    submitQuote: "Send Quote Request",
    submitNewsletter: "Join Newsletter",
    submitContact: "Send Inquiry",
    copied: "Copied",
    copy: "Copy summary",
    contactDirect: "Contact Maris directly",
    quoteInstead: "Request a quote instead"
  },
  popup: {
    invalidEmail: "Please enter a valid email address.",
    needConsent: "Please tick the box to receive marketing emails and your 10% offer.",
    join: "Join Maris Jewelry",
    close: "Close signup popup",
    welcome: "Welcome to",
    intro: "Sign up for our mailing list and enjoy",
    offer: "10% OFF",
    subOffer: "your first confirmed order",
    perksLabel: "Member benefits",
    perks: [
      { title: "10% OFF", text: "your first confirmed order" },
      { title: "Early access", text: "to new Maris pieces" },
      { title: "Private offers", text: "for Maris members" }
    ],
    emailAddress: "Email address",
    emailPlaceholder: "Enter your email",
    submit: "Get 10% Off",
    consent: "I agree to receive Maris Jewelry marketing emails, including offers. I can unsubscribe at any time.",
    privacyBefore: "See how we use your details in our",
    privacyPolicy: "Privacy Policy",
    hideToday: "Don't show again today",
    decline: "No, thank you"
  },
  hero: {
    next: "Next slide",
    previous: "Previous slide",
    slide: "Slide",
    play: "Play slideshow",
    pause: "Pause slideshow",
    playShort: "Play",
    pauseShort: "Pause"
  },
  bestSeller: {
    heading: "Best Seller",
    label: "Best Seller",
    listLabel: "Best seller products"
  }
};

const th = {
  header: {
    announcement: "ให้คำปรึกษาส่วนตัวสำหรับผลงาน Maris ที่ยืนยันแล้ว",
    contactLink: "ติดต่อ Maris",
    socialLabel: "ลิงก์โซเชียลมีเดีย",
    closeMenu: "ปิดเมนู",
    openMenu: "เปิดเมนู",
    homeLabel: "ไปที่หน้าแรก",
    logoAlt: "โลโก้ Maris Jewelry",
    browse: "เลือกชมเครื่องประดับ",
    primaryNav: "เมนูหลัก",
    account: "บัญชี",
    wishlist: "รายการโปรด",
    bag: "ตะกร้าสินค้า",
    iconsLabel: "ลิงก์บัญชีและการซื้อสินค้า",
    primary: [
      { href: "/category/wedding-set", label: "เซ็ตแหวนคู่" },
      { href: "/category/engagement-ring", label: "แหวนหมั้น" }
    ],
    groups: [
      {
        label: "แหวนแต่งงาน",
        items: [
          { href: "/category/wedding-bands", label: "แหวนแต่งงาน" },
          { href: "/category/mens-wedding-bands", label: "แหวนแต่งงานผู้ชาย" }
        ]
      },
      {
        label: "ของขวัญ",
        items: [
          { href: "/category/necklaces-pendants", label: "สร้อยคอและจี้" },
          { href: "/category/bracelets", label: "สร้อยข้อมือ" },
          { href: "/category/earrings", label: "ต่างหู" },
          { href: "/category/rings", label: "แหวน" }
        ]
      },
      {
        label: "บริการของเรา",
        items: [
          { href: "/our-service", label: "บริการของเรา" },
          { href: "/oem-jewelry", label: "บริการผลิตเครื่องประดับ OEM" },
          { href: "/wholesale-retail", label: "ขายส่งและขายปลีก" }
        ]
      },
      {
        label: "เกี่ยวกับเรา",
        items: [
          { href: "/about-us", label: "เกี่ยวกับเรา" },
          { href: "/contact-us", label: "ติดต่อเรา" },
          { href: "/journal", label: "บทความ" }
        ]
      }
    ]
  },
  footer: {
    sections: [
      {
        key: "brand",
        title: "Maris Jewelry",
        body: "เครื่องประดับชั้นดี แหวนหมั้น แหวนแต่งงาน และบริการช่วยออกแบบเครื่องประดับตามสั่ง จากกรุงเทพฯ",
        links: [
          { href: "/about-us", label: "เกี่ยวกับเรา" },
          { href: "/contact-us", label: "ติดต่อเรา" },
          { href: "/journal", label: "บทความ" }
        ]
      },
      {
        key: "collections",
        title: "คอลเลกชัน",
        links: [
          { href: "/category/engagement-ring", label: "แหวนหมั้น" },
          { href: "/category/wedding-bands", label: "แหวนแต่งงาน" },
          { href: "/category/necklaces-pendants", label: "สร้อยคอและจี้" },
          { href: "/category/rings", label: "แหวน" }
        ]
      },
      {
        key: "support",
        title: "ช่วยเหลือ",
        links: [
          { href: "/terms-of-service", label: "ข้อกำหนดการใช้บริการ" },
          { href: "/shipping", label: "การจัดส่ง" },
          { href: "/returns", label: "การคืนสินค้า" },
          { href: "/privacy-policy", label: "นโยบายความเป็นส่วนตัว" }
        ]
      },
      {
        key: "newsletter",
        title: "จดหมายข่าว",
        body: "รับข่าวคอลเลกชัน อัปเดตงานออกแบบตามสั่ง และประกาศจาก Maris Jewelry",
        newsletter: true
      }
    ],
    copyright: "© 2026 Maris Jewelry สงวนลิขสิทธิ์",
    cookieSettings: "ตั้งค่าคุกกี้"
  },
  newsletter: {
    success: "คุณอยู่ในรายชื่อของ Maris แล้ว",
    failure: "ไม่สามารถบันทึกอีเมลของคุณได้",
    connection: "โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต",
    joining: "กำลังสมัคร...",
    emailAddress: "อีเมล",
    pageConsent: "เมื่อสมัคร ถือว่าคุณยินยอมรับอีเมลการตลาดจาก Maris Jewelry และสามารถยกเลิกการรับได้ทุกเมื่อ ดู",
    privacyPolicy: "นโยบายความเป็นส่วนตัว",
    joinPage: "สมัครรับจดหมายข่าว",
    footerConsent: "เมื่อสมัคร ถือว่าคุณยินยอมรับอีเมลการตลาด ยกเลิกได้ทุกเมื่อ",
    joinLabel: "สมัคร",
    join: "สมัคร"
  },
  cookie: {
    categories: [
      {
        key: "necessary",
        title: "คุกกี้ที่จำเป็น",
        text: "ช่วยให้คุณคงสถานะเข้าสู่ระบบ ป้องกันแบบฟอร์ม และจดจำตัวเลือกนี้ เว็บไซต์ไม่สามารถทำงานได้หากไม่มีคุกกี้เหล่านี้ จึงเปิดใช้งานเสมอ",
        locked: true
      },
      {
        key: "analytics",
        title: "คุกกี้เพื่อการวิเคราะห์",
        text: "ช่วยให้เราเข้าใจว่าผู้เข้าชมดูหน้าและผลงานใดบ้าง เพื่อปรับปรุงแคตตาล็อก เราไม่ขายข้อมูลของคุณ"
      },
      {
        key: "marketing",
        title: "คุกกี้เพื่อการตลาด",
        text: "ให้เราวัดผลแคมเปญโซเชียลมีเดียและโฆษณา และแสดงผลงาน Maris ที่ตรงใจคุณมากขึ้นบนเว็บไซต์อื่น"
      }
    ],
    eyebrow: "ความเป็นส่วนตัวของคุณ",
    title: "เราใช้คุกกี้",
    textBefore: "Maris Jewelry ใช้คุกกี้ที่จำเป็นเพื่อให้เว็บไซต์ทำงานได้ หากคุณอนุญาต เราต้องการใช้คุกกี้เสริมเพื่อการวิเคราะห์และการตลาดด้วย คุณเปลี่ยนตัวเลือกได้ทุกเมื่อจาก “ตั้งค่าคุกกี้” ที่ส่วนท้ายของหน้า",
    privacyPolicy: "นโยบายความเป็นส่วนตัว",
    legend: "ประเภทของคุกกี้",
    alwaysOn: "เปิดเสมอ",
    save: "บันทึกการตั้งค่า",
    customize: "ปรับแต่ง",
    necessaryOnly: "เฉพาะที่จำเป็น",
    acceptAll: "ยอมรับทั้งหมด"
  },
  lead: {
    messages: {
      contact: {
        status: "ส่งข้อความของคุณถึงห้องทำงาน Maris แล้ว",
        title: "เราได้รับข้อความของคุณแล้ว",
        body: "ทีมงานได้รับข้อความของคุณแล้ว และจะตอบกลับผ่านช่องทางติดต่อที่คุณเลือก"
      },
      quote: {
        status: "ส่งคำขอใบเสนอราคาถึงห้องทำงาน Maris แล้ว",
        title: "เราได้รับคำขอใบเสนอราคาของคุณแล้ว",
        body: "ทีมงานจะตรวจสอบความพร้อมของผลงานที่คุณเลือก และตอบกลับพร้อมแนวทางราคา"
      },
      newsletter: {
        status: "ส่งข้อมูลของคุณถึงห้องทำงาน Maris แล้ว",
        title: "คุณอยู่ในรายชื่อของ Maris แล้ว",
        body: "ทีมงานจะใช้ข้อมูลนี้เพื่อส่งข่าวคอลเลกชันและงานออกแบบตามสั่งในอนาคต"
      }
    },
    failure: {
      title: "ส่งข้อความไม่สำเร็จ",
      body: "ข้อความของคุณยังไม่ถึงห้องทำงาน โปรดคัดลอกสรุปด้านล่างแล้วส่งผ่าน Line อีเมล หรือโทรศัพท์ แล้วเราจะดำเนินการต่อให้"
    },
    selectPiece: "โปรดเลือกผลงานอย่างน้อยหนึ่งชิ้นก่อนส่งคำขอใบเสนอราคา",
    sending: "กำลังส่ง...",
    sent: "ส่งข้อความของคุณแล้ว",
    checkForm: "โปรดตรวจสอบข้อมูลในแบบฟอร์ม",
    notSent: "ไม่สามารถส่งข้อความของคุณได้",
    notSentConnection: "ไม่สามารถส่งข้อความของคุณได้ โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต",
    submitQuote: "ส่งคำขอใบเสนอราคา",
    submitNewsletter: "สมัครรับจดหมายข่าว",
    submitContact: "ส่งข้อความ",
    copied: "คัดลอกแล้ว",
    copy: "คัดลอกสรุป",
    contactDirect: "ติดต่อ Maris โดยตรง",
    quoteInstead: "ขอใบเสนอราคาแทน"
  },
  popup: {
    invalidEmail: "โปรดกรอกอีเมลให้ถูกต้อง",
    needConsent: "โปรดติ๊กช่องเพื่อรับอีเมลการตลาดและส่วนลด 10% ของคุณ",
    join: "เข้าร่วม Maris Jewelry",
    close: "ปิดหน้าต่างสมัครสมาชิก",
    welcome: "ยินดีต้อนรับสู่",
    intro: "สมัครรับจดหมายข่าวของเรา แล้วรับส่วนลด",
    offer: "ลด 10%",
    subOffer: "สำหรับคำสั่งซื้อแรกที่ยืนยันแล้ว",
    perksLabel: "สิทธิพิเศษสำหรับสมาชิก",
    perks: [
      { title: "ลด 10%", text: "สำหรับคำสั่งซื้อแรกที่ยืนยันแล้ว" },
      { title: "เข้าถึงก่อนใคร", text: "ผลงานใหม่จาก Maris" },
      { title: "ข้อเสนอพิเศษ", text: "สำหรับสมาชิก Maris" }
    ],
    emailAddress: "อีเมล",
    emailPlaceholder: "กรอกอีเมลของคุณ",
    submit: "รับส่วนลด 10%",
    consent: "ฉันยินยอมรับอีเมลการตลาดจาก Maris Jewelry รวมถึงข้อเสนอต่าง ๆ และสามารถยกเลิกการรับได้ทุกเมื่อ",
    privacyBefore: "ดูว่าเราใช้ข้อมูลของคุณอย่างไรใน",
    privacyPolicy: "นโยบายความเป็นส่วนตัว",
    hideToday: "ไม่ต้องแสดงอีกในวันนี้",
    decline: "ไม่ ขอบคุณ"
  },
  hero: {
    next: "สไลด์ถัดไป",
    previous: "สไลด์ก่อนหน้า",
    slide: "สไลด์",
    play: "เล่น",
    pause: "หยุด",
    playShort: "เล่น",
    pauseShort: "หยุด"
  },
  bestSeller: {
    heading: "สินค้าขายดี",
    label: "สินค้าขายดี",
    listLabel: "สินค้าขายดี"
  }
};

export const baseText = { en, th };
