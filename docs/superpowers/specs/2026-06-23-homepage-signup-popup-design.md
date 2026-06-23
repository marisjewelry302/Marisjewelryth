# Homepage Signup Popup Design

## Goal

Add a premium homepage-only signup popup that collects an email address, sends the visitor to the existing Account page, and lets the Account/Supabase membership flow handle the real signup.

## Scope

- Show the popup only on the homepage (`/`).
- Do not write popup submissions directly to Supabase.
- Redirect valid popup emails to `/account?email=<email>&source=popup`.
- Let the existing Account page become the real signup surface.
- Preserve the existing site structure and App Router patterns.

## Behavior

- Wait 3 seconds after homepage load before opening the popup.
- Apply a dark blurred overlay behind the modal.
- Lock page scroll while the popup is open.
- Close by clicking `X`, clicking `No, thank you`, clicking the overlay, or pressing `Esc`.
- After closing without submitting, suppress the popup for 1 day in the same browser.
- After submitting a valid email, suppress the popup for 30 days in the same browser.
- Validate email with both `type="email"` browser validation and an inline popup message.
- Submit button text is `GET 10% OFF`.

## Visual Direction

- Desktop modal uses a split layout.
- Left panel uses `backgound popup.png` as the jewelry/silk image.
- Mobile hides the left image and keeps the form-focused content.
- Right panel uses a warm ivory background and Maris luxury styling.
- Header uses `WELCOME TO` above the Maris Jewelry logo.
- The separate repeated `MARIS JEWELRY` headline is removed.
- Logo is converted from the provided black logo JPG into a transparent green luxury mark.
- The top diamond icon is not used.
- `10% OFF` is visible but secondary to the brand mark.
- Three benefit icons use a luxury green line style:
  - `10% OFF` / `your first confirmed order`
  - `Early access` / `to new Maris pieces`
  - `Private offers` / `for Maris members`
- Privacy copy:
  - `By continuing, you agree to receive Maris Jewelry updates and accept our Privacy Policy.`
  - `Privacy Policy` links to `/privacy-policy`.

## Account Flow

- `/account` already has a Create Account email field.
- When loaded with `?email=<email>&source=popup`:
  - Open `Create Account` mode automatically.
  - Prefill the create account email field.
  - Show a premium notice above the create form:
    - `Maris member offer`
    - `Complete your Maris account to receive your 10% offer.`
- Supabase-related account creation remains owned by the Account flow, not by the popup.

## Files

- Create `app/HomeSignupPopup.jsx`.
- Modify `app/page.js` to render the popup on the homepage only.
- Modify `app/account/AccountClient.jsx` to read URL email/source and prefill Create Account.
- Modify `assets/css/style.css` for popup and Account offer notice styles.
- Add popup assets under `assets/images/home/popup/`.

## Verification

- `npm run build` must pass.
- Browser check homepage:
  - popup appears after 3 seconds.
  - scroll locks while open.
  - close buttons suppress for 1 day.
  - invalid email stays in popup with an inline message.
  - valid email redirects to `/account?email=...&source=popup`.
- Browser check account:
  - Create Account tab opens automatically.
  - email is prefilled.
  - offer notice appears only for `source=popup`.
