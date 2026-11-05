import Image from "next/image";
import styles from "./home-services.module.css";
import { homeCopy } from "./lib/home-copy";
import { THAI_LOCALE, localizePath } from "./lib/i18n";

function servicesCopy(locale) {
  return homeCopy[locale === THAI_LOCALE ? "th" : "en"].services;
}

export function HomeServicePaths() {
  return (
    <section className={styles.pathsSection} aria-label="Explore Maris services">
      <div className={styles.paths}>
        <article><p className={styles.kicker}>01 / Collections</p><h2>Choose the piece that is you.</h2><p>Explore jewelry from the Maris collections.</p><a href="#shop-category-heading">View collections <span aria-hidden="true">↗</span></a></article>
        <article><p className={styles.kicker}>02 / Custom &amp; Bridal</p><h2>Create a piece with meaning.</h2><p>Custom pieces, engagement rings and wedding bands.</p><a href="#custom-bridal">Start a custom order <span aria-hidden="true">↗</span></a></article>
        <article><p className={styles.kicker}>03 / OEM &amp; Wholesale</p><h2>Grow your brand.</h2><p>Talk to us about production and collections for your store.</p><a href="#oem-wholesale">Services for business <span aria-hidden="true">↗</span></a></article>
      </div>
    </section>
  );
}

export function HomeServiceStories({ locale = "en" }) {
  const s = servicesCopy(locale);
  const link = (path) => localizePath(path, locale);

  return (
    <div className={styles.stories}>
      <section className={styles.split} id="custom-bridal" aria-labelledby="custom-bridal-heading">
        <div className={styles.media}><Image src="/assets/images/service/custom-jewelry-service-hero.webp" alt={s.customImageAlt} fill sizes="(max-width: 760px) 100vw, 50vw" /></div>
        <div className={styles.copy}><p className={styles.kicker}>{s.customKicker}</p><h2 id="custom-bridal-heading">{s.customHeading}</h2><p>{s.customText}</p><p className={styles.steps}>{s.customSteps}</p><a className={styles.button} href={link("/our-service")}>{s.customButton}</a></div>
      </section>
      <section className={`${styles.split} ${styles.oem}`} id="oem-wholesale" aria-labelledby="oem-wholesale-heading">
        <div className={styles.copy}><p className={styles.kicker}>{s.oemKicker}</p><h2 id="oem-wholesale-heading">{s.oemHeadingLine1}<br />{s.oemHeadingLine2}</h2><p>{s.oemText}</p><p className={styles.steps}>{s.oemSteps}</p><div className={styles.actions}><a className={styles.button} href={link("/oem-jewelry")}>{s.oemButton}</a><a className={styles.textLink} href={link("/wholesale-retail")}>{s.oemLink} <span aria-hidden="true">↗</span></a></div></div>
        <div className={`${styles.media} ${styles.process}`}><Image src="/assets/images/service/custom-jewelry-process-storyboard.webp" alt={s.oemImageAlt} fill sizes="(max-width: 760px) 100vw, 50vw" /></div>
      </section>
    </div>
  );
}

export function HomeContactSection({ locale = "en" }) {
  const s = servicesCopy(locale);
  const link = (path) => localizePath(path, locale);

  return <section className={styles.contact} aria-labelledby="home-contact-heading"><p className={styles.kicker}>{s.contactKicker}</p><h2 id="home-contact-heading">{s.contactHeading}</h2><p>{s.contactText}</p><div className={styles.actions}><a className={styles.button} href="#shop-category-heading">{s.contactShop}</a><a className={styles.button} href={link("/our-service")}>{s.contactCustom}</a><a className={styles.button} href={link("/oem-jewelry")}>{s.contactOem}</a></div></section>;
}
