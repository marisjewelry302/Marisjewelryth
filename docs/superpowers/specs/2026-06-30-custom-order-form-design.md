# Custom Order Form Design

Date: 2026-06-30

## Context

Maris Jewelry needs a dedicated custom order request flow for customers who start from a product page and want the atelier to contact them about a made-to-order version of that piece. The existing `/request-quote` route is a soft-launch/localStorage quote flow, so this feature should not overload it. This design creates a separate route, API, Supabase table, customer lead link, and email notification path.

## Goals

- Add a product-originated custom order form at `/contact-order/[productCode]`.
- Keep `product_code` locked/readonly from the route.
- Keep the main form visually close to the current Maris homepage mood: editorial, premium, teal/paper/blush/gold, airy, and not checkout-like.
- Put custom specs in an optional modal/sheet so the main form stays calm.
- Save successful submissions in Supabase.
- Link each request to an existing or newly created guest/lead customer record.
- Send a confirmation email to the customer and a notification email to the Maris team.
- Preserve soft-launch honesty: submitting the form is a contact request, not a confirmed ecommerce order.

## Out Of Scope

- Admin panel screens for viewing or managing custom order requests.
- Payment, checkout, inventory reservation, or order confirmation behavior.
- Replacing `/request-quote` or converting existing localStorage lead forms to Supabase.

## Chosen Approach

Use a dedicated flow:

1. Product page CTA points to `/contact-order/[productCode]`, for example `/contact-order/SR000`.
2. `app/contact-order/[productCode]/page.js` renders the page shell.
3. A client component owns form state, modal state, validation feedback, submit status, and success state.
4. `POST /api/custom-order-requests` validates the payload server-side, writes Supabase with the service-role client, links a customer lead, sends emails, and returns a whitelisted response.

This keeps the new behavior isolated from `/request-quote` and from unrelated header/nav work already present in the working tree.

## Route And UI

### Product page CTA

The product detail page should expose a primary or secondary action labelled `ติดต่อสั่งสินค้า`. The destination should use the product SKU/code:

```text
/contact-order/[productCode]
```

The current product page already has the product SKU available, so the CTA should not rely on a user-editable query parameter.

### Main page layout

The page should follow the approved main-site mood:

- Editorial image-led section using an existing custom-jewelry/home asset.
- Teal utility strip and Maris palette accents.
- Form panel on desktop; stacked layout on mobile.
- `Urbanist` / existing Maris font tokens.
- No fake checkout language.

Main form fields:

- `product_code`: readonly/disabled visual field, prefilled from route.
- `full_name`: required.
- `company_name`: optional.
- `email`: required.
- `contact_number`: required, placeholder `(+00) 123456789`.

Submit success should replace or clearly transform the form into a success state:

```text
ติดต่อกลับสำเร็จ
ขอบคุณค่ะ/ครับ ทีม Maris Jewelry ได้รับคำขอของคุณแล้ว และจะติดต่อกลับเพื่อยืนยันรายละเอียดก่อนดำเนินการขั้นต่อไป
```

### Optional specs modal

The "ตัวเลือกเพิ่มเติม" control opens a modal on desktop and can behave as a full-screen or bottom sheet on mobile. These values are optional and should not appear as always-visible form fields.

State shape:

```js
const customOptions = {
  metal: null,
  metal_purity: null,
  ring_size: null,
  choose_stone: {
    carat: null,
    color: null,
    clarity: null,
    cut: null
  },
  origin: null
};
```

Allowed values:

- Metal: `WG`, `YG`, `RG`, `PN`, `Pd`.
- Purity: `9K`, `14K`, `18K`; applies only to gold metals (`WG`, `YG`, `RG`).
- Ring size: 5 to 16 inclusive, step 0.5.
- Carat: 0.2 to 5 inclusive.
- Color: `D` through `Z`.
- Clarity: `VVS1`, `VVS2`, `VS1`, `VS2`, `SI1`, `SI2`, `I1`, `I2`, `I3`.
- Cut: `Excellent`, `Very Good`, `Good`, `Fair`, `Poor`.
- Origin: `Lab-grown`, `Natural`.

After the modal is confirmed, the main form should show a short summary only when at least one optional value exists, for example:

```text
18K Yellow Gold · Size 7 · Lab-grown · 0.8 ct D VVS1 Excellent
```

## Data Model

Create a Supabase migration for `public.custom_order_requests`.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `customer_id uuid references public.customers(id) on delete set null`
- `product_code text not null`
- `full_name text not null`
- `company_name text`
- `email text not null`
- `contact_number text not null`
- `metal text`
- `metal_purity text`
- `ring_size numeric(4, 1)`
- `stone_carat numeric(4, 2)`
- `stone_color text`
- `stone_clarity text`
- `stone_cut text`
- `origin text`
- `status text not null default 'pending'`
- `metadata jsonb not null default '{}'::jsonb`

Status values should be constrained with a check:

```sql
status in ('pending', 'contacted', 'completed', 'cancelled')
```

Recommended checks:

- `metal is null or metal in ('WG', 'YG', 'RG', 'PN', 'Pd')`
- `metal_purity is null or metal_purity in ('9K', '14K', '18K')`
- `ring_size is null or (ring_size >= 5 and ring_size <= 16 and ring_size * 2 = floor(ring_size * 2))`
- `stone_carat is null or (stone_carat >= 0.2 and stone_carat <= 5)`
- `stone_color is null or stone_color in ('D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z')`
- `stone_clarity is null or stone_clarity in ('VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2', 'I3')`
- `stone_cut is null or stone_cut in ('Excellent', 'Very Good', 'Good', 'Fair', 'Poor')`
- `origin is null or origin in ('Lab-grown', 'Natural')`

