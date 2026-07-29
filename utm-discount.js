/**
 * Shinesty UTM + Discount — Full Horizon Theme Port
 *
 * Complete port of:
 *   state/utm-store.js
 *   state/discount-code-store.ts
 *   services/discounts/static-data.ts
 *   services/discounts/swap-codes.ts
 *   services/discounts/utils.ts
 *   services/analytics/elevar.js
 *   services/analytics/shinesty.js
 *   components/LinkCheckout.js  (checkout interception + swap code application)
 *
 * URL params captured:
 *   utm_source, utm_medium, utm_campaign, utm_content, utm_term  — Elevar UTMs
 *   gclid, fbclid, irclickid, ttclid                            — Elevar click IDs
 *   discount_code, utm_discount                                  — discount (remapped to utm_discount)
 *   coupon                                                       — alias (Facebook/Meta ad flows)
 *   sscid, utm_catalog_version, shineOn                          — Shinesty UTMs
 *
 * localStorage keys written (same as storefront):
 *   utm_source, utm_medium, utm_campaign, utm_content, utm_term
 *   gclid, fbclid, irclickid, ttclid
 *   sscid, utm_catalog_version, shineOn
 *   utm_history        — JSON array of { createdAt, referrer, utms }
 *   referrer           — document.referrer on first landing
 *   shinesty-discount  — { code, expiresAt } — active discount
 *   shinesty-discount-archive — [{ code, expiresAt }] — expired/cleared codes
 */

