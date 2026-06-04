# Google Sheet Catalogue Feed

The storefront can read product rows from this published CSV:

`https://docs.google.com/spreadsheets/d/e/2PACX-1vQfntxK3qZhO4cfHkqlFtpY5kP7M3xLLzTkjkH6kTPkfJNdl5rgmGDozfyM3OTMBzo9WS0aXbF4U8Xr/pub?output=csv`

This Google Sheet is the only live catalogue source for the storefront. Admin sandbox drafts are browser-local only and do not publish products to visitors.

## Minimum columns

Use these columns when adding new web products:

- `code`
- `name`
- `image_url`

Use `web_code` when a sheet row should update an existing storefront item that already has a Maris code on the site.

## Header-name mapping

The loader maps rows by column names in the header row. The team can move columns around, insert internal notes, or hide columns as long as the visible header names stay recognizable.

The current product-spec columns can stay anywhere in the sheet:

- `ID`
- `Collection`
- `Type`
- `Center`
- `Malee`
- `Gold Weight`

Keep these website headers available wherever they fit the team's workflow:

- `code`
- `name`
- `image_url`
- `top_image_url`
- `front_image_url`
- `side_image_url`
- `yellow_gold_image_url`
- `rose_gold_image_url`
- `price`
- `description`
- `details`

## Recommended columns

- `title`
- `description`
- `details`
- `price`
- `hover_image_url`
- `gallery`
- `top_image_url`
- `front_image_url`
- `side_image_url`
- `yellow_gold_image_url`
- `rose_gold_image_url`
- `metal`
- `style`
- `shape`
- `filter_values`
- `image_presentation`

## Supported `collection_key` values

- `wedding-set`
- `engagement-ring`
- `wedding-bands`
- `mens-wedding-bands`
- `necklaces-pendants`
- `bracelets`
- `earrings`
- `rings`

## Code reference

Use these internal references when preparing rows:

- `ID`: `SR` = Stock Ring, `SE` = Stock Earring, `SP` = Stock Pendant
- `Type`: `WS` = Wedding set / แหวนแต่งงาน, `ER` = Engagement ring / แหวนหมั้น, `WB` = Wedding band / แหวนแถว

If `collection_key` is empty, the loader can still infer the product collection from `Type`. If `Type` is also empty, it can fall back to the `ID` prefix for `SR`, `SE`, and `SP`.

For the website image columns, the loader also accepts simpler headers such as `white gold`, `top`, `front`, `side`, `yellow gold`, and `rose gold`.

## Image storage

The storefront accepts any public image URL.

Recommended options:

- Google Drive public file URL
- Vercel-hosted image URL
- Cloudinary or other public CDN URL

Google Drive share links are supported if the file is public. The loader converts common Drive share URLs into direct image URLs automatically.

Important: the sheet itself must still be accessible as a public CSV feed. A normal private `edit` link is not enough for the storefront to read it.

## Pre-deploy image check

Run this before deploy when product rows or image filenames change:

```powershell
npm run check:sheet-images
```

`npm run build` also runs this check automatically before Next.js builds. The checker reads the live Google Sheet CSV, scans `image_url`, `hover_image_url`, `gallery`, and the angle image columns, then verifies each value against either:

- a real local file under deployed `assets/...` image paths, using exact case-sensitive names for Vercel/Linux
- a reachable public `http` or `https` image URL

If a row uses only a filename, such as `ring-main.png`, the checker accepts it only when that filename matches one deployed image unambiguously. If the path is almost right but the letter case, extension, or filename differs, the summary lists the row, column, value, and closest matching file.

Repeated image headers are still treated as image columns. For example, if several columns are all named `image_url`, every value under those headers must be an image path or URL. Rename angle columns to `top_image_url`, `front_image_url`, `side_image_url`, `yellow_gold_image_url`, or `rose_gold_image_url`, and keep `price` under a real `price` header.

## `details` format

Put one detail per line inside the cell.

Example:

```text
Pear Shaped Diamond Wedding Set
14K White Gold
Available in White, Yellow, and Rose Gold
```

## `gallery` format

Put one image per line using:

```text
Label | Image URL | Alt text
```

Example:

```text
White Gold View | https://example.com/ws002-main.png | White gold front view
Top View | https://example.com/ws002-top.png | Top view
Side View | https://example.com/ws002-side.png | Side view
```

## Angle image columns

If you do not want to build one `gallery` cell manually, you can use separate image columns instead:

- `image_url` or `white_gold_image_url`
- `top_image_url`
- `front_image_url`
- `side_image_url`
- `yellow_gold_image_url`
- `rose_gold_image_url`

The storefront turns those columns into the product gallery automatically in that order.

## Notes

- If `hover_image_url` is empty, the main image is reused.
- If `gallery` is empty, the main image is used as the first product view.
- Existing technical columns like `ID`, `Collection`, `Type`, `Center`, `Malee`, and `Gold Weight` are still read and can be used to generate fallback product text.
- Open the site through the Next.js dev server, usually `http://127.0.0.1:3000/`, or the deployed site when testing. Some browsers restrict remote feed loading from `file:///` pages.
