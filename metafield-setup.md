# Shopify Metafield Setup — Discount Code Configs

## Overview

Instead of hardcoding `DISCOUNT_CODE_CONFIGS` in `utm-discount.js`, configs are stored as
Shopify **shop metafields** and injected into the page via Liquid. This lets the Shinesty team
update discount codes, prices, banner text, and swap codes from the Shopify admin without
touching theme code.

---

## Step 1: Create Metafield Definitions in Shopify Admin

Go to **Settings → Custom data → Shop** and create these two metafield definitions:

### Metafield 1: Discount Code Configs

| Field | Value |
|---|---|
| Name | `Discount Code Configs` |
| Namespace and key | `shinesty.discount_code_configs` |
| Type | **JSON** |
| Description | Array of subscription discount code configurations |

### Metafield 2: Special Configs

| Field | Value |
|---|---|
| Name | `Special Discount Configs` |
| Namespace and key | `shinesty.discount_special_configs` |
| Type | **JSON** |
| Description | Pattern-match configs (e.g. buy5get2*) |

### Metafield 3: Couples Swaps

| Field | Value |
|---|---|
| Name | `Couples Swap Codes` |
| Namespace and key | `shinesty.discount_couples_swaps` |
| Type | **JSON** |
| Description | Couples subscription swap code lookup table |

---

## Step 2: Populate Metafield Values

Go to **Settings → Custom data → Shop → [your shop]** and paste the JSON below
into each metafield.

### `shinesty.discount_code_configs`

```json
[
  {
    "bannerHref": "/pages/all-subscriptions",
    "bannerText": "Use code [discountCode] and get your first month for only [subscriptionPrice].",
    "bannerTextDefault": "Start a new subscription for [subscriptionPrice] today.",
    "discountCode": "5dollarlaundrysub",
    "expiresDays": 5,
    "productTypeSwaps": [
      { "productTypes": ["laundry detergent sheets"], "code": "5dollarlaundrysub" }
    ],
    "subscriptionFrequencies": ["monthly", "bimonthly", "quarterly"],
    "subscriptionPrice": 5
  },
  {
    "bannerHref": "/pages/all-subscriptions",
    "bannerText": "Use code [discountCode] and get your first pair for only [subscriptionPrice].",
    "bannerTextDefault": "Start a new subscription for [subscriptionPrice] today.",
    "bannerTextSecondary": "Just for you: Try subscription undies for [subscriptionPrice].",
    "discountCode": "5dollarsub",
    "expiresDays": 5,
    "productTypeSwaps": [
      { "productTypes": ["bikini"],                "code": "5DollarBikiniSubs" },
      { "productTypes": ["boxers"],                "code": "5DollarBoxerSubs" },
      { "productTypes": ["boxers - brief"],        "code": "5DollarBriefBoxerSubs" },
      { "productTypes": ["boxers - fly"],          "code": "5DollarBoxerSubs" },
      { "productTypes": ["boxers - magnum pouch"], "code": "5DollarBoxerSubs" },
      { "productTypes": ["boxers - long - fly"],   "code": "5DollarLongSubs" },
      { "productTypes": ["boxers - trunk"],        "code": "5DollarTrunkBoxerSubs" },
      { "productTypes": ["boys underwear"],        "code": "5Dollarboysboxerbriefsub" },
      { "productTypes": ["boyshort"],              "code": "5DollarBoyshortSubs" },
      { "productTypes": ["cheeky"],                "code": "5DollarCheekySubs" },
      { "productTypes": ["socks - ankle"],         "code": "5DollarSockSub" },
      { "productTypes": ["socks - crew"],          "code": "5DollarSockSub" },
      { "productTypes": ["socks - quarter"],       "code": "5DollarSockSub" },
      { "productTypes": ["thongs"],                "code": "5DollarThongSubs" },
      { "productTypes": ["thongs - modal"],        "code": "5DollarModalThongSubs" },
      { "productTypes": ["women's boxer"],         "code": "5DollarWomensBoxerSub" }
    ],
    "subscriptionFrequencies": ["monthly"],
    "subscriptionPrice": 5
  },
  {
    "bannerHref": "/pages/all-subscriptions",
    "bannerText": "Use code [discountCode] and get your first pair for only [subscriptionPrice].",
    "bannerTextDefault": "Start a new subscription for [subscriptionPrice] today.",
    "bannerTextSecondary": "Just for you: Try subscription undies for [subscriptionPrice].",
    "discountCode": "10dollarsub",
    "expiresDays": 3,
    "overwriteBlacklist": ["5dollarsub"],
    "productTypeSwaps": [
      { "productTypes": ["bikini"],              "code": "NiceHamWomensSubs" },
      { "productTypes": ["boxers"],              "code": "NiceHamBoxerSubs" },
      { "productTypes": ["boxers - brief"],      "code": "NiceHamBoxerSubs" },
      { "productTypes": ["boxers - fly"],        "code": "NiceHamBoxerSubs" },
      { "productTypes": ["boxers - long - fly"], "code": "NiceHamBoxerSubs" },
      { "productTypes": ["boxers - trunk"],      "code": "NiceHamBoxerSubs" },
      { "productTypes": ["boys underwear"],      "code": "10Dollarboysboxerbriefsub" },
      { "productTypes": ["boyshort"],            "code": "NiceHamWomensSubs" },
      { "productTypes": ["cheeky"],              "code": "NiceHamWomensSubs" },
      { "productTypes": ["socks - ankle"],       "code": "10DollarSockSub" },
      { "productTypes": ["socks - crew"],        "code": "10DollarSockSub" },
      { "productTypes": ["socks - quarter"],     "code": "10DollarSockSub" },
      { "productTypes": ["thongs"],              "code": "NiceHamThongSubs" },
      { "productTypes": ["thongs - modal"],      "code": "NiceHamModalThongSubs" },
      { "productTypes": ["women's boxer"],       "code": "NiceHamWomensBoxerSub" }
    ],
    "subscriptionFrequencies": ["monthly"],
    "subscriptionPrice": 10
  },
  {
    "bannerHref": "/products/black-mens-tee",
    "bannerText": "Use code [discountCode] and get your first month for only [subscriptionPrice].",
    "bannerTextDefault": "Start a new subscription for [subscriptionPrice] today.",
    "bannerTextSecondary": "Just for you: Try subscription tees for [subscriptionPrice].",
    "discountCode": "10dollarteesub",
    "expiresDays": 5,
    "productTypeSwaps": [
      { "productTypes": ["men's t-shirts"], "code": "10DollarTeeSub" }
    ],
    "subscriptionFrequencies": ["monthly", "quarterly"],
    "subscriptionPrice": 10
  }
]
```