(function () {
  'use strict';

  // ── Constants (match storefront exactly) ─────────────────────────────────────

  var ELEVAR_CLICK_IDS = ['gclid', 'fbclid', 'irclickid', 'ttclid'];
  var ELEVAR_UTMS      = ['utm_campaign', 'utm_content', 'utm_discount', 'utm_medium', 'utm_source', 'utm_term'];
  var SHINESTY_UTMS    = ['sscid', 'utm_catalog_version', 'shineOn'];
  var ALL_UTMS         = ELEVAR_CLICK_IDS.concat(ELEVAR_UTMS).concat(SHINESTY_UTMS);
  var DISCOUNT_KEYS    = ['utm_discount'];
  var REMAP            = {};
  var ELEVAR_COOKIES   = ['_ga', '_fbc', '_fbp'];

  var LS_KEY          = 'shinesty-discount';
  var ARCHIVE_KEY     = 'shinesty-discount-archive';
  var HISTORY_KEY     = 'utm_history';
  var REFERRER_KEY    = 'referrer';
  var CLIENT_ID_KEY   = 'shinesty_analytics_clientId';
  var SESSION_ID_KEY  = 'shinesty_analytics_sessionId';

  // ── Discount code configs ────────────────────────────────────────────────────
  // Loaded from window.SHINESTY_DISCOUNT_CONFIG (injected by utm-discount-config.liquid
  // via shop metafields). Falls back to hardcoded values if metafields are not yet set.

  var _mf = (window.SHINESTY_DISCOUNT_CONFIG && window.SHINESTY_DISCOUNT_CONFIG.discountCodeConfigs)
    ? window.SHINESTY_DISCOUNT_CONFIG
    : null;

  var FALLBACK_COUPLES_SWAPS = [
    { productTypes: ['mens', 'mens'],               code: '10DolMatchingBoxerBoxerSub',       subscriptionPrice: 5 },
    { productTypes: ['mens', 'thongs'],             code: '10DolMatchingBoxerThongSub',       subscriptionPrice: 5 },
    { productTypes: ['mens', 'womens'],             code: '10DolMatchingBoxerWomenSub',       subscriptionPrice: 5 },
    { productTypes: ['mens', "women's boxer"],      code: '10DolMatchingBoxerWomensBoxerSub', subscriptionPrice: 5 },
    { productTypes: ['thongs', 'thongs'],           code: '10DolMatchingThongThongSub',       subscriptionPrice: 5 },
    { productTypes: ['thongs', 'womens'],           code: '10DolMatchingThongWomensSub',      subscriptionPrice: 5 },
    { productTypes: ['thongs', "women's boxer"],    code: '10DolMatchingThongWomensBoxerSub', subscriptionPrice: 5 },
    { productTypes: ['womens', 'womens'],           code: '10DolMatchingWomensWomensSub',     subscriptionPrice: 5 },
    { productTypes: ['womens', "women's boxer"],    code: '10DolMatchingWomensWomensBoxerSub',subscriptionPrice: 5 },
    { productTypes: ['womens - boxer', "women's - boxer"], code: '10DolMatchingWomensBoxerWomensBoxerSub', subscriptionPrice: 5 },
  ];

  var FALLBACK_DISCOUNT_CODE_CONFIGS = [
    {
      bannerHref: '/pages/all-subscriptions',
      bannerText: 'Use code [discountCode] and get your first month for only [subscriptionPrice].',
      bannerTextDefault: 'Start a new subscription for [subscriptionPrice] today.',
      discountCode: '5dollarlaundrysub',
      expiresDays: 5,
      productTypeSwaps: [{ productTypes: ['laundry detergent sheets'], code: '5dollarlaundrysub' }],
      subscriptionFrequencies: ['monthly', 'bimonthly', 'quarterly'],
      subscriptionPrice: 5,
    },
    {
      bannerHref: '/pages/all-subscriptions',
      bannerText: 'Use code [discountCode] and get your first pair for only [subscriptionPrice].',
      bannerTextDefault: 'Start a new subscription for [subscriptionPrice] today.',
      bannerTextSecondary: 'Just for you: Try subscription undies for [subscriptionPrice].',
      discountCode: '5dollarsub',
      expiresDays: 5,
      productTypeSwaps: [
        { productTypes: ['bikini'],                code: '5DollarBikiniSubs' },
        { productTypes: ['boxers'],                code: '5DollarBoxerSubs' },
        { productTypes: ['boxers - brief'],        code: '5DollarBriefBoxerSubs' },
        { productTypes: ['boxers - fly'],          code: '5DollarBoxerSubs' },
        { productTypes: ['boxers - magnum pouch'], code: '5DollarBoxerSubs' },
        { productTypes: ['boxers - long - fly'],   code: '5DollarLongSubs' },
        { productTypes: ['boxers - trunk'],        code: '5DollarTrunkBoxerSubs' },
        { productTypes: ['boys underwear'],        code: '5Dollarboysboxerbriefsub' },
        { productTypes: ['boyshort'],              code: '5DollarBoyshortSubs' },
        { productTypes: ['cheeky'],                code: '5DollarCheekySubs' },
        { productTypes: ['socks - ankle'],         code: '5DollarSockSub' },
        { productTypes: ['socks - crew'],          code: '5DollarSockSub' },
        { productTypes: ['socks - quarter'],       code: '5DollarSockSub' },
        { productTypes: ['thongs'],                code: '5DollarThongSubs' },
        { productTypes: ['thongs - modal'],        code: '5DollarModalThongSubs' },
        { productTypes: ["women's boxer"],         code: '5DollarWomensBoxerSub' },
      ].concat(FALLBACK_COUPLES_SWAPS),
      subscriptionFrequencies: ['monthly'],
      subscriptionPrice: 5,
    },
    {
      bannerHref: '/pages/all-subscriptions',
      bannerText: 'Use code [discountCode] and get your first pair for only [subscriptionPrice].',
      bannerTextDefault: 'Start a new subscription for [subscriptionPrice] today.',
      bannerTextSecondary: 'Just for you: Try subscription undies for [subscriptionPrice].',
      discountCode: '10dollarsub',
      expiresDays: 3,
      overwriteBlacklist: ['5dollarsub'],
      productTypeSwaps: [
        { productTypes: ['bikini'],                code: 'NiceHamWomensSubs' },
        { productTypes: ['boxers'],                code: 'NiceHamBoxerSubs' },
        { productTypes: ['boxers - brief'],        code: 'NiceHamBoxerSubs' },
        { productTypes: ['boxers - fly'],          code: 'NiceHamBoxerSubs' },
        { productTypes: ['boxers - long - fly'],   code: 'NiceHamBoxerSubs' },
        { productTypes: ['boxers - trunk'],        code: 'NiceHamBoxerSubs' },
        { productTypes: ['boys underwear'],        code: '10Dollarboysboxerbriefsub' },
        { productTypes: ['boyshort'],              code: 'NiceHamWomensSubs' },
        { productTypes: ['cheeky'],                code: 'NiceHamWomensSubs' },
        { productTypes: ['socks - ankle'],         code: '10DollarSockSub' },
        { productTypes: ['socks - crew'],          code: '10DollarSockSub' },
        { productTypes: ['socks - quarter'],       code: '10DollarSockSub' },
        { productTypes: ['thongs'],                code: 'NiceHamThongSubs' },
        { productTypes: ['thongs - modal'],        code: 'NiceHamModalThongSubs' },
        { productTypes: ["women's boxer"],         code: 'NiceHamWomensBoxerSub' },
      ].concat(FALLBACK_COUPLES_SWAPS),
      subscriptionFrequencies: ['monthly'],
      subscriptionPrice: 10,
    },
    {
      bannerHref: '/products/black-mens-tee',
      bannerText: 'Use code [discountCode] and get your first month for only [subscriptionPrice].',
      bannerTextDefault: 'Start a new subscription for [subscriptionPrice] today.',
      bannerTextSecondary: 'Just for you: Try subscription tees for [subscriptionPrice].',
      discountCode: '10dollarteesub',
      expiresDays: 5,
      productTypeSwaps: [{ productTypes: ["men's t-shirts"], code: '10DollarTeeSub' }],
      subscriptionFrequencies: ['monthly', 'quarterly'],
      subscriptionPrice: 10,
    },
  ];

  var FALLBACK_SPECIAL_CONFIGS = [
    {
      bannerTextDefault: "Buy 5 get 2 free. Shop now & we'll apply at checkout.",
      expiresDays: 21,
      searchParams: { startsWith: 'buy5get2' },
    },
  ];

  // Active configs — metafield values merged with couples swaps when from metafields
  var COUPLES_SWAPS = _mf ? (_mf.couplesSwaps || []) : FALLBACK_COUPLES_SWAPS;

  var DISCOUNT_CODE_CONFIGS = _mf
    ? _mf.discountCodeConfigs.map(function (cfg) {
        // Append couples swaps to any config that already has productTypeSwaps
        if (cfg.productTypeSwaps && COUPLES_SWAPS.length) {
          return Object.assign({}, cfg, {
            productTypeSwaps: cfg.productTypeSwaps.concat(COUPLES_SWAPS),
          });
        }
        return cfg;
      })
    : FALLBACK_DISCOUNT_CODE_CONFIGS;

  var SPECIAL_CONFIGS = _mf ? (_mf.specialConfigs || []) : FALLBACK_SPECIAL_CONFIGS;

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function lsRead(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function lsWrite(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
  function lsRemove(k) { try { localStorage.removeItem(k); } catch (_) {} }

  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function setCookie(name, value, days) {
    var d = new Date(); d.setTime(d.getTime() + days * 864e5);
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + d.toUTCString() + '; path=/; SameSite=Lax';
  }

  function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function getClientId() {
    var id = getCookie(CLIENT_ID_KEY);
    if (!id) { id = uuidv4(); setCookie(CLIENT_ID_KEY, id, 365); }
    return id;
  }

  function getSessionId() {
    var id = getCookie(SESSION_ID_KEY);
    if (!id) { id = uuidv4(); setCookie(SESSION_ID_KEY, id, 1); }
    return id;
  }

  // ── findConfigForCode (mirrors services/discounts/utils.ts) ──────────────────

  function getConfigsWithProductTypes() {
    return DISCOUNT_CODE_CONFIGS.map(function (cfg) {
      var all = [];
      (cfg.productTypeSwaps || []).forEach(function (swap) {
        (swap.productTypes || []).forEach(function (t) {
          if (!all.includes(t)) all.push(t);
        });
      });
      return Object.assign({}, cfg, { productTypesAll: all });
    });
  }

  function findConfigForCode(discountCode, productType) {
    if (!discountCode) return null;
    if (Array.isArray(discountCode)) discountCode = discountCode[0];
    var code = discountCode.toLowerCase();
    var configs = getConfigsWithProductTypes();

    var regular = configs.find(function (cfg) {
      if (!productType) return cfg.discountCode === code;
      return cfg.productTypesAll.includes(productType.toLowerCase()) && cfg.discountCode === code;
    });
    if (regular) return regular;

    return SPECIAL_CONFIGS.find(function (cfg) {
      return cfg.searchParams && cfg.searchParams.startsWith && code.startsWith(cfg.searchParams.startsWith);
    }) || null;
  }

  // ── findSwapCode (mirrors services/discounts/swap-codes.ts) ─────────────────

  function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    var sa = a.map(function (x) { return typeof x === 'string' ? x.toLowerCase() : x; }).sort();
    var sb = b.map(function (x) { return typeof x === 'string' ? x.toLowerCase() : x; }).sort();
    for (var i = 0; i < sa.length; i++) { if (sa[i] !== sb[i]) return false; }
    return true;
  }

  function findSwap(swaps, productTypes) {
    if (!productTypes || !productTypes.length || !swaps || !swaps.length) return null;
    return swaps.find(function (s) { return arraysEqual(productTypes, s.productTypes); }) || null;
  }

  function findSwapCode(discountCode, productTypes) {
    if (!discountCode || !productTypes || !productTypes.length) return null;
    var config = findConfigForCode(discountCode);
    if (!config || !config.productTypeSwaps) return null;

    var found = findSwap(config.productTypeSwaps, productTypes);
    if (found) return found;

    // Normalise product types to category buckets (mirrors swap-codes.ts)
    var normalised = productTypes.map(function (pt) {
      if (typeof pt !== 'string') return pt;
      pt = pt.toLowerCase();
      if (['boxers', 'boxers - brief', 'boxers - fly', 'boxers - long - fly', 'boxers - trunk'].includes(pt)) return 'mens';
      if (['bikini', 'boyshort', 'cheeky', 'thongs - modal'].includes(pt)) return 'womens';
      if (['socks - ankle', 'socks - crew', 'socks - quarter'].includes(pt)) return 'socks';
      return pt;
    });
    return findSwap(config.productTypeSwaps, normalised);
  }

  // ── Discount code store (mirrors discount-code-store.ts) ─────────────────────

  function getArchived() { try { return JSON.parse(lsRead(ARCHIVE_KEY)) || []; } catch (_) { return []; } }

  function getCurrent() { try { return JSON.parse(lsRead(LS_KEY)) || null; } catch (_) { return null; } }

  function clearCurrent() {
    var cur = getCurrent();
    if (cur && cur.code) {
      var arch = getArchived();
      if (!arch.some(function (a) { return a.code === cur.code; })) {
        arch.push(cur);
        lsWrite(ARCHIVE_KEY, JSON.stringify(arch));
      }
    }
    lsRemove(LS_KEY);
  }

  function setDiscountCode(code) {
    if (!code) return;

    var archived = getArchived();
    if (archived.some(function (a) { return a.code === code; })) return; // block renewal

    var config = findConfigForCode(code) || { expiresDays: 7 };

    var existing = getCurrent();
    if (existing) {
      var isExpired = existing.expiresAt < new Date().toISOString();
      if (existing.code === code && isExpired) { clearCurrent(); return; }
      // Overwrite blacklist — if new code can't override existing
      if (config.overwriteBlacklist && config.overwriteBlacklist.includes(existing.code)) return;
    }

    var expires = new Date();
    expires.setDate(expires.getDate() + (config.expiresDays || 7));
    var entry = { code: code.toUpperCase(), expiresAt: expires.toISOString() };
    lsWrite(LS_KEY, JSON.stringify(entry));
    renderBanner(); // update banner immediately
  }

  function initDiscountCode(code) {
    if (code) { setDiscountCode(code); return; }
    // Migrate old localStorage keys (mirrors handleOldFormatDiscountCodes)
    ['shinesty_discount_code', 'utm_discount', 'shinesty_subscription_discount'].forEach(function (k) {
      var v = lsRead(k); if (v) { setDiscountCode(v); lsRemove(k); }
    });
    // Validate existing
    var cur = getCurrent();
    if (cur && cur.expiresAt < new Date().toISOString()) clearCurrent();
  }

  // ── UTM history (mirrors utm-store.js) ───────────────────────────────────────

  function cleanHistory(arr) {
    var last = '';
    return arr.filter(function (e) {
      var s = JSON.stringify(e.utms);
      if (s === last) return false;
      last = s; return true;
    });
  }

  function updateUtmHistory(params) {
    var parsed = [];
    try { parsed = JSON.parse(lsRead(HISTORY_KEY)) || []; } catch (_) {}
    if (!Array.isArray(parsed)) parsed = [];
    parsed.push({ createdAt: new Date().toISOString(), referrer: lsRead(REFERRER_KEY) || '', utms: params });
    lsWrite(HISTORY_KEY, JSON.stringify(cleanHistory(parsed)));
  }

  // ── URL capture ──────────────────────────────────────────────────────────────

  function captureFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var query = {};
    params.forEach(function (v, k) { query[k] = v; });

    // Save referrer
    if (document.referrer) lsWrite(REFERRER_KEY, document.referrer);

    // Clear Elevar params if new campaign arrives
    var elevarAll = ELEVAR_CLICK_IDS.concat(ELEVAR_UTMS);
    var hasNewElevar = elevarAll.some(function (k) { return query[k]; });
    if (hasNewElevar) ALL_UTMS.forEach(function (k) { lsRemove(k); });

    var validUtms = {};
    Object.keys(query).forEach(function (key) {
      if (!ALL_UTMS.includes(key)) return;
      var val = Array.isArray(query[key]) ? query[key][0] : query[key];
      if (!DISCOUNT_KEYS.includes(key)) lsWrite(key, val);
      var remapped = REMAP[key] || key;
      validUtms[remapped] = val;
    });

    if (Object.keys(validUtms).length) updateUtmHistory(validUtms);

    // coupon= param mirrors /meta-checkout ?coupon= flow
    var coupon = (query.coupon || validUtms.utm_discount || '').trim().toUpperCase() || null;
    initDiscountCode(coupon);

    // Strip discount params from address bar
    var stripped = false;
    ['utm_discount', 'coupon'].forEach(function (k) {
      if (params.has(k)) { params.delete(k); stripped = true; }
    });
    if (stripped) {
      var qs = params.toString();
      history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);
    }
  }

  // ── Cart attributes (mirrors elevar.js + shinesty.js) ───────────────────────

  function getUtmParams(type) {
    var keys = type === 'elevar' ? ELEVAR_CLICK_IDS.concat(ELEVAR_UTMS)
             : type === 'shinesty' ? SHINESTY_UTMS
             : ALL_UTMS;
    return keys.reduce(function (acc, k) { var v = lsRead(k); if (v) acc[k] = v; return acc; }, {});
  }

  function getElevarCookies() {
    return ELEVAR_COOKIES.reduce(function (acc, k) { var v = getCookie(k); if (v) acc[k] = v; return acc; }, {});
  }

  function buildCartAttributes() {
    var attrs = {};
    // _elevar_visitor_info
    attrs['_elevar_visitor_info'] = JSON.stringify(Object.assign({ referrer: lsRead(REFERRER_KEY) || '' }, getUtmParams('elevar')));
    // _elevar_<cookie>
    var cookies = getElevarCookies();
    Object.keys(cookies).forEach(function (k) { attrs['_elevar_' + k] = cookies[k]; });
    // _shinesty_info
    attrs['_shinesty_info'] = JSON.stringify(Object.assign({
      shinestyClientId:  getClientId(),
      shinestySessionId: getSessionId(),
      shinestyOrderId:   uuidv4(),
    }, getUtmParams('shinesty')));
    // _utm_history
    var h = lsRead(HISTORY_KEY);
    if (h) attrs['_utm_history'] = h;
    return attrs;
  }

  function updateCartAttributes(attrsObj) {
    var pairs = Object.keys(attrsObj).map(function (k) { return { key: k, value: attrsObj[k] }; });
    return fetch('/cart/update.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ attributes: pairs }),
    }).then(function (r) { return r.json(); });
  }

  // ── Swap code resolution (mirrors LinkCheckout.js getCartDiscountCode) ───────

  function getCartContents() {
    return fetch('/cart.js', { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); });
  }

  function resolveSwapCode(storedCode, cartItems) {
    // Find subscription line items (have selling_plan set)
    var subItems = cartItems.filter(function (item) { return item.selling_plan_allocation; });
    if (!subItems.length) return storedCode; // no subscriptions → use raw code

    // Group by product type, accumulate price to find highest-value subscription
    var typesByValue = {};
    subItems.forEach(function (item) {
      var pt = (item.product_type || '').toLowerCase();
      var price = item.line_price || 0;
      if (!typesByValue[pt]) typesByValue[pt] = { productType: pt, value: 0 };
      typesByValue[pt].value += price;
    });

    var sorted = Object.values(typesByValue).sort(function (a, b) { return b.value - a.value; });
    var productTypes = sorted.map(function (e) { return e.productType; });

    var swap = findSwapCode(storedCode, productTypes);
    return swap ? swap.code : storedCode;
  }

  // ── Apply discount cookie via silent iframe (then redirect to checkout) ───────

  function applyDiscountAndCheckout(code, checkoutUrl) {
    return new Promise(function (resolve) {
      var iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = '/discount/' + encodeURIComponent(code) + '?redirect=/';
      var done = false;
      function finish() { if (done) return; done = true; document.body.removeChild(iframe); resolve(); }
      iframe.onload = finish;
      iframe.onerror = finish;
      setTimeout(finish, 3000);
      document.body.appendChild(iframe);
    }).then(function () {
      clearCurrent();
      window.location = checkoutUrl || '/checkout';
    });
  }

  // ── Checkout interception ────────────────────────────────────────────────────

  function attachCheckoutInterceptor() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('button#checkout, button[name="checkout"], .cart__checkout-button');
      if (!btn) return;

      // Always push cart attributes (fire-and-forget)
      updateCartAttributes(buildCartAttributes());

      var cur = getCurrent();
      if (!cur || cur.expiresAt < new Date().toISOString()) return; // no valid code

      e.preventDefault();
      e.stopImmediatePropagation();

      var originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'Applying…';

      getCartContents()
        .then(function (cart) {
          var swapCode = resolveSwapCode(cur.code, cart.items || []);
          var checkoutUrl = cart.checkout_url || '/checkout';
          return applyDiscountAndCheckout(swapCode, checkoutUrl);
        })
        .catch(function () {
          btn.disabled = false;
          btn.innerHTML = originalHtml;
          window.location = '/checkout';
        });
    }, true);
  }

  // ── Auto-fill cart discount input (cart page / drawer) ───────────────────────

  function tryAutoFill() {
    var cur = getCurrent();
    if (!cur || cur.expiresAt < new Date().toISOString()) return;

    document.querySelectorAll('cart-discount-component').forEach(function (component) {
      var input = component.querySelector('input[name="discount"]');
      var form  = component.querySelector('form');
      if (!input || !form) return;
      var applied = Array.from(component.querySelectorAll('[data-discount-code]'))
        .map(function (el) { return (el.dataset.discountCode || '').toUpperCase(); });
      if (applied.includes(cur.code)) return;
      input.value = cur.code;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
  }

  // ── Discount banner ──────────────────────────────────────────────────────────

  function formatBannerText(text, config) {
    if (!text || !config) return '';
    return text
      .replace(/\[discountCode\]/g, config.discountCode ? config.discountCode.toUpperCase() : '')
      .replace(/\[subscriptionPrice\]/g, config.subscriptionPrice ? '$' + config.subscriptionPrice : '');
  }

  function renderBanner() {
    var banner = document.getElementById('utm-discount-banner');
    if (!banner) return;

    var cur = getCurrent();
    if (!cur || cur.expiresAt < new Date().toISOString()) {
      banner.hidden = true;
      return;
    }

    var config = findConfigForCode(cur.code);
    if (!config) { banner.hidden = true; return; }

    var text = formatBannerText(config.bannerText || config.bannerTextDefault, config);
    if (!text) { banner.hidden = true; return; }

    var msgEl = banner.querySelector('.utm-banner__text');
    var linkEl = banner.querySelector('.utm-banner__link');
    if (msgEl) msgEl.textContent = text;
    if (linkEl && config.bannerHref) {
      linkEl.href   = config.bannerHref;
      linkEl.hidden = false;
    }
    banner.hidden = false;
  }

  // ── Collection page subscription price badge ─────────────────────────────────

  function injectCollectionPrices() {
    var cur = getCurrent();
    if (!cur || cur.expiresAt < new Date().toISOString()) return;

    var config = findConfigForCode(cur.code);
    if (!config || !config.subscriptionPrice) return;

    // Collection pages use resource-card; product pages use product-card
    var selectors = [
      '.resource-card[data-resource-type="product"]',
      'product-card[data-product-type]',
    ];

    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (card) {
        if (card.querySelector('.utm-sub-price')) return;

        var productType = (card.dataset.productType || '').toLowerCase();
        var requiresSelling = card.dataset.requiresSellingPlan === 'true';

        var hasSwap = (config.productTypeSwaps || []).some(function (swap) {
          return swap.productTypes.some(function (t) {
            return t.toLowerCase() === productType;
          });
        });

        if (!hasSwap && !requiresSelling) return;

        var priceContainer = card.querySelector('[ref="priceContainer"]');
        var target = priceContainer || card.querySelector('.resource-card__content');
        if (!target) return;

        var badge = document.createElement('div');
        badge.className = 'utm-sub-price';
        badge.textContent = 'Subscribe — first month $' + config.subscriptionPrice;
        target.appendChild(badge);
      });
    });

    // SearchSpring grid — cards rendered as <a class="group block"> inside #ss-collection-page
    var ssSection = document.getElementById('ss-collection-page');
    if (ssSection) {
      ssSection.querySelectorAll('a.group.block').forEach(function (card) {
        if (card.querySelector('.utm-sub-price')) return;
        // Find the content area below the image (contains price)
        var priceRow = card.querySelector('[class*="mt-1"][class*="flex"][class*="items-center"]');
        if (!priceRow) return;
        var badge = document.createElement('div');
        badge.className = 'utm-sub-price';
        badge.textContent = 'Subscribe — first month $' + config.subscriptionPrice;
        priceRow.parentElement.appendChild(badge);
      });
    }
  }

  // ── Clear on thank-you ────────────────────────────────────────────────────────

  function clearOnThankYou() {
    var p = window.location.pathname;
    if (p.indexOf('/thank_you') !== -1 || p.indexOf('/orders/') !== -1) clearCurrent();
  }

  // ── Observe DOM for cart drawer ───────────────────────────────────────────────

  function observeCart() {
    var obs = new MutationObserver(function () {
      tryAutoFill();
      injectCollectionPrices();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { obs.disconnect(); }, 30000);
  }

  // ── Expose public API for Liquid snippets ─────────────────────────────────────

  window.ShinestyUTM = {
    getCurrentCode:    getCurrent,
    setDiscountCode:   setDiscountCode,
    findConfigForCode: findConfigForCode,
    renderBanner:      renderBanner,
  };

  // ── Init ──────────────────────────────────────────────────────────────────────

  captureFromUrl();
  clearOnThankYou();

  function onReady() {
    renderBanner();
    attachCheckoutInterceptor();
    tryAutoFill();
    observeCart();
    injectCollectionPrices();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

  document.addEventListener('shopify:section:load',  tryAutoFill);
  document.addEventListener('cart:updated',          function () { tryAutoFill(); renderBanner(); });
  document.addEventListener('cart-drawer:open',      tryAutoFill);

})();
