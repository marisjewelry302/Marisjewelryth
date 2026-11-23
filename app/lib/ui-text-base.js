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
    home: "Home",
    skipToContent: "Skip to main content",
    logoAlt: "Maris Jewelry Logo",
    browse: "Shop engagement rings",
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
        label: "Ready to Ship",
        items: [
          { href: "/ready-to-ship", label: "Ready to Ship" }
        ]
      },
      {
        label: "Wholesale",
        items: [
          { href: "/wholesale", label: "Wholesale" }
        ]
      },
      {
        label: "Our Expertise",
        items: [
          { href: "/our-service", label: "Our Service" },
          { href: "/oem-jewelry", label: "OEM Jewelry Service" }
        ]
      },
      {
        label: "About Us",
        items: [
          { href: "/about-us", label: "About Us" },
          { href: "/contact-us", label: "Contact Us" },
          { href: "/journal", label: "Blog" }
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
          { href: "/journal", label: "Blog" }
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
    contactLabel: "Contact details",
    cookieSettings: "Cookie settings"
  },
  newsletter: {
    success: "You're on the Maris list.",
    failure: "Your email could not be saved.",
    invalid: "Please enter a valid email address.",
    rateLimited: "Too many signups from here. Please try again later.",
    notConfigured: "Sign-up is unavailable right now. Please try again later.",
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
  notFound: {
    eyebrow: "Page not found",
    title: "We could not find that page.",
    lead: "The link may be out of date, or the piece may no longer be listed. Browse our collections, or message the atelier and we will help you find it.",
    product: {
      eyebrow: "Piece not listed",
      title: "This piece is no longer listed.",
      lead: "It may have been sold or taken down. See the pieces we currently offer, or message the atelier to ask about something similar."
    },
    browseLabel: "Browse collections",
    homeLabel: "Go to Home",
    moreLabel: "Or start from here",
    links: [
      { href: "/category/engagement-ring", label: "Engagement rings" },
      { href: "/category/wedding-bands", label: "Wedding bands" },
      { href: "/ready-to-ship", label: "Ready to Ship" },
      { href: "/contact-us", label: "Contact us" }
    ]
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
        text: "Google Analytics helps us understand how visitors use the site (pages visited, approximate location, device and browser) so we can improve it. It runs only if you allow it and is not used for advertising."
      },
      {
        key: "marketing",
        title: "Marketing",
        text: "Reserved for future use. Maris does not currently use any marketing or advertising cookies."
      }
    ],
    eyebrow: "Your privacy",
    title: "We use cookies",
    textBefore: "Maris Jewelry uses essential cookies to run this site. We use Google Analytics to understand how visitors use the site, only if you allow it. You can change your choice at any time from “Cookie settings” in the footer.",
    privacyPolicy: "Privacy policy",
    legend: "Cookie categories",
    alwaysOn: "Always on",
    save: "Save preferences",
    customize: "Customize",
    necessaryOnly: "Necessary only",
    acceptAll: "Accept all",
    close: "Close cookie settings"
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
    quoteInstead: "Browse the collections",
    optional: "(optional)",
    phoneForContact: "Phone / WhatsApp number",
    lineId: "Line ID",
    lineIdPlaceholder: "Your Line ID",
    // Keyed by the stable "code" the inquiry API returns; the API's English
    // message is never shown.
    errors: {
      name_required: "Please enter your name.",
      email_required: "Please enter your email address.",
      email_invalid: "Please enter a valid email address.",
      phone_required: "Please enter a phone or WhatsApp number so we can reach you.",
      line_id_required: "Please enter your Line ID so we can reach you.",
      kind_unsupported: "This form could not be recognised. Please reload the page and try again.",
      rate_limited: "Too many messages from this address. Please try again later.",
      service_unavailable: "Sending is unavailable right now. Please try again later or contact us directly."
    }
  },
  unsubscribe: {
    eyebrow: "Maris Updates",
    title: "Unsubscribe",
    lead: "Stop Maris Jewelry marketing emails to {email}.",
    invalid: "This unsubscribe link is not valid or is incomplete. To stop receiving emails, contact us and we will remove you.",
    contact: "Contact Maris",
    confirm: "Confirm unsubscribe",
    working: "Unsubscribing...",
    done: "You have been unsubscribed. You will not receive further marketing emails from Maris Jewelry.",
    invalidToken: "This unsubscribe link is not valid. Please contact us and we will remove you.",
    unavailable: "Unsubscribing is unavailable right now. Please try again later or contact us.",
    failed: "You could not be unsubscribed. Please contact us.",
    wrong: "Something went wrong. Please try again."
  },
  popup: {
    invalidEmail: "Please enter a valid email address.",
    join: "Join Maris Jewelry",
    close: "Close signup popup",
    intro: "Create your Maris account and enjoy",
    offer: "10% OFF",
    subOffer: "your first confirmed order",
    emailAddress: "Email address",
    emailPlaceholder: "Enter your email",
    submit: "Get 10% Off",
    signupNotice: "By completing this form you are signing up to receive our emails and can unsubscribe any time.",
    privacyBefore: "See how we use your details in our",
    privacyPolicy: "Privacy Policy",
    hideToday: "Don't show again today"
  },
  hero: {
    next: "Next slide",
    previous: "Previous slide",
    slide: "Slide",
    label: "Featured collections",
    slideOf: (number, total) => `Slide ${number} of ${total}`,
    play: "Play slideshow",
    pause: "Pause slideshow",
    playShort: "Play",
    pauseShort: "Pause"
  },
  bestSeller: {
    heading: "Best Seller",
    label: "Best Seller",
    listLabel: "Best seller products",
    controlsLabel: "Best seller carousel controls",
    previous: "Previous best seller",
    next: "Next best seller",
    pause: "Pause best seller slideshow",
    play: "Play best seller slideshow",
    previousShort: "Prev",
    nextShort: "Next",
    pauseShort: "Pause",
    playShort: "Play"
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
    home: "หน้าแรก",
    skipToContent: "ข้ามไปยังเนื้อหาหลัก",
    logoAlt: "โลโก้ Maris Jewelry",
    browse: "ดูแหวนหมั้น",
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
        label: "แหวนแถว",
        items: [
          { href: "/category/wedding-bands", label: "แหวนแถว" },
          { href: "/category/mens-wedding-bands", label: "แหวนแถวผู้ชาย" }
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
        label: "พร้อมส่ง",
        items: [
          { href: "/ready-to-ship", label: "พร้อมส่ง" }
        ]
      },
      {
        label: "ขายส่ง",
        items: [
          { href: "/wholesale", label: "ขายส่ง" }
        ]
      },
      {
        label: "บริการของเรา",
        items: [
          { href: "/our-service", label: "บริการของเรา" },
          { href: "/oem-jewelry", label: "บริการผลิตเครื่องประดับ OEM" }
        ]
      },
      {
        label: "เกี่ยวกับเรา",
        items: [
          { href: "/about-us", label: "เกี่ยวกับเรา" },
          { href: "/contact-us", label: "ติดต่อเรา" },
          { href: "/journal", label: "บล็อก" }
        ]
      }
    ]
  },
  footer: {
    sections: [
      {
        key: "brand",
        title: "Maris Jewelry",
        body: "เครื่องประดับชั้นดี แหวนหมั้น แหวนแถว และบริการช่วยออกแบบเครื่องประดับตามสั่ง จากกรุงเทพฯ",
        links: [
          { href: "/about-us", label: "เกี่ยวกับเรา" },
          { href: "/contact-us", label: "ติดต่อเรา" },
          { href: "/journal", label: "บล็อก" }
        ]
      },
      {
        key: "collections",
        title: "คอลเลกชัน",
        links: [
          { href: "/category/engagement-ring", label: "แหวนหมั้น" },
          { href: "/category/wedding-bands", label: "แหวนแถว" },
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
    contactLabel: "ช่องทางติดต่อ",
    cookieSettings: "ตั้งค่าคุกกี้"
  },
  newsletter: {
    success: "คุณอยู่ในรายชื่อของ Maris แล้ว",
    failure: "ไม่สามารถบันทึกอีเมลของคุณได้",
    invalid: "โปรดกรอกอีเมลให้ถูกต้อง",
    rateLimited: "มีการสมัครจากที่นี่มากเกินไป โปรดลองอีกครั้งภายหลัง",
    notConfigured: "ขณะนี้ยังไม่สามารถสมัครได้ โปรดลองอีกครั้งภายหลัง",
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
  notFound: {
    eyebrow: "ไม่พบหน้านี้",
    title: "ไม่พบหน้าที่คุณค้นหา",
    lead: "ลิงก์นี้อาจล้าสมัยแล้ว หรือชิ้นงานนี้อาจไม่ได้วางจำหน่ายอีกต่อไป ลองเลือกดูคอลเลกชันของเรา หรือส่งข้อความถึงห้องทำงาน Maris เรายินดีช่วยคุณค้นหา",
    product: {
      eyebrow: "ไม่พบชิ้นงาน",
      title: "ชิ้นงานนี้ไม่ได้วางจำหน่ายแล้ว",
      lead: "ชิ้นงานนี้อาจขายไปแล้วหรือถูกนำออกจากรายการ ดูชิ้นงานที่เรามีอยู่ในขณะนี้ หรือส่งข้อความถึงห้องทำงาน Maris เพื่อสอบถามชิ้นงานที่ใกล้เคียง"
    },
    browseLabel: "ดูคอลเลกชัน",
    homeLabel: "ไปที่หน้าแรก",
    moreLabel: "หรือเริ่มจากตรงนี้",
    links: [
      { href: "/category/engagement-ring", label: "แหวนหมั้น" },
      { href: "/category/wedding-bands", label: "แหวนแถว" },
      { href: "/ready-to-ship", label: "พร้อมส่ง" },
      { href: "/contact-us", label: "ติดต่อเรา" }
    ]
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
        text: "Google Analytics ช่วยให้เราเข้าใจว่าผู้เข้าชมใช้งานเว็บไซต์อย่างไร (หน้าที่เข้าชม ตำแหน่งโดยประมาณ อุปกรณ์และเบราว์เซอร์) เพื่อนำไปปรับปรุงเว็บไซต์ จะทำงานก็ต่อเมื่อคุณอนุญาตเท่านั้น และไม่ใช้เพื่อการโฆษณา"
      },
      {
        key: "marketing",
        title: "คุกกี้เพื่อการตลาด",
        text: "สงวนไว้สำหรับอนาคต ปัจจุบัน Maris ไม่ใช้คุกกี้เพื่อการตลาดหรือโฆษณา"
      }
    ],
    eyebrow: "ความเป็นส่วนตัวของคุณ",
    title: "เราใช้คุกกี้",
    textBefore: "Maris Jewelry ใช้คุกกี้ที่จำเป็นเพื่อให้เว็บไซต์ทำงานได้ และเราใช้ Google Analytics เพื่อทำความเข้าใจว่าผู้เข้าชมใช้งานเว็บไซต์อย่างไร ก็ต่อเมื่อคุณอนุญาตเท่านั้น คุณเปลี่ยนตัวเลือกได้ทุกเมื่อจาก “ตั้งค่าคุกกี้” ที่ส่วนท้ายของหน้า",
    privacyPolicy: "นโยบายความเป็นส่วนตัว",
    legend: "ประเภทของคุกกี้",
    alwaysOn: "เปิดเสมอ",
    save: "บันทึกการตั้งค่า",
    customize: "ปรับแต่ง",
    necessaryOnly: "เฉพาะที่จำเป็น",
    acceptAll: "ยอมรับทั้งหมด",
    close: "ปิดการตั้งค่าคุกกี้"
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
    quoteInstead: "ดูคอลเลกชัน",
    optional: "(ไม่บังคับ)",
    phoneForContact: "เบอร์โทรศัพท์ / WhatsApp",
    lineId: "Line ID",
    lineIdPlaceholder: "Line ID ของคุณ",
    errors: {
      name_required: "โปรดกรอกชื่อของคุณ",
      email_required: "โปรดกรอกอีเมลของคุณ",
      email_invalid: "โปรดกรอกอีเมลให้ถูกต้อง",
      phone_required: "โปรดกรอกเบอร์โทรศัพท์หรือ WhatsApp เพื่อให้เราติดต่อกลับได้",
      line_id_required: "โปรดกรอก Line ID เพื่อให้เราติดต่อกลับได้",
      kind_unsupported: "ไม่รู้จักแบบฟอร์มนี้ โปรดโหลดหน้าใหม่แล้วลองอีกครั้ง",
      rate_limited: "ส่งข้อความจากที่อยู่นี้บ่อยเกินไป โปรดลองอีกครั้งภายหลัง",
      service_unavailable: "ขณะนี้ยังส่งข้อความไม่ได้ โปรดลองอีกครั้งภายหลังหรือติดต่อเราโดยตรง"
    }
  },
  unsubscribe: {
    eyebrow: "ข่าวสารจาก Maris",
    title: "ยกเลิกการรับอีเมล",
    lead: "หยุดรับอีเมลการตลาดจาก Maris Jewelry ที่ส่งถึง {email}",
    invalid: "ลิงก์ยกเลิกการรับอีเมลนี้ไม่ถูกต้องหรือไม่สมบูรณ์ หากต้องการหยุดรับอีเมล โปรดติดต่อเราแล้วเราจะนำคุณออกจากรายชื่อ",
    contact: "ติดต่อ Maris",
    confirm: "ยืนยันยกเลิกการรับอีเมล",
    working: "กำลังยกเลิก...",
    done: "ยกเลิกการรับอีเมลเรียบร้อยแล้ว คุณจะไม่ได้รับอีเมลการตลาดจาก Maris Jewelry อีก",
    invalidToken: "ลิงก์ยกเลิกการรับอีเมลนี้ไม่ถูกต้อง โปรดติดต่อเราแล้วเราจะนำคุณออกจากรายชื่อ",
    unavailable: "ขณะนี้ยังยกเลิกไม่ได้ โปรดลองอีกครั้งภายหลังหรือติดต่อเรา",
    failed: "ไม่สามารถยกเลิกการรับอีเมลได้ โปรดติดต่อเรา",
    wrong: "เกิดข้อผิดพลาด โปรดลองอีกครั้ง"
  },
  popup: {
    invalidEmail: "โปรดกรอกอีเมลให้ถูกต้อง",
    join: "เข้าร่วม Maris Jewelry",
    close: "ปิดหน้าต่างสมัครสมาชิก",
    intro: "สร้างบัญชี Maris ของคุณ แล้วรับส่วนลด",
    offer: "ลด 10%",
    subOffer: "สำหรับคำสั่งซื้อแรกที่ยืนยันแล้ว",
    emailAddress: "อีเมล",
    emailPlaceholder: "กรอกอีเมลของคุณ",
    submit: "รับส่วนลด 10%",
    signupNotice: "เมื่อกรอกแบบฟอร์มนี้ แสดงว่าคุณสมัครรับอีเมลจากเรา และสามารถยกเลิกการรับได้ทุกเมื่อ",
    privacyBefore: "ดูว่าเราใช้ข้อมูลของคุณอย่างไรใน",
    privacyPolicy: "นโยบายความเป็นส่วนตัว",
    hideToday: "ไม่ต้องแสดงอีกในวันนี้"
  },
  hero: {
    next: "สไลด์ถัดไป",
    previous: "สไลด์ก่อนหน้า",
    slide: "สไลด์",
    label: "คอลเลกชันแนะนำ",
    slideOf: (number, total) => `สไลด์ที่ ${number} จาก ${total}`,
    play: "เล่น",
    pause: "หยุด",
    playShort: "เล่น",
    pauseShort: "หยุด"
  },
  bestSeller: {
    heading: "สินค้าขายดี",
    label: "สินค้าขายดี",
    listLabel: "สินค้าขายดี",
    controlsLabel: "ปุ่มควบคุมสินค้าขายดี",
    previous: "สินค้าขายดีก่อนหน้า",
    next: "สินค้าขายดีถัดไป",
    pause: "หยุดการเลื่อนสินค้าขายดี",
    play: "เล่นการเลื่อนสินค้าขายดี",
    previousShort: "ก่อนหน้า",
    nextShort: "ถัดไป",
    pauseShort: "หยุด",
    playShort: "เล่น"
  }
};

export const baseText = { en, th };