Indexes:

- `idx_custom_order_requests_customer_id`
- `idx_custom_order_requests_email`
- `idx_custom_order_requests_product_code`
- `idx_custom_order_requests_status_created_at`

Enable RLS. The application will use the server-side service-role client for inserts. Because the app is not using Supabase Auth for this public form, do not depend on a public browser insert policy for this implementation. A future direct-client implementation can add narrowly scoped insert policy if needed.

## Customer Lead Linking

Use the existing `customers` table. The implementation must verify the active schema before relying on one column shape: app code currently expects `full_name`, while the oldest base migration shows `name`. The migration or tests must make this explicit so lead linking does not fail silently.

Linking rule:

1. Normalize `email` to lowercase.
2. Search existing customer by email first.
3. If no email match exists, search by exact phone/contact number when present.
4. If found, update safe lead details: name, phone, and metadata.
5. If not found, create a guest/lead customer record without a password.
6. Store `customer_id` on `custom_order_requests`.

Customer metadata may include lead/source context, but API responses must not expose internal metadata.

## API Contract

Endpoint:

```text
POST /api/custom-order-requests
```

Request body:

```json
{
  "product_code": "SR000",
  "full_name": "Ada Client",
  "company_name": "Ada Studio",
  "email": "ada@example.com",
  "contact_number": "(+66) 812345678",
  "custom_options": {
    "metal": "YG",
    "metal_purity": "18K",
    "ring_size": 7,
    "choose_stone": {
      "carat": 0.8,
      "color": "D",
      "clarity": "VVS1",
      "cut": "Excellent"
    },
    "origin": "Lab-grown"
  }
}
```

Server validation is authoritative:

- `product_code`, `full_name`, `email`, and `contact_number` are required.
- Email must pass the existing email normalization style.
- Contact number may contain only digits, spaces, `+`, `(`, `)`, and `-`.
- Optional specs must be normalized and checked against allowed values/ranges.
- If metal is `PN` or `Pd`, clear `metal_purity`.
- Do not accept `customer_id`, `status`, or internal metadata from the browser.

Successful response must be a whitelist, not a spread of the database row:

```json
{
  "status": "created",
  "requestId": "uuid",
  "requestStatus": "pending"
}
```

Do not return Supabase secrets, customer metadata, raw DB rows, or email provider response bodies.

Error responses:

- `400` for invalid input.
- `503` when Supabase or email configuration is missing.
- `500` for unexpected server failures.

If database insert succeeds but email delivery fails, the API should report a failure to the client without deleting the saved request. The saved request can remain pending for follow-up. The final implementation should log enough server-side detail for operators while returning a safe client message.

## Email Behavior

Reuse the existing Resend helper/config style:

- Existing env: `RESEND_API_KEY`, `MARIS_EMAIL_FROM`.
- Add env: `MARIS_ORDER_EMAIL_TO` for the internal order inbox.
- Document the new env in `.env.example`.

Customer email:

- Subject: clear confirmation that Maris received the custom order request.
- Include product code.
- Include selected optional specs only when present.
- State that Maris will contact the customer to confirm details before the next step.
- Do not imply payment, checkout, or confirmed production.

Admin/team email:

- Sent to `MARIS_ORDER_EMAIL_TO`.
- Include request id, created time, product code, full name, company name, email, contact number, all selected options, and customer id if linked.
- Use Maris brand colors/fonts in inline email HTML, with plain-text fallback.

Idempotency:

- Use a stable idempotency key where possible, for example `custom-order-${requestId}-customer` and `custom-order-${requestId}-admin`.

## Styling And Accessibility

- Use existing Maris tokens from `assets/css/style.css` where possible.
- Scope new styles to custom-order classes to avoid affecting existing forms.
- Keep cards/panels at a restrained radius or square style consistent with existing pages.
- Mobile should stack to one column at or before `768px`.
- The modal should trap focus, close on Escape, and return focus to the trigger.
- The modal submit/confirm button must not resize layout as selections change.
- Text inside buttons and fields must fit on mobile.
- Dark teal panels must keep readable contrast; do not reduce body text with low opacity.
- The review mockup `<pre>` snippet is documentation only and should not appear in production UI.

## Testing And Verification

Add a focused script test, for example:

```text
npm run test:custom-order
```

The test should cover:

- Migration creates `custom_order_requests`, enables RLS, adds indexes, and constrains `status`.
- Validator accepts valid payloads and rejects invalid required fields, email, phone characters, enum values, and numeric ranges.
- Metal purity is cleared for Platinum/Palladium.
- Supabase helper builds an insert payload without trusting browser-provided `customer_id`, `status`, or metadata.
- Customer linking searches by email first and creates/updates a guest lead record.
- API response is whitelisted and never spreads raw DB rows.
- Email templates include the correct summaries and do not imply confirmed ecommerce order status.
- Missing Supabase or email env returns an honest service-unavailable state.
- Product page CTA points to `/contact-order/[sku]`.

Verification before completion:

- Run `npm run test:custom-order`.
- Run related existing tests touched by the change, especially customer/email/database tests.
- Run `npm run build`.
- If live Supabase/email env is unavailable, report that live submission/email delivery is blocked rather than pretending it was verified.
