/* Ouk Chatrang ads: one small loader shared by the game (index.html) and the static pages.
 *
 * Nothing shows, and nothing is requested from an ad network, unless ads-config.json says so:
 *   "mode":  "off"  (default) -- no ads, no layout change;  "live" -- real ads.
 *   "client": the ad network publisher id (ca-pub-...);  "slots": the ad unit id for each placement.
 *   "consent": how consent is obtained before any real ad is requested (there is no setting that skips it):
 *       "own" (default) -- live ads load only after the visitor has agreed: localStorage oukAdsConsent = "granted", set by
 *                          OukAds.setConsent(true) from a consent banner of ours. (Not enough for personalised ads in the EEA,
 *                          UK and Switzerland, which need a certified consent tool.)
 *       "cmp"           -- a certified consent management platform (for AdSense: Google's own consent message, set up under
 *                          Privacy & messaging) does it. "cmpScript" must be the https:// address of that tool's script; it is
 *                          loaded first, ads wait for it, and if it is missing or fails to load there are no ads.
 * A placement with no slot id is skipped. Add ?adspreview=1 to any address to see where the ads would go, drawn as
 * labelled sample boxes (no network, this tab only; ?adspreview=0 turns it off).
 *
 * The config and this file are never cached by the service worker (sw.js), so changing ads-config.json takes
 * effect on the next visit without an app update. Placements: "banner" (320x50, phone, while playing), "result"
 * (300x250, the game-over card), "content" (336x280, in the How to play page: <div class="adslot" data-ad="content">).
 */
(function () {
  'use strict';
  var KEY_PREVIEW = 'oukAdsPreview', KEY_CONSENT = 'oukAdsConsent';
  var cfg = { mode: 'off', client: '', consent: 'own', cmpScript: '', slots: {} };
  var cmpOk = false, ready = false, waiting = [], scriptAdded = false, renders = 0, preview = false;
  try {
    var m = /[?&]adspreview=([^&#]*)/.exec(location.search);
    if (m) { if (m[1] === '0' || m[1] === 'off') sessionStorage.removeItem(KEY_PREVIEW); else sessionStorage.setItem(KEY_PREVIEW, '1'); }
    preview = sessionStorage.getItem(KEY_PREVIEW) === '1';
  } catch (e) { preview = /[?&]adspreview=(?!0|off)/.test(location.search); }

  function consentOk() {
    if (cfg.consent === 'cmp') return cmpOk; // the certified tool's script has loaded (see loadCmp)
    try { return localStorage.getItem(KEY_CONSENT) === 'granted'; } catch (e) { return false; }
  }
  // a certified consent tool: its script is loaded before anything else, and only an https address is accepted
  function loadCmp(next) {
    if (cfg.consent !== 'cmp' || cfg.mode !== 'live' || !/^https:\/\//.test(cfg.cmpScript || '')) { next(); return; }
    var s = document.createElement('script'); s.async = true; s.src = cfg.cmpScript;
    s.onload = function () { cmpOk = true; next(); }; s.onerror = function () { cmpOk = false; next(); };
    document.head.appendChild(s);
  }
  function mode() { return preview ? 'preview' : (cfg.mode === 'live' && cfg.client && consentOk() ? 'live' : 'off'); }
  function enabled() { return ready && mode() !== 'off'; }

  var CSS = '.oukAdSlot{display:block;text-align:center;margin:0 auto}' +
    '.oukAdSlot .oukAdLabel{display:block;font:500 10px/1.4 system-ui,sans-serif;letter-spacing:.4px;color:#8a8f9a;margin-bottom:2px}' +
    '.oukAdSlot .oukAdBox{box-sizing:border-box;margin:0 auto;max-width:100%;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;' +
    'font:600 12px/1.3 system-ui,sans-serif;color:#cfd6df;border:1px dashed #8a93a3;background:repeating-linear-gradient(135deg,#3a4150 0 12px,#343b49 12px 24px)}' +
    '.oukAdSlot .oukAdBox b{font-size:14px;color:#fff}.oukAdSlot ins{max-width:100%}';
  function addStyle() {
    if (document.getElementById('oukAdStyle')) return;
    var s = document.createElement('style'); s.id = 'oukAdStyle'; s.textContent = CSS; document.head.appendChild(s);
  }
  function sizeFor(type, w) {
    if (type === 'banner') return [320, 50];
    if (type === 'result') return (window.innerWidth || w) >= 340 ? [300, 250] : [250, 250]; // (the game-over card grows to fit it: sized from the screen)
    return w >= 346 ? [336, 280] : (w >= 310 ? [300, 250] : [250, 250]); // 'content'
  }
  function addScript() {
    if (scriptAdded) return; scriptAdded = true;
    var s = document.createElement('script'); s.async = true; s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(cfg.client);
    document.head.appendChild(s);
  }
  // fills one placement (an element), once; returns whether an ad (or sample box) was put there
  function render(el, type) {
    if (!el || el.getAttribute('data-ad-done')) return false;
    var md = mode(); if (md === 'off') return false;
    var slot = (cfg.slots || {})[type]; if (md === 'live' && !slot) return false;
    var w = el.clientWidth || (el.parentNode && el.parentNode.clientWidth) || 360, sz = sizeFor(type, w);
    addStyle(); el.setAttribute('data-ad-done', '1'); el.classList.add('oukAdSlot');
    el.style.minHeight = (sz[1] + 16) + 'px';
    var label = document.createElement('span'); label.className = 'oukAdLabel'; label.textContent = 'ការផ្សាយពាណិជ្ជកម្ម · Advertisement';
    el.appendChild(label);
    if (md === 'preview') {
      var box = document.createElement('div'); box.className = 'oukAdBox'; box.style.width = sz[0] + 'px'; box.style.height = sz[1] + 'px';
      box.innerHTML = '<b>Sample ad</b><span>' + sz[0] + ' × ' + sz[1] + ' · ' + type + '</span>'; el.appendChild(box);
    } else {
      addScript();
      var ins = document.createElement('ins'); ins.className = 'adsbygoogle'; ins.style.cssText = 'display:inline-block;width:' + sz[0] + 'px;height:' + sz[1] + 'px';
      ins.setAttribute('data-ad-client', cfg.client); ins.setAttribute('data-ad-slot', slot); el.appendChild(ins);
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* an ad blocker: nothing to show */ }
    }
    renders++;
    return true;
  }
  function fillPage() {
    var els = document.querySelectorAll('.adslot[data-ad]');
    for (var i = 0; i < els.length; i++) render(els[i], els[i].getAttribute('data-ad'));
  }
  function done() {
    ready = true;
    var q = waiting; waiting = [];
    for (var i = 0; i < q.length; i++) { try { q[i](); } catch (e) {} }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fillPage); else fillPage();
  }
  window.OukAds = {
    ready: function (cb) { if (ready) { try { cb(); } catch (e) {} } else waiting.push(cb); },
    enabled: enabled, mode: mode, render: render, cmpLoaded: function () { return cmpOk; },
    setConsent: function (granted) { try { localStorage.setItem(KEY_CONSENT, granted ? 'granted' : 'denied'); } catch (e) {} },
    renders: function () { return renders; } // (a test hook: how many placements have been filled)
  };
  // the config: always fresh from the network (a failed fetch, e.g. offline, simply means no ads)
  try {
    fetch('/ads-config.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && typeof j === 'object') cfg = Object.assign(cfg, j); }).catch(function () {}).then(function () { loadCmp(done); });
  } catch (e) { done(); }
})();
