# Shinesty UTM & Discount Code — Horizon Theme

Complete port of the Shinesty Next.js storefront UTM + discount logic into the Shopify Horizon theme (vanilla JS, no build step required).

---

## Files in This Folder

| File | Deploy to | Purpose |
|---|---|---|
| `utm-discount.js` | `assets/utm-discount.js` | Main script — all UTM capture, discount, checkout, banner, and badge logic |
| `utm-discount-banner.liquid` | `snippets/utm-discount-banner.liquid` | Sitewide promotional banner HTML + CSS |
| `utm-discount.liquid` | `snippets/utm-discount.liquid` | Script loader snippet (`<script defer>`) |

**These are the source-of-truth copies.** The deployed files live in `assets/` and `snippets/` respectively. Edit here and copy across when updating.

---

## Storefront Source Files Ported

| Storefront file | Ported into |
|---|---|
| `state/utm-store.js` | `utm-discount.js` — URL capture, localStorage, UTM history |
| `state/discount-code-store.ts` | `utm-discount.js` — discount lifecycle, archive, overwrite blacklist |
| `services/discounts/static-data.ts` | `utm-discount.js` — `DISCOUNT_CODE_CONFIGS`, `COUPLES_SWAPS` |
| `services/discounts/swap-codes.ts` | `utm-discount.js` — `findSwapCode()` |
| `services/discounts/utils.ts` | `utm-discount.js` — `findConfigForCode()` |
| `services/analytics/elevar.js` | `utm-discount.js` — `buildCartAttributes()` Elevar fields |
| `services/analytics/shinesty.js` | `utm-discount.js` — `buildCartAttributes()` Shinesty fields |
| `components/LinkCheckout.js` | `utm-discount.js` — checkout interception + swap code apply |

---

## Installation

### 1. Copy files to the theme

```bash
cp utm/utm-discount.js          assets/utm-discount.js
cp utm/utm-discount-banner.liquid  snippets/utm-discount-banner.liquid
cp utm/utm-discount.liquid      snippets/utm-discount.liquid
```

### 2. Add to `layout/theme.liquid`

**Before `<main id="MainContent">`** — renders the banner:
```liquid
{%- render 'utm-discount-banner' -%}
```

**Just before `</body>`** — loads the script:
```liquid
{%- render 'utm-discount' -%}
```

### 3. Add data attributes to product card snippets

**`snippets/resource-card.liquid`** — inside the `<div class="resource-card">` opening tag:
```liquid
{% if resource_type == 'product' %}
  data-product-type="{{ resource.type | downcase }}"
  data-requires-selling-plan="{{ resource.requires_selling_plan }}"
{% endif %}
```

**`snippets/product-card.liquid`** — on the `<product-card>` element:
```liquid
data-product-type="{{ product.type | downcase }}"
data-requires-selling-plan="{{ product.requires_selling_plan }}"
```

### 4. Deploy

```bash
shopify theme push --allow-live
```

---

## How It Works

### URL Parameter Capture

On every page load `captureFromUrl()` reads the query string and processes three groups of params:

| Group | Params |
|---|---|
| Elevar click IDs | `gclid`, `fbclid`, `irclickid`, `ttclid` |
| Elevar UTMs | `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `utm_discount` |
| Shinesty UTMs | `sscid`, `utm_catalog_version`, `shineOn` |

- All params are written individually to `localStorage`.
- If any new Elevar param arrives, **all existing stored UTMs are cleared first** (new campaign overrides old).
- `utm_discount` and `coupon` (Facebook/Meta alias) are stripped from the address bar via `history.replaceState` — no page reload, no visible param.

### Discount Code Lifecycle

`setDiscountCode(code)` enforces these rules in order:

1. **Archive block** — if the code appears in `shinesty-discount-archive`, it's blocked. A customer who already used `5dollarsub` can never reactivate it via a URL param.
2. **Overwrite blacklist** — `10dollarsub` cannot replace an active `5dollarsub` (better offer wins).
3. **Expiry** — stored as `{ code, expiresAt }` ISO timestamp; checked on every read.
4. **Storage** — written to `shinesty-discount` in localStorage.

#### Active Discount Configs

| UTM Code | Subscription Price | Expires | Cannot Overwrite |
|---|---|---|---|
| `5dollarlaundrysub` | $5 | 5 days | — |
| `5dollarsub` | $5 | 5 days | — |
| `10dollarsub` | $10 | 3 days | `5dollarsub` |
| `10dollarteesub` | $10 | 5 days | — |

### Product-Type Swap Codes

The URL code (e.g. `5dollarsub`) is a marketing code. Shopify requires a product-type-specific code (e.g. `5DollarBoxerSubs`) for the discount to apply correctly.

At checkout, `resolveSwapCode()`:
1. Fetches `/cart.js`
2. Finds all subscription line items (`selling_plan_allocation` present)
3. Sorts by line price — highest-value subscription determines the swap
4. Looks up the swap code via `findSwapCode()` which normalises product types into buckets (`boxers` variants → `mens`, `bikini`/`boyshort`/`cheeky` → `womens`, etc.)

#### Couples Swap Codes

When the cart contains two different product types together, a couples-specific code is used instead:

| Cart combination | Swap code |
|---|---|
| mens + mens | `10DolMatchingBoxerBoxerSub` |
| mens + thongs | `10DolMatchingBoxerThongSub` |
| mens + womens | `10DolMatchingBoxerWomenSub` |
| mens + women's boxer | `10DolMatchingBoxerWomensBoxerSub` |
| thongs + thongs | `10DolMatchingThongThongSub` |
| thongs + womens | `10DolMatchingThongWomensSub` |
| thongs + women's boxer | `10DolMatchingThongWomensBoxerSub` |
| womens + womens | `10DolMatchingWomensWomensSub` |
| womens + women's boxer | `10DolMatchingWomensWomensBoxerSub` |
| womens - boxer + women's - boxer | `10DolMatchingWomensBoxerWomensBoxerSub` |

### Checkout Interception

`attachCheckoutInterceptor()` listens (capture phase) for clicks on:
- `button#checkout`
- `button[name="checkout"]`
- `.cart__checkout-button`