### `shinesty.discount_special_configs`

```json
[
  {
    "bannerTextDefault": "Buy 5 get 2 free. Shop now & we'll apply at checkout.",
    "expiresDays": 21,
    "searchParams": { "startsWith": "buy5get2" }
  }
]
```

### `shinesty.discount_couples_swaps`

```json
[
  { "productTypes": ["mens", "mens"],               "code": "10DolMatchingBoxerBoxerSub",        "subscriptionPrice": 5 },
  { "productTypes": ["mens", "thongs"],             "code": "10DolMatchingBoxerThongSub",        "subscriptionPrice": 5 },
  { "productTypes": ["mens", "womens"],             "code": "10DolMatchingBoxerWomenSub",        "subscriptionPrice": 5 },
  { "productTypes": ["mens", "women's boxer"],      "code": "10DolMatchingBoxerWomensBoxerSub",  "subscriptionPrice": 5 },
  { "productTypes": ["thongs", "thongs"],           "code": "10DolMatchingThongThongSub",        "subscriptionPrice": 5 },
  { "productTypes": ["thongs", "womens"],           "code": "10DolMatchingThongWomensSub",       "subscriptionPrice": 5 },
  { "productTypes": ["thongs", "women's boxer"],    "code": "10DolMatchingThongWomensBoxerSub",  "subscriptionPrice": 5 },
  { "productTypes": ["womens", "womens"],           "code": "10DolMatchingWomensWomensSub",      "subscriptionPrice": 5 },
  { "productTypes": ["womens", "women's boxer"],    "code": "10DolMatchingWomensWomensBoxerSub", "subscriptionPrice": 5 },
  { "productTypes": ["womens - boxer", "women's - boxer"], "code": "10DolMatchingWomensBoxerWomensBoxerSub", "subscriptionPrice": 5 }
]
```

---

## Step 3: Deploy the Liquid snippet

Copy `snippets/utm-discount-config.liquid` to your theme. It reads the metafields and
outputs a `window.SHINESTY_DISCOUNT_CONFIG` global before `utm-discount.js` loads.

Include it in `layout/theme.liquid` **above** the `{%- render 'utm-discount' -%}` line:

```liquid
{%- render 'utm-discount-config' -%}
{%- render 'utm-discount' -%}
```

---

## Step 4: Deploy the updated `utm-discount.js`

The script now reads configs from `window.SHINESTY_DISCOUNT_CONFIG` first,
falling back to the hardcoded values if the metafield is empty or not yet populated.
No change needed to the rest of the script — only the config block at the top changes.

---

## Admin Editing Guide

To update a discount code config after launch:

1. Go to **Shopify Admin → Settings → Custom data → Shop**
2. Click the shop entry
3. Find the `Discount Code Configs` metafield
4. Edit the JSON directly — change `subscriptionPrice`, `expiresDays`, `bannerText`, or add a new swap entry
5. Save — the change is live on the next page load, no theme deployment needed

### Common edits

**Change first-month price from $5 to $6 for 5dollarsub:**
Find the object with `"discountCode": "5dollarsub"` and change `"subscriptionPrice": 5` to `"subscriptionPrice": 6`.

**Add a new product type swap:**
Add to the `productTypeSwaps` array:
```json
{ "productTypes": ["new product type"], "code": "NewShopifyDiscountCode" }
```

**Change expiry from 5 days to 7 days:**
Find the config and change `"expiresDays": 5` to `"expiresDays": 7`.

**Add a new discount code entirely:**
Add a new object to the root array following the same schema as the existing entries.
