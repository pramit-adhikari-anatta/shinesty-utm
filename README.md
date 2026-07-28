# Shinesty UTM + Discount — Horizon Theme

Complete port of the headless storefront's UTM capture, discount code management, and subscription pricing into a single vanilla-JS asset for the Shopify Horizon theme.

---

## Folder Contents

```
utm/
├── README.md                    ← this file
├── utm-discount.js              ← reference copy of assets/utm-discount.js
├── utm-discount-banner.liquid   ← reference copy of snippets/utm-discount-banner.liquid
└── utm-discount.liquid          ← reference copy of snippets/utm-discount.liquid
```

> **Note:** The files in this `utm/` folder are reference copies. The live deployed files are:
> - `/assets/utm-discount.js`
> - `/snippets/utm-discount-banner.liquid`
> - `/snippets/utm-discount.liquid`
> - Included in `/layout/theme.liquid`

---

## Files & What They Do

### `assets/utm-discount.js` (648 lines)

Single IIFE script. Ported from 8 storefront files:

| Storefront source | What was ported |
|---|---|
| `state/utm-store.js` | UTM capture, history, localStorage keys |
| `state/discount-code-store.ts` | Discount code init, set, clear, archive, overwrite blacklist |
| `services/discounts/static-data.ts` | All 4 discount configs + 10 couples swap entries + SPECIAL_CONFIGS |
| `services/discounts/swap-codes.ts` | `findSwapCode()`, `arraysEqual()`, product type normalisation |
| `services/discounts/utils.ts` | `findConfigForCode()` |
| `components/LinkCheckout.js` | Checkout button interception, swap code resolution, iframe discount apply |
| `services/analytics/elevar.js` | `buildCartAttributes()`, `_elevar_visitor_info`, cookie capture |
| `services/analytics/shinesty.js` | `_shinesty_info`, client ID, session ID |

---

### `snippets/utm-discount-banner.liquid`

Renders the sitewide discount banner HTML structure. Hidden by default — `utm-discount.js` calls `renderBanner()` to populate and show/hide it based on the active discount code.

**Includes:**
- `#utm-discount-banner` — banner container
- `.utm-banner__text` — populated by JS with discount message
- `.utm-banner__link` — "Shop now" CTA, hidden when no `bannerHref` in config
- `.utm-banner__close` — dismiss button
- CSS for `.utm-sub-price` — the subscription price badge on collection cards
- Close button click handler (inline script)

**Placement:** Included in `layout/theme.liquid` before `<main>`.

---

### `snippets/utm-discount.liquid`

Minimal snippet. Loads `utm-discount.js` with `defer` via Shopify's asset pipeline.

```liquid
<script src="{{ 'utm-discount.js' | asset_url }}" defer></script>
```

**Placement:** Included in `layout/theme.liquid` just before `</body>`.

---

### `layout/theme.liquid` (modified)

Two lines added:

```liquid
<!-- before <main> -->
{%- render 'utm-discount-banner' -%}

<!-- before </body> -->
{%- render 'utm-discount' -%}
```

---

## How It Works — End to End

### 1. URL Capture (`captureFromUrl`)

Runs immediately on script load (before DOM ready).

Reads `window.location.search` and saves recognised params to `localStorage`:

| Group | Params |
|---|---|
| Elevar click IDs | `gclid`, `fbclid`, `irclickid`, `ttclid` |
| Elevar UTMs | `utm_campaign`, `utm_content`, `utm_discount`, `utm_medium`, `utm_source`, `utm_term` |
| Shinesty UTMs | `sscid`, `utm_catalog_version`, `shineOn` |
| Discount aliases | `coupon` (same as `utm_discount`), `discount_code` (remapped) |

**Key behaviours:**
- If any new Elevar param arrives, all existing Elevar keys are cleared first (fresh campaign wins)
- `utm_discount` and `coupon` are stripped from the address bar after capture (`history.replaceState`)
- Discount value is passed to `initDiscountCode()` which validates and stores it