**On click with a valid code:**
1. Fires `updateCartAttributes()` — posts `_elevar_visitor_info`, `_shinesty_info`, `_utm_history` to Shopify via `POST /cart/update.json` (fire-and-forget)
2. Prevents default navigation
3. Fetches cart, resolves swap code
4. Creates a hidden `<iframe>` at `/discount/{SWAP_CODE}?redirect=/` to set Shopify's discount cookie without navigating
5. On iframe load (or 3s timeout) → clears active discount and redirects to checkout

### Cart Attributes Written to Shopify

| Attribute key | Contents |
|---|---|
| `_elevar_visitor_info` | `{ referrer, gclid, fbclid, utm_source, utm_medium, utm_campaign, … }` |
| `_elevar__ga` | Google Analytics `_ga` cookie |
| `_elevar__fbc` | Facebook click ID cookie |
| `_elevar__fbp` | Facebook browser ID cookie |
| `_shinesty_info` | `{ shinestyClientId, shinestySessionId, shinestyOrderId, sscid, shineOn, … }` |
| `_utm_history` | Full JSON array of all UTM touchpoints (deduped) |

`clientId` — persistent UUID, stored in a 365-day cookie.  
`sessionId` — UUID in a 1-day cookie.  
`orderId` — fresh UUID generated per checkout attempt.

### Sitewide Banner

`renderBanner()` populates `#utm-discount-banner` (rendered by `utm-discount-banner.liquid`).

- Banner text template: `Use code [discountCode] and get your first pair for only [subscriptionPrice].`
- Tokens `[discountCode]` and `[subscriptionPrice]` are replaced at runtime.
- Falls back to `bannerTextDefault` if no `bannerText` on config.
- Hidden automatically when no valid code is active or after expiry.
- Dismiss button hides the banner for the session (not cleared from localStorage).

### Collection Page Price Badge

`injectCollectionPrices()` appends a `Subscribe — first month $N` badge to product cards when a discount code is active. Runs on page load and re-runs on every DOM mutation (MutationObserver, 30s lifetime) to catch lazy-loaded cards.

Targets three card systems:

| System | Selector |
|---|---|
| Horizon collection/search cards | `.resource-card[data-resource-type="product"]` |
| Horizon product grid cards | `product-card[data-product-type]` |
| SearchSpring React grid | `#ss-collection-page a.group.block` |

Badge is injected only if the card's `data-product-type` matches a swap entry in the active config, or if `data-requires-selling-plan="true"`. Cards already containing a badge are skipped.

### Cart Discount Auto-Fill

`tryAutoFill()` targets `cart-discount-component` (Horizon's cart drawer/page). If the discount input doesn't already show the active code, it sets `input.value` and dispatches a `submit` event. Runs on: DOM ready, cart drawer open, `cart:updated` event, and MutationObserver.

### Thank-You Page Cleanup

If the current URL contains `/thank_you` or `/orders/`, the active discount code is moved to the archive and removed from localStorage — preventing the customer from ever reusing the same code from a URL.

---

## localStorage Reference

| Key | Type | Description |
|---|---|---|
| `utm_source` | string | Last seen `utm_source` |
| `utm_medium` | string | Last seen `utm_medium` |
| `utm_campaign` | string | Last seen `utm_campaign` |
| `utm_content` | string | Last seen `utm_content` |
| `utm_term` | string | Last seen `utm_term` |
| `gclid` | string | Google click ID |
| `fbclid` | string | Facebook click ID |
| `irclickid` | string | Impact Radius click ID |
| `ttclid` | string | TikTok click ID |
| `sscid` | string | ShareASale click ID |
| `utm_catalog_version` | string | Shinesty catalog version flag |
| `shineOn` | string | Shinesty custom UTM |
| `utm_history` | JSON array | All UTM touchpoints with timestamps |
| `referrer` | string | First landing `document.referrer` |
| `shinesty-discount` | JSON object | `{ code, expiresAt }` — active discount |
| `shinesty-discount-archive` | JSON array | `[{ code, expiresAt }]` — expired/used codes |

---

## Public API

The script exposes `window.ShinestyUTM` for use in other Liquid snippets or inline scripts:

```js
window.ShinestyUTM.getCurrentCode()         // → { code, expiresAt } | null
window.ShinestyUTM.setDiscountCode('CODE')  // set a code programmatically
window.ShinestyUTM.findConfigForCode('CODE')// → config object | null
window.ShinestyUTM.renderBanner()           // force-refresh the banner
```

---

## Events Listened To

| Event | Action |
|---|---|
| `DOMContentLoaded` | `renderBanner`, `attachCheckoutInterceptor`, `tryAutoFill`, `observeCart`, `injectCollectionPrices` |
| `click` (capture phase) | Checkout interception |
| `shopify:section:load` | `tryAutoFill` |
| `cart:updated` | `tryAutoFill`, `renderBanner` |
| `cart-drawer:open` | `tryAutoFill` |
| `MutationObserver` on `document.body` | `tryAutoFill`, `injectCollectionPrices` (active for 30s) |
