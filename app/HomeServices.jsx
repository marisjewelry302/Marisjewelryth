import Image from "next/image";
import styles from "./home-services.module.css";

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

export function HomeServiceStories() {
  return (
    <div className={styles.stories}>
      <section className={styles.split} id="custom-bridal" aria-labelledby="custom-bridal-heading">
        <div className={styles.media}><Image src="/assets/images/service/custom-jewelry-service-hero.webp" alt="Jewelry design inspiration with a ring, sketches, and a green ring box" fill sizes="(max-width: 760px) 100vw, 50vw" /></div>
        <div className={styles.copy}><p className={styles.kicker}>Custom &amp; Bridal</p><h2 id="custom-bridal-heading">A piece of your story.</h2><p>From the first idea to jewelry made only for you, including personal pieces, engagement rings and matching bands.</p><p className={styles.steps}>Share your idea → Discuss design and materials → Confirm the details</p><a className={styles.button} href="/our-service">Discuss a custom order</a></div>
      </section>
      <section className={`${styles.split} ${styles.oem}`} id="oem-wholesale" aria-labelledby="oem-wholesale-heading">
        <div className={styles.copy}><p className={styles.kicker}>OEM &amp; Wholesale</p><h2 id="oem-wholesale-heading">Your vision.<br />Our collaboration.</h2><p>Bring your own design or choose pieces for your store, and we will review materials, quantities and delivery dates together.</p><p className={styles.steps}>Project details → Feasibility review → Quotation</p><div className={styles.actions}><a className={styles.button} href="/oem-jewelry">Discuss your project</a><a className={styles.textLink} href="/wholesale-retail">Wholesale services <span aria-hidden="true">↗</span></a></div></div>
        <div className={`${styles.media} ${styles.process}`}><Image src="/assets/images/service/custom-jewelry-process-storyboard.webp" alt="Illustrated jewelry design and production process, from sketch and CAD to a finished ring" fill sizes="(max-width: 760px) 100vw, 50vw" /></div>
      </section>
    </div>
  );
}

export function HomeContactSection() {
  return <section className={styles.contact} aria-labelledby="home-contact-heading"><p className={styles.kicker}>Let&apos;s begin</p><h2 id="home-contact-heading">What would you like to create?</h2><p>Choose a topic to start a conversation with Maris.</p><div className={styles.actions}><a className={styles.button} href="#shop-category-heading">Shop jewelry</a><a className={styles.button} href="/our-service">Custom / Wedding bands</a><a className={styles.button} href="/oem-jewelry">OEM / Wholesale</a></div></section>;
}