---

### 2. Discount Code Storage

**localStorage keys:**

| Key | Value | Description |
|---|---|---|
| `shinesty-discount` | `{ code, expiresAt }` | Active discount code |
| `shinesty-discount-archive` | `[{ code, expiresAt }]` | Cleared/expired codes — blocks renewal |

**`setDiscountCode(code)` logic:**

1. Check archive — if code was previously cleared, block renewal
2. Look up config — find `DISCOUNT_CODE_CONFIGS` entry, fall back to `{ expiresDays: 7 }`
3. Check existing — if same code is already expired, clear and exit
4. Check overwrite blacklist — `10dollarsub` cannot overwrite `5dollarsub`
5. Write `{ code: code.toUpperCase(), expiresAt }` to `shinesty-discount`
6. Call `renderBanner()` immediately

**Old format migration** — on every `setDiscountCode` call, these legacy keys are cleared:
- `shinesty_discount_code`
- `utm_discount` (old format)
- `shinesty_subscription_discount`

---

### 3. Discount Code Configs

Four named configs in `DISCOUNT_CODE_CONFIGS`:

| Code | Price | Expires | Frequencies | Overwrite Blacklist |
|---|---|---|---|---|
| `5dollarlaundrysub` | $5 | 5 days | monthly, bimonthly, quarterly | — |
| `5dollarsub` | $5 | 5 days | monthly | — |
| `10dollarsub` | $10 | 3 days | monthly | `5dollarsub` |
| `10dollarteesub` | $10 | 5 days | monthly, quarterly | — |

One special config pattern:

| Pattern | Match | Expires |
|---|---|---|
| `buy5get2*` | `code.startsWith('buy5get2')` | 21 days |

---

### 4. Product Type Swap Codes

At checkout, the stored code is swapped to a product-type-specific Shopify discount code based on the highest-value subscription item in the cart.

**`findSwapCode(discountCode, productTypes)`** — resolution order:

1. Direct match on `productTypes` array
2. Normalise product types to category buckets, then match:
   - `boxers`, `boxers - brief`, `boxers - fly`, `boxers - long - fly`, `boxers - trunk` → `mens`
   - `bikini`, `boyshort`, `cheeky`, `thongs - modal` → `womens`
   - `socks - ankle`, `socks - crew`, `socks - quarter` → `socks`

**`5dollarsub` swap codes:**

| Product Type | Shopify Code |
|---|---|
| `bikini` | `5DollarBikiniSubs` |
| `boxers` | `5DollarBoxerSubs` |
| `boxers - brief` | `5DollarBriefBoxerSubs` |
| `boxers - fly` | `5DollarBoxerSubs` |
| `boxers - long - fly` | `5DollarLongSubs` |
| `boxers - trunk` | `5DollarTrunkBoxerSubs` |
| `boys underwear` | `5Dollarboysboxerbriefsub` |
| `boyshort` | `5DollarBoyshortSubs` |
| `cheeky` | `5DollarCheekySubs` |
| `socks - ankle / crew / quarter` | `5DollarSockSub` |
| `thongs` | `5DollarThongSubs` |
| `thongs - modal` | `5DollarModalThongSubs` |
| `women's boxer` | `5DollarWomensBoxerSub` |

**`10dollarsub` swap codes:**

| Product Type | Shopify Code |
|---|---|
| `bikini` | `NiceHamWomensSubs` |
| `boxers` | `NiceHamBoxerSubs` |
| `boxers - brief / fly / long - fly / trunk` | `NiceHamBoxerSubs` |
| `boyshort` | `NiceHamWomensSubs` |
| `cheeky` | `NiceHamWomensSubs` |
| `socks - ankle / crew / quarter` | `10DollarSockSub` |
| `thongs` | `NiceHamThongSubs` |
| `thongs - modal` | `NiceHamModalThongSubs` |
| `women's boxer` | `NiceHamWomensBoxerSub` |
| `boys underwear` | `10Dollarboysboxerbriefsub` |

