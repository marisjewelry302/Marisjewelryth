import Image from "next/image";
import styles from "./home-services.module.css";

export function HomeServicePaths() {
  return (
    <section className={styles.pathsSection} aria-label="Explore Maris services">
      <div className={styles.paths}>
        <article><p className={styles.kicker}>01 / Collections</p><h2 lang="th">เลือกชิ้นที่เป็นคุณ</h2><p lang="th">สำรวจเครื่องประดับจากคอลเลกชันของ Maris</p><a href="#shop-category-heading" lang="th">ชมคอลเลกชัน <span aria-hidden="true">↗</span></a></article>
        <article><p className={styles.kicker}>02 / Custom &amp; Bridal</p><h2 lang="th">สร้างชิ้นงานแห่งความหมาย</h2><p lang="th">งานสั่งทำ แหวนหมั้น และแหวนแต่งงาน</p><a href="#custom-bridal" lang="th">เริ่มต้นงานสั่งทำ <span aria-hidden="true">↗</span></a></article>
        <article><p className={styles.kicker}>03 / OEM &amp; Wholesale</p><h2 lang="th">ต่อยอดแบรนด์ของคุณ</h2><p lang="th">พูดคุยเรื่องการผลิตและคอลเลกชันสำหรับร้าน</p><a href="#oem-wholesale" lang="th">บริการสำหรับธุรกิจ <span aria-hidden="true">↗</span></a></article>
      </div>
    </section>
  );
}

export function HomeServiceStories() {
  return (
    <div className={styles.stories}>
      <section className={styles.split} id="custom-bridal" aria-labelledby="custom-bridal-heading">
        <div className={styles.media}><Image src="/assets/images/service/custom-jewelry-service-hero.webp" alt="Jewelry design inspiration with a ring, sketches, and a green ring box" fill sizes="(max-width: 760px) 100vw, 50vw" /></div>
        <div className={styles.copy}><p className={styles.kicker}>Custom &amp; Bridal</p><h2 id="custom-bridal-heading">A piece of your story.</h2><p lang="th">จากไอเดียแรกสู่เครื่องประดับเฉพาะคุณ ทั้งชิ้นงานส่วนตัว แหวนหมั้น และแหวนคู่</p><p className={styles.steps} lang="th">แชร์ไอเดีย → พูดคุยแบบและวัสดุ → ยืนยันรายละเอียด</p><a className={styles.button} href="/our-service" lang="th">ปรึกษางานสั่งทำ</a></div>
      </section>
      <section className={`${styles.split} ${styles.oem}`} id="oem-wholesale" aria-labelledby="oem-wholesale-heading">
        <div className={styles.copy}><p className={styles.kicker}>OEM &amp; Wholesale</p><h2 id="oem-wholesale-heading">Your vision.<br />Our collaboration.</h2><p lang="th">นำแบบของคุณมาพูดคุย หรือเลือกชิ้นงานสำหรับร้าน พร้อมประเมินวัสดุ จำนวน และกำหนดส่งร่วมกัน</p><p className={styles.steps} lang="th">รายละเอียดโครงการ → ประเมินความเป็นไปได้ → เสนอราคา</p><div className={styles.actions}><a className={styles.button} href="/oem-jewelry" lang="th">พูดคุยโครงการของคุณ</a><a className={styles.textLink} href="/wholesale-retail" lang="th">บริการค้าส่ง <span aria-hidden="true">↗</span></a></div></div>
        <div className={`${styles.media} ${styles.process}`}><Image src="/assets/images/service/custom-jewelry-process-storyboard.webp" alt="Illustrated jewelry design and production process, from sketch and CAD to a finished ring" fill sizes="(max-width: 760px) 100vw, 50vw" /></div>
      </section>
    </div>
  );
}

export function HomeContactSection() {
  return <section className={styles.contact} aria-labelledby="home-contact-heading"><p className={styles.kicker}>Let&apos;s begin</p><h2 id="home-contact-heading">What would you like to create?</h2><p lang="th">เลือกหัวข้อที่สนใจเพื่อเริ่มคุยกับ Maris</p><div className={styles.actions}><a className={styles.button} href="#shop-category-heading" lang="th">เลือกซื้อสินค้า</a><a className={styles.button} href="/our-service" lang="th">งานสั่งทำ / แหวนแต่งงาน</a><a className={styles.button} href="/oem-jewelry" lang="th">OEM / ค้าส่ง</a></div></section>;
}
