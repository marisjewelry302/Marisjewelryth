# Maris Jewelry Soft Launch

This project is ready for a static soft launch as a public catalogue site.

## Before You Publish

1. Choose your hosting:
   - Cloudflare Pages
   - Netlify
2. Prepare your public domain.
3. Replace `https://www.your-domain.com` in [sitemap.xml](./sitemap.xml) with your real domain.
4. Open the homepage, category pages, product page, and 404 page on desktop and mobile once before publishing.

## Fastest Option: Netlify Manual Deploy

1. Create a Netlify account.
2. In Netlify, choose `Add new site` then `Deploy manually`.
3. Drag the whole project folder into Netlify.
4. After the first deploy, you will get a public `*.netlify.app` URL.
5. Add your real domain in Netlify domain settings when you are ready.

## Best Long-Term Option: Cloudflare Pages

1. Push this project to GitHub.
2. Create a Cloudflare account and open Pages.
3. Create a new project and connect the GitHub repository.
4. Use these settings:
   - Framework preset: `None`
   - Build command: leave blank
   - Output directory: `/`
5. Deploy the project.
6. Add your custom domain in the Pages project settings.

## Run On Linux

### Quick local preview

If you only want to preview the site on a Linux machine, run:

```bash
cd maris-jewelry
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

### Docker + Nginx

This project now includes a `Dockerfile` and an `nginx` config so you can run it on a Linux server or VPS without adding a build step.

```bash
cd maris-jewelry
docker build -t maris-jewelry .
docker run --rm -p 8080:80 maris-jewelry
```

Then open [http://localhost:8080](http://localhost:8080).

### Plain Nginx on Linux

If you already manage your own Nginx server, copy the project files to your web root and use the config in [nginx/default.conf](./nginx/default.conf) as the site server block base.

Important:

1. Keep filenames and links exactly the same letter case when moving to Linux.
2. Upload the whole project root, including `assets`, `pages`, `404.html`, `manifest.webmanifest`, and `sitemap.xml`.
3. Make sure your server serves UTF-8 filenames correctly because some catalogue assets use Thai characters in the filename.

## Soft Launch Checklist

1. Check that all social links open correctly.
2. Check that category pages, product page, wishlist, and bag links work as expected.
3. Confirm that contact email and phone number are correct.
4. Confirm that all placeholder pages you do not want public are hidden or removed.
5. Decide which pages should stay public and which should remain blocked from search.

## Important Note

This site is launch-ready as a public brand and catalogue website.
It is not yet ready for full ecommerce operations because account, cart, stock, checkout, payment, and order handling still need a real backend.