**Couples swap codes (shared across `5dollarsub` and `10dollarsub`):**

| Cart product types | Shopify Code |
|---|---|
| `mens` + `mens` | `10DolMatchingBoxerBoxerSub` |
| `mens` + `thongs` | `10DolMatchingBoxerThongSub` |
| `mens` + `womens` | `10DolMatchingBoxerWomenSub` |
| `mens` + `women's boxer` | `10DolMatchingBoxerWomensBoxerSub` |
| `thongs` + `thongs` | `10DolMatchingThongThongSub` |
| `thongs` + `womens` | `10DolMatchingThongWomensSub` |
| `thongs` + `women's boxer` | `10DolMatchingThongWomensBoxerSub` |
| `womens` + `womens` | `10DolMatchingWomensWomensSub` |
| `womens` + `women's boxer` | `10DolMatchingWomensWomensBoxerSub` |
| `womens - boxer` + `women's - boxer` | `10DolMatchingWomensBoxerWomensBoxerSub` |

---

### 5. Checkout Interception (`attachCheckoutInterceptor`)

Intercepts clicks on:
- `button#checkout`
- `button[name="checkout"]`
- `.cart__checkout-button`

**On click:**

1. Fires `updateCartAttributes(buildCartAttributes())` — pushes UTM data to cart (fire-and-forget)
2. Checks for a valid (non-expired) discount code
3. If found: prevents default, fetches cart via `/cart.js`, resolves swap code, applies via silent iframe to `/discount/{CODE}?redirect=/`, then redirects to checkout
4. If not found: allows default checkout flow to proceed

**Cart attributes injected (`/cart/update.json`):**

| Attribute | Content |
|---|---|
| `_elevar_visitor_info` | JSON — referrer + all Elevar UTM/click ID params |
| `_elevar__ga` | `_ga` cookie value |
| `_elevar__fbc` | `_fbc` cookie value |
| `_elevar__fbp` | `_fbp` cookie value |
| `_shinesty_info` | JSON — client ID, session ID, order ID, Shinesty UTMs |
| `_utm_history` | JSON array — full UTM visit history |

---

### 6. Discount Banner (`renderBanner`)

Called on init, after `setDiscountCode`, and on `cart:updated` event.

Reads active code → finds config → formats `bannerText` template:
- `[discountCode]` → `config.discountCode.toUpperCase()`
- `[subscriptionPrice]` → `$5` or `$10`

Shows `#utm-discount-banner`, populates `.utm-banner__text`, shows `.utm-banner__link` if `config.bannerHref` is set. Hides banner if no valid code or config.

---

### 7. Collection Price Badges (`injectCollectionPrices`)

Injects a `<div class="utm-sub-price">Subscribe — first month $X</div>` onto product cards when an active subscription discount code is present.

**Targets:**
- `.resource-card[data-resource-type="product"]` — Horizon resource-card component
- `product-card[data-product-type]` — Horizon product-card component
- `#ss-collection-page a.group.block` — SearchSpring rendered cards

**Requires these data attributes on product cards** (added to `snippets/resource-card.liquid` and `snippets/product-card.liquid`):

```liquid
data-product-type="{{ resource.type | downcase }}"
data-requires-selling-plan="{{ resource.requires_selling_plan }}"
```

Runs on init + on every DOM mutation (via MutationObserver, active for 30 seconds) + on `cart:updated` event.

---

### 8. Cart Drawer Auto-Fill (`tryAutoFill`)

When the cart drawer opens, finds `cart-discount-component` elements, checks if the active code is already applied, and if not — fills the discount input and submits the form.

Triggered by:
- `DOMContentLoaded`
- `MutationObserver` (childList changes in `document.body`)
- `shopify:section:load`
- `cart:updated`
- `cart-drawer:open`

---

### 9. Thank-You Page Cleanup (`clearOnThankYou`)

On any page where `pathname` includes `/thank_you` or `/orders/`, the active discount code is cleared and archived. Prevents the same code from being re-applied on the next order.

---

## Public API

Available as `window.ShinestyUTM` for use in Liquid snippets or other scripts:

```js
window.ShinestyUTM.getCurrentCode()
// → { code: '5DOLLARSUB', expiresAt: '2026-08-02T...' } | null

window.ShinestyUTM.setDiscountCode('5dollarsub')
// Stores code, validates, updates banner

window.ShinestyUTM.findConfigForCode('5dollarsub')
// → full config object | null

window.ShinestyUTM.renderBanner()
// Re-renders the discount banner based on current stored code
```

Also exposed for SearchSpring integration:

```js
// Call after SearchSpring re-renders the product grid
if (window.ShinestyUTM) {
  window.ShinestyUTM.renderBanner();
}
```

---

## SearchSpring Integration Note

After every grid render (pagination, filter change, sort change), SearchSpring must call:

```js
if (window.ShinestyUTM) {
  window.ShinestyUTM.renderBanner();
}
```

This re-runs `injectCollectionPrices()` on newly rendered cards. SearchSpring product cards inside `#ss-collection-page` are already targeted by the script — no additional data attributes required on SearchSpring-rendered cards.

---

## Installation Checklist

- [ ] Copy `utm-discount.js` → `assets/utm-discount.js`
- [ ] Copy `utm-discount-banner.liquid` → `snippets/utm-discount-banner.liquid`
- [ ] Copy `utm-discount.liquid` → `snippets/utm-discount.liquid`
- [ ] Add to `layout/theme.liquid` before `<main>`: `{%- render 'utm-discount-banner' -%}`
- [ ] Add to `layout/theme.liquid` before `</body>`: `{%- render 'utm-discount' -%}`
- [ ] Add `data-product-type` + `data-requires-selling-plan` to `snippets/resource-card.liquid`
- [ ] Add `data-product-type` + `data-requires-selling-plan` to `snippets/product-card.liquid`
- [ ] Verify checkout button selectors match Horizon cart drawer/page markup
- [ ] Tell SearchSpring to call `window.ShinestyUTM?.renderBanner?.()` after every grid re-render

---

## Storefront → Horizon Mapping

| Storefront (Next.js) | Horizon (Liquid/JS) |
|---|---|
| `state/utm-store.js` | `assets/utm-discount.js` — `captureFromUrl`, `updateUtmHistory` |
| `state/discount-code-store.ts` | `assets/utm-discount.js` — `getCurrent`, `setCurrent`, `clearCurrent` |
| `services/discounts/static-data.ts` | `assets/utm-discount.js` — `DISCOUNT_CODE_CONFIGS`, `COUPLES_SWAPS` |
| `services/discounts/swap-codes.ts` | `assets/utm-discount.js` — `findSwapCode`, `arraysEqual` |
| `services/discounts/utils.ts` | `assets/utm-discount.js` — `findConfigForCode` |
| `components/LinkCheckout.js` | `assets/utm-discount.js` — `attachCheckoutInterceptor`, `resolveSwapCode` |
| `services/analytics/elevar.js` | `assets/utm-discount.js` — `buildCartAttributes`, `getElevarCookies` |
| `services/analytics/shinesty.js` | `assets/utm-discount.js` — `getClientId`, `getSessionId` |
| MobX `makeAutoObservable` | Removed — plain functions + localStorage |
| `luxon` DateTime | Replaced with `new Date().toISOString()` |
| `@/` path aliases | Removed — single bundled file |
| `js-cookie` | Replaced with inline `getCookie` / `setCookie` |
| React Context | Replaced with `window.ShinestyUTM` global |
