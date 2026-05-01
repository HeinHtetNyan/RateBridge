import { I18N } from './i18n.js';

// In dev Vite proxies /api → backend (no CORS). In prod use the full URL from env.
const API_BASE = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const ensureHttps = (url) => url && !url.startsWith('http') ? 'https://' + url : url;
const GITHUB_URL    = ensureHttps(import.meta.env.VITE_GITHUB_URL)   || '#';
const LINKEDIN_URL  = ensureHttps(import.meta.env.VITE_LINKEDIN_URL) || '#';

// State
const state = {
  rates: null,
  from: 'MMK',
  to: 'THB',
  amount: '',
  userRate: '',
  rateMode: 'thb_per_100k', // 'thb_per_100k' | 'mmk_per_thb'
  backendOnline: false,
  currentLang: localStorage.getItem('ratebridge-lang') || 'EN',
  history: { usd_thb: [], usd_mmk: [], thb_mmk: [], usd_eur: [] },
  lastResult: null,
  quoteLog: [],
  debounceTimer: null,
  ratesInterval: null,
};

// DOM refs
const $ = (id) => document.getElementById(id);

const el = {
  clockMM:      $('clock-mm'),
  clockBKK:     $('clock-bkk'),
  clockUTC:     $('clock-utc'),
  statusPill:   $('status-pill'),
  statusDot:    $('status-dot'),
  statusLabel:  $('status-label'),
  mobilePill:   $('mobile-status-pill'),
  mobileDot:    $('mobile-status-dot'),
  mobileLabel:  $('mobile-status-label'),
  fromPicker:   $('from-picker'),
  toPicker:     $('to-picker'),
  amount:       $('amount'),
  amountCcy:    $('amount-currency'),
  swapBtn:      $('swap-btn'),
  quickAmounts: $('quick-amounts'),
  resultMain:      $('result-main'),
  resultCcy:       $('result-ccy'),
  resultSecondary: $('result-secondary'),
  resultError:     $('result-error'),
  rateApplied:  $('rate-applied-text'),
  copyBtn:      $('secure-btn'),
  copyLabel:    $('copy-label'),
  p2pHint:      $('p2p-hint'),
  p2pText:      $('p2p-text'),
  cbmWarning:   $('cbm-warning'),
  loadingDot:   $('rates-loading-indicator'),
  ratesUpdated: $('rates-updated'),
  lastSync:     $('last-sync'),
  quoteLog:     $('quote-log'),
  quoteEmpty:   $('quote-log-empty'),
  mobileMenu:   $('mobile-menu'),
  menuBtn:      $('mobile-menu-btn'),
  menuClose:    $('mobile-menu-close'),
  toast:        $('toast'),
  toastIcon:    $('toast-icon'),
  toastMsg:     $('toast-msg'),
  // ticker
  tickValUsdThb: $('tick-val-usd-thb'),
  tickValUsdMmk: $('tick-val-usd-mmk'),
  tickValThbMmk: $('tick-val-thb-mmk'),
  tickValUsdEur: $('tick-val-usd-eur'),
  tickChgUsdThb: $('tick-chg-usd-thb'),
  tickChgUsdMmk: $('tick-chg-usd-mmk'),
  tickChgThbMmk: $('tick-chg-thb-mmk'),
  tickChgUsdEur: $('tick-chg-usd-eur'),
  sparkTickUsdThb: $('spark-tick-usd-thb'),
  sparkTickUsdMmk: $('spark-tick-usd-mmk'),
  sparkTickThbMmk: $('spark-tick-thb-mmk'),
  sparkTickUsdEur: $('spark-tick-usd-eur'),
  // ref rates
  refValUsdThb: $('ref-val-usd-thb'),
  refValUsdMmk: $('ref-val-usd-mmk'),
  refValThbMmk: $('ref-val-thb-mmk'),
  refValUsdEur: $('ref-val-usd-eur'),
  refChgUsdThb: $('ref-chg-usd-thb'),
  refChgUsdMmk: $('ref-chg-usd-mmk'),
  refChgThbMmk: $('ref-chg-thb-mmk'),
  refChgUsdEur: $('ref-chg-usd-eur'),
  refBadgeUsdThb: $('ref-badge-usd-thb'),
  refBadgeUsdMmk: $('ref-badge-usd-mmk'),
  refBadgeThbMmk: $('ref-badge-thb-mmk'),
  refBadgeUsdEur: $('ref-badge-usd-eur'),
  refSrcUsdThb: $('ref-src-usd-thb'),
  refSrcUsdEur: $('ref-src-usd-eur'),
  refSrcUsdMmk: $('ref-src-usd-mmk'),
  refSrcThbMmk: $('ref-src-thb-mmk'),
  footerSources: $('footer-sources'),
  sparkRefUsdThb: $('spark-ref-usd-thb'),
  sparkRefUsdMmk: $('spark-ref-usd-mmk'),
  sparkRefThbMmk: $('spark-ref-thb-mmk'),
  sparkRefUsdEur: $('spark-ref-usd-eur'),
  themeToggle:  $('theme-toggle'),
  themeIcon:    $('theme-icon'),
  githubLink:   $('github-link'),
  linkedinLink: $('linkedin-link'),
  userRateSection: $('user-rate-section'),
  userRateInput:   $('user-rate'),
  userRateUnit:    $('user-rate-unit'),
  userRateSuffix:  $('user-rate-suffix'),
  rateModeBtn:     $('rate-mode-btn'),
  rateModeLabel:   $('rate-mode-label'),
  derivedRate:     $('derived-rate'),
};

// Theme
const MOON_SVG = `<path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
const SUN_SVG  = `<circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5.22 5.22l1.42 1.42M17.36 17.36l1.42 1.42M17.36 6.64l-1.42 1.42M6.64 17.36l-1.42 1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;

function initTheme() {
  const saved = localStorage.getItem('rb-theme') || 'light';
  applyTheme(saved, false);
}

function applyTheme(theme, save = true) {
  document.documentElement.setAttribute('data-theme', theme);
  if (save) localStorage.setItem('rb-theme', theme);
  const isDark = theme === 'dark';
  if (el.themeIcon) el.themeIcon.innerHTML = isDark ? MOON_SVG : SUN_SVG;
  if (el.themeToggle) el.themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// Bootstrap
initTheme();
if (el.githubLink)   el.githubLink.href   = GITHUB_URL;
if (el.linkedinLink) el.linkedinLink.href = LINKEDIN_URL;
// Clear inputs on every load — browsers restore form values on refresh
el.amount.value = '';
if (el.userRateInput) el.userRateInput.value = '';
applyLanguage(state.currentLang);
setupPickerListeners();
setupListeners();
updateUserRateVisibility();   // show rate input immediately, before rates load
startClock();
fetchRates();
state.ratesInterval = setInterval(fetchRates, 60_000);

// Sparkline
function drawSparkline(svgEl, data, color, fill = true) {
  if (!svgEl || !data || data.length < 2) return;
  const w = svgEl.viewBox.baseVal.width;
  const h = svgEl.viewBox.baseVal.height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [
    i * step,
    h - ((v - min) / span) * (h - 4) - 2,
  ]);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${d} L${w},${h} L0,${h} Z`;
  const last = pts[pts.length - 1];
  svgEl.innerHTML = `
    ${fill ? `<path d="${area}" fill="${color}" fill-opacity="0.08"/>` : ''}
    <path d="${d}" fill="none" stroke="${color}" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.2" fill="${color}"/>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="5" fill="${color}" fill-opacity="0.15">
      <animate attributeName="r" values="2;6;2" dur="2.2s" repeatCount="indefinite"/>
      <animate attributeName="fill-opacity" values="0.25;0;0.25" dur="2.2s" repeatCount="indefinite"/>
    </circle>`;
}

function seedHistory(seed, len = 60, vol = 0.003) {
  let v = seed;
  let r = 0.731;
  const out = [];
  for (let i = 0; i < len; i++) {
    r = (r * 9301 + 49297) % 233280;
    const noise = ((r / 233280) - 0.5) * vol * seed;
    const pull = (seed - v) * 0.05;
    v += noise + pull;
    out.push(v);
  }
  return out;
}

// Number format
function fmtNum(n, dec = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

function fmtCompact(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 10_000)    return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

// Animated counter
function animateValue(el, target, dec) {
  const prev = parseFloat(el.dataset.target) || target;
  el.dataset.target = target;
  const start = performance.now();
  const from = prev;
  const dur = 360;
  const tick = (now) => {
    const t = Math.min(1, (now - start) / dur);
    const e = 1 - Math.pow(1 - t, 3);
    el.textContent = fmtNum(from + (target - from) * e, dec);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// Clock
function startClock() {
  const fmt = (tz) => new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: tz,
  });
  const tick = () => {
    if (el.clockMM)  el.clockMM.textContent  = fmt('Asia/Yangon');
    if (el.clockBKK) el.clockBKK.textContent = fmt('Asia/Bangkok');
    if (el.clockUTC) el.clockUTC.textContent = fmt('UTC');
  };
  tick();
  setInterval(tick, 1000);
}

// Fetch rates from backend
async function fetchRates() {
  el.loadingDot.classList.remove('is-hidden');
  try {
    const res  = await fetch(`${API_BASE}/api/rates`);
    const data = await res.json();
    state.rates = data;

    // seed history on first fetch
    if (state.history.usd_thb.length === 0) {
      state.history.usd_thb = seedHistory(data.usd_to_thb, 56, 0.003);
      state.history.usd_mmk = seedHistory(data.usd_to_mmk, 56, 0.006);
      state.history.thb_mmk = seedHistory(data.thb_to_mmk, 56, 0.005);
      if (data.usd_to_eur) state.history.usd_eur = seedHistory(data.usd_to_eur, 56, 0.003);
    } else {
      state.history.usd_thb = [...state.history.usd_thb.slice(1), data.usd_to_thb];
      state.history.usd_mmk = [...state.history.usd_mmk.slice(1), data.usd_to_mmk];
      state.history.thb_mmk = [...state.history.thb_mmk.slice(1), data.thb_to_mmk];
      if (data.usd_to_eur) {
        if (state.history.usd_eur.length === 0) {
          state.history.usd_eur = seedHistory(data.usd_to_eur, 56, 0.003);
        } else {
          state.history.usd_eur = [...state.history.usd_eur.slice(1), data.usd_to_eur];
        }
      }
    }

    setBackendStatus(true);
    updateTicker();
    updateRefRates(data);
    updateLastSync(data.updated_at);
    calculate();
  } catch (err) {
    console.error('fetchRates failed:', err);
    setBackendStatus(false);
    showRatesError();
  } finally {
    el.loadingDot.classList.add('is-hidden');
  }
}

// Ticker rail update
function updateTicker() {
  const { usd_thb, usd_mmk, thb_mmk, usd_eur } = state.history;
  const rates = state.rates;

  const chgPct = (series) => {
    if (series.length < 2) return 0;
    return ((series[series.length - 1] - series[0]) / series[0]) * 100;
  };

  const setCellChange = (el, pct) => {
    const pos = pct >= 0;
    el.className = `ticker-change ${pos ? 'pos' : 'neg'}`;
    el.textContent = `${pos ? '▲' : '▼'} ${Math.abs(pct).toFixed(2)}%`;
  };

  animateValue(el.tickValUsdThb, rates.usd_to_thb, 4);
  animateValue(el.tickValUsdMmk, rates.usd_to_mmk, 0);
  animateValue(el.tickValThbMmk, rates.thb_to_mmk, 3);
  if (rates.usd_to_eur) animateValue(el.tickValUsdEur, rates.usd_to_eur, 4);

  setCellChange(el.tickChgUsdThb, chgPct(usd_thb));
  setCellChange(el.tickChgUsdMmk, chgPct(usd_mmk));
  setCellChange(el.tickChgThbMmk, chgPct(thb_mmk));
  if (usd_eur.length > 1) setCellChange(el.tickChgUsdEur, chgPct(usd_eur));

  const accent = '#5ce1a8';
  drawSparkline(el.sparkTickUsdThb, usd_thb, accent);
  drawSparkline(el.sparkTickUsdMmk, usd_mmk, '#ffb86b');
  drawSparkline(el.sparkTickThbMmk, thb_mmk, '#7ad7ff');
  drawSparkline(el.sparkTickUsdEur, usd_eur, '#c084fc');
}

// Reference rates update
function updateRefRates(data) {
  const { usd_thb, usd_mmk, thb_mmk, usd_eur } = state.history;

  const chgPct = (series) => {
    if (series.length < 2) return 0;
    return ((series[series.length - 1] - series[0]) / series[0]) * 100;
  };

  const setRow = (valEl, chgEl, badgeEl, sparkEl, value, dec, series, color) => {
    animateValue(valEl, value, dec);
    const pct = chgPct(series);
    const pos = pct >= 0;
    chgEl.className = `ref-rate-chg ${pos ? 'pos' : 'neg'}`;
    chgEl.textContent = `${pos ? '▲' : '▼'} ${Math.abs(pct).toFixed(2)}%`;
    badgeEl.className = `ref-badge ${pos ? 'pos' : 'neg'}`;
    badgeEl.textContent = pos ? 'BID' : 'ASK';
    drawSparkline(sparkEl, series, pos ? '#5ce1a8' : '#ff6b8a');
  };

  setRow(el.refValUsdThb, el.refChgUsdThb, el.refBadgeUsdThb, el.sparkRefUsdThb,
    data.usd_to_thb, 4, usd_thb, '#5ce1a8');

  setRow(el.refValUsdMmk, el.refChgUsdMmk, el.refBadgeUsdMmk, el.sparkRefUsdMmk,
    data.usd_to_mmk, 0, usd_mmk, '#ffb86b');

  setRow(el.refValThbMmk, el.refChgThbMmk, el.refBadgeThbMmk, el.sparkRefThbMmk,
    data.thb_to_mmk, 3, thb_mmk, '#7ad7ff');

  if (data.usd_to_eur && usd_eur.length > 1) {
    setRow(el.refValUsdEur, el.refChgUsdEur, el.refBadgeUsdEur, el.sparkRefUsdEur,
      data.usd_to_eur, 4, usd_eur, '#c084fc');
  }

  // source labels
  const mmkSrc   = data.mmk_source;
  const fiatLabel = data.fiat_source === 'airwallex' ? 'Airwallex' : 'Frankfurter';
  el.refSrcUsdThb.textContent = fiatLabel;
  el.refSrcUsdEur.textContent = fiatLabel;
  if (mmkSrc === 'myanmar_market') {
    el.refSrcUsdMmk.textContent = 'Myanmar Market';
    el.refSrcThbMmk.textContent = 'Myanmar Market';
  } else if (mmkSrc === 'cbm_official') {
    el.refSrcUsdMmk.textContent = 'CBM Official';
    el.refSrcThbMmk.textContent = 'CBM Official';
  } else {
    el.refSrcUsdMmk.textContent = 'Binance P2P';
    el.refSrcThbMmk.textContent = 'Derived';
  }

  // footer sources
  const mmkLabel = mmkSrc === 'myanmar_market' ? 'Myanmar Market' : mmkSrc === 'cbm_official' ? 'CBM' : 'Binance P2P';
  if (el.footerSources) el.footerSources.textContent = `${fiatLabel}, ${mmkLabel}`;

  // rates updated timestamp
  el.ratesUpdated.textContent = timeAgo(data.updated_at);
}

function updateLastSync(isoString) {
  if (!isoString || !el.lastSync) return;
  el.lastSync.textContent = new Date(isoString).toTimeString().slice(0, 8);
}

function showRatesError() {
  [el.refValUsdThb, el.refValUsdMmk, el.refValThbMmk, el.refValUsdEur,
   el.tickValUsdThb, el.tickValUsdMmk, el.tickValThbMmk, el.tickValUsdEur].forEach((n) => {
    if (n) n.textContent = '—';
  });
}

// Status
function setBackendStatus(online) {
  state.backendOnline = online;
  const statusText = online ? t('statusLive') : t('statusOffline');

  [el.statusPill, el.mobilePill].forEach((p) => {
    if (!p) return;
    p.classList.toggle('is-offline', !online);
  });

  if (el.statusLabel) el.statusLabel.textContent = statusText;
  if (el.mobileLabel) el.mobileLabel.textContent = statusText;
}

// Conversion (client-side)
function getRateFromTo(fromCcy, toCcy, usdToThb, usdToEur, mmkPerThb) {
  if (fromCcy === toCcy) return 1;
  const eurToThb = usdToThb / usdToEur;
  if (toCcy === 'USD') {
    if (fromCcy === 'THB') return 1 / usdToThb;
    if (fromCcy === 'MMK') return 1 / (usdToThb * mmkPerThb);
    if (fromCcy === 'EUR') return 1 / usdToEur;
  }
  if (toCcy === 'THB') {
    if (fromCcy === 'USD') return usdToThb;
    if (fromCcy === 'MMK') return 1 / mmkPerThb;
    if (fromCcy === 'EUR') return eurToThb;
  }
  if (toCcy === 'EUR') {
    if (fromCcy === 'USD') return usdToEur;
    if (fromCcy === 'THB') return 1 / eurToThb;
    if (fromCcy === 'MMK') return 1 / (eurToThb * mmkPerThb);
  }
  if (toCcy === 'MMK') {
    if (fromCcy === 'USD') return usdToThb * mmkPerThb;
    if (fromCcy === 'THB') return mmkPerThb;
    if (fromCcy === 'EUR') return eurToThb * mmkPerThb;
  }
  return null;
}

function calculate() {
  if (!state.rates) return;

  const amount = parseFloat(state.amount);
  const from = state.from;
  const to = state.to;
  const involvesMMK = from === 'MMK' || to === 'MMK';

  updateUserRateVisibility();

  const clearResult = () => {
    el.resultMain.textContent = '—';
    el.rateApplied.textContent = '—';
    el.resultError.classList.add('is-hidden');
    el.resultSecondary.classList.add('is-hidden');
    el.copyBtn.disabled = true;
  };

  if (!amount || amount <= 0 || from === to) {
    clearResult();
    updateHints();
    return;
  }

  const rates = state.rates;
  const usdToThb = rates.usd_to_thb;
  const usdToEur = rates.usd_to_eur;

  // Resolve MMK per THB from user's input rate
  let mmkPerThb;
  if (involvesMMK) {
    const ur = parseFloat(state.userRate);
    if (!ur || ur <= 0) {
      clearResult();
      el.resultError.textContent = t('resultEnterRate');
      el.resultError.classList.remove('is-hidden');
      updateHints();
      return;
    }
    mmkPerThb = state.rateMode === 'thb_per_100k' ? 100000 / ur : ur;
  }

  const rate   = getRateFromTo(from, to, usdToThb, usdToEur, mmkPerThb);
  const result = amount * rate;
  const inv    = 1 / rate;

  const toDecimals = to === 'MMK' ? 0 : (to === 'USD' ? 4 : 2);
  animateValue(el.resultMain, result, toDecimals);
  el.resultCcy.textContent = to;

  // Secondary: all remaining currencies; skip MMK unless we already have mmkPerThb
  const secondaryCcys = ['THB', 'USD', 'EUR', 'MMK']
    .filter(c => c !== from && c !== to)
    .filter(c => c !== 'MMK' || involvesMMK);
  const parts = secondaryCcys.map((ccy) => {
    const r = getRateFromTo(from, ccy, usdToThb, usdToEur, mmkPerThb);
    if (!r) return '';
    const val = amount * r;
    const dec = ccy === 'MMK' ? 0 : ccy === 'USD' ? 4 : 2;
    return `<span class="result-sec-prefix">≈</span><span class="result-sec-value"> ${fmtNum(val, dec)}</span> <span class="result-sec-ccy">${ccy}</span>`;
  }).filter(Boolean);
  if (parts.length > 0) {
    el.resultSecondary.innerHTML = parts.join('<span class="result-sec-sep"> · </span>');
    el.resultSecondary.classList.remove('is-hidden');
  } else {
    el.resultSecondary.classList.add('is-hidden');
  }

  const fromDec = from === 'MMK' ? 0 : 4;
  const invDec  = to === 'MMK' ? 0 : (to === 'USD' ? 6 : 4);
  el.rateApplied.innerHTML =
    `1 ${from} = <span class="rate-val">${fmtNum(rate, fromDec)}</span> ${to}` +
    `<span class="rate-sep">·</span>` +
    `1 ${to} = <span class="rate-val">${fmtNum(inv, invDec)}</span> ${from}`;

  el.resultError.classList.add('is-hidden');
  state.lastResult = { amount, from, to, result, rate };
  el.copyBtn.disabled = false;

  updateDerivedRate();
  updateHints();
}

function updateUserRateVisibility() {
  if (!el.userRateSection) return;
  const involvesMMK = state.from === 'MMK' || state.to === 'MMK';
  el.userRateSection.classList.toggle('is-hidden', !involvesMMK);
  if (involvesMMK) updateDerivedRate();
}

function updateDerivedRate() {
  if (!el.derivedRate) return;
  const ur = parseFloat(state.userRate);
  if (!(ur > 0)) {
    el.derivedRate.textContent = state.rateMode === 'thb_per_100k' ? '1 THB ≈ — MMK' : '100k MMK ≈ — THB';
    return;
  }
  if (state.rateMode === 'thb_per_100k') {
    el.derivedRate.textContent = `1 THB ≈ ${fmtNum(100000 / ur, 2)} MMK`;
  } else {
    el.derivedRate.textContent = `100k MMK ≈ ${fmtNum(100000 / ur, 2)} THB`;
  }
}

function toggleRateMode() {
  const ur = parseFloat(state.userRate);
  state.rateMode = state.rateMode === 'thb_per_100k' ? 'mmk_per_thb' : 'thb_per_100k';
  const isThbMode = state.rateMode === 'thb_per_100k';

  if (ur > 0) {
    const converted = parseFloat((100000 / ur).toFixed(2));
    state.userRate = String(converted);
    el.userRateInput.value = state.userRate;
  }

  if (el.userRateUnit)   el.userRateUnit.textContent   = isThbMode ? 'THB / 100k MMK' : 'MMK / 1 THB';
  if (el.userRateSuffix) el.userRateSuffix.textContent = isThbMode ? 'THB / 100k' : 'MMK / THB';
  if (el.rateModeLabel)  el.rateModeLabel.textContent  = isThbMode ? 'THB/100k' : 'MMK/THB';
  el.userRateInput.placeholder = isThbMode ? 'e.g. 780' : 'e.g. 133';
  el.userRateInput.setAttribute('aria-label', isThbMode ? 'Rate in THB per 100,000 MMK' : 'Rate in MMK per 1 THB');

  updateDerivedRate();
  calculate();
}

function updateHints() {
  const involvesMMK = state.from === 'MMK' || state.to === 'MMK';
  const mmkSource   = state.rates?.mmk_source;
  const isOfficial  = mmkSource === 'cbm_official';
  const showP2pHint = involvesMMK && mmkSource === 'binance_p2p' && state.rates;

  if (showP2pHint) {
    const thb100k = fmtNum(100000 / state.rates.thb_to_mmk, 2);
    el.p2pText.textContent = `${t('p2pHint')} · 100k MMK ≈ ${thb100k} THB`;
    el.p2pHint.classList.remove('is-hidden');
  } else {
    el.p2pHint.classList.add('is-hidden');
  }

  el.cbmWarning.classList.toggle('is-hidden', !isOfficial);
}

// Currency pickers
function setupPickerListeners() {
  el.fromPicker.querySelectorAll('[data-from]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ccy = btn.dataset.from;
      if (ccy === state.to) swapCurrencies();
      else {
        state.from = ccy;
        refreshPickers();
        el.amountCcy.textContent = ccy;
        renderQuickAmounts();
        calculate();
      }
    });
  });

  el.toPicker.querySelectorAll('[data-to]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ccy = btn.dataset.to;
      if (ccy === state.from) swapCurrencies();
      else {
        state.to = ccy;
        refreshPickers();
        el.resultCcy.textContent = ccy;
        calculate();
      }
    });
  });
}

function refreshPickers() {
  el.fromPicker.querySelectorAll('[data-from]').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.from === state.from);
    b.disabled = (b.dataset.from === state.to);
  });
  el.toPicker.querySelectorAll('[data-to]').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.to === state.to);
    b.disabled = (b.dataset.to === state.from);
  });
}

function swapCurrencies() {
  const tmp  = state.from;
  state.from = state.to;
  state.to   = tmp;

  el.swapBtn.classList.add('is-swapping');
  setTimeout(() => el.swapBtn.classList.remove('is-swapping'), 320);

  refreshPickers();
  el.amountCcy.textContent  = state.from;
  el.resultCcy.textContent  = state.to;
  renderQuickAmounts();
  calculate();
}

// Quick amounts
function renderQuickAmounts() {
  const ccy = state.from;
  const amounts = ccy === 'MMK'
    ? [50000, 100000, 500000, 1_000_000]
    : ccy === 'THB'
    ? [100, 500, 1000, 5000]
    : ccy === 'EUR'
    ? [50, 100, 500, 1000]
    : [10, 50, 100, 500];

  el.quickAmounts.innerHTML = amounts.map((a) =>
    `<button type="button" class="quick-btn" data-quick="${a}">${fmtCompact(a)} ${ccy}</button>`
  ).join('');

  el.quickAmounts.querySelectorAll('[data-quick]').forEach((b) => {
    b.addEventListener('click', () => {
      state.amount = b.dataset.quick;
      el.amount.value = b.dataset.quick;
      calculate();
    });
  });
}

// Copy quote
let copyTimer;
function copyResult() {
  if (!state.lastResult || el.copyBtn.disabled) return;
  const { amount, from, to, result, rate } = state.lastResult;
  const text = `${fmtNum(amount, 2)} ${from} = ${fmtNum(result, to === 'MMK' ? 0 : 2)} ${to}\nRate: 1 ${from} = ${fmtNum(rate, 4)} ${to}\nvia RateBridge`;

  if (!navigator.clipboard?.writeText) {
    showToast(t('toastCopyFailed'));
    return;
  }

  navigator.clipboard.writeText(text)
    .then(() => {
      el.copyBtn.classList.add('is-copied');
      el.copyLabel.textContent = t('copiedLabel');
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => {
        el.copyBtn.classList.remove('is-copied');
        el.copyLabel.textContent = t('copyResult');
      }, 1600);
      showToast(t('toastCopied'));
      addQuoteLogEntry(state.lastResult);
    })
    .catch(() => showToast(t('toastCopyFailed')));
}

// Quote log
function addQuoteLogEntry({ amount, from, to, result }) {
  const now = new Date();
  state.quoteLog.unshift({ amount, from, to, result, ts: now });
  if (state.quoteLog.length > 6) state.quoteLog.pop();
  renderQuoteLog();
}

function renderQuoteLog() {
  if (state.quoteLog.length === 0) {
    el.quoteEmpty.classList.remove('is-hidden');
    return;
  }
  el.quoteEmpty.classList.add('is-hidden');

  const existing = el.quoteLog.querySelectorAll('.quote-entry');
  existing.forEach((e) => e.remove());

  state.quoteLog.forEach(({ amount, from, to, result, ts }) => {
    const toDec = to === 'MMK' ? 0 : 2;
    const entry = document.createElement('div');
    entry.className = 'quote-entry';
    entry.innerHTML = `
      <div class="quote-line">
        <span class="quote-amounts">
          ${fmtCompact(amount)} ${from}
          <span class="quote-arrow">→</span>
          <span class="quote-result">${fmtNum(result, toDec)} ${to}</span>
        </span>
        <span class="quote-time">${relativeTime(ts)}</span>
      </div>
      <span class="quote-note">${from}/${to} · ${state.rates?.mmk_source === 'cbm_official' ? 'CBM' : 'Market'}</span>`;
    // insert newest-first (right after the empty placeholder)
    el.quoteEmpty.insertAdjacentElement('afterend', entry);
  });
}

function relativeTime(date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 5)    return 'just now';
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// Misc listeners
function setupListeners() {
  // amount input
  el.amount.addEventListener('input', () => {
    const raw = el.amount.value.replace(/[^0-9.]/g, '');
    state.amount = raw;
    clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(calculate, 280);
  });

  // swap
  el.swapBtn.addEventListener('click', swapCurrencies);

  // user rate input
  el.userRateInput?.addEventListener('input', () => {
    const raw = el.userRateInput.value.replace(/[^0-9.]/g, '');
    el.userRateInput.value = raw;
    state.userRate = raw;
    clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(() => {
      updateDerivedRate();
      calculate();
    }, 280);
  });

  // copy
  el.copyBtn.addEventListener('click', copyResult);
  el.rateModeBtn?.addEventListener('click', toggleRateMode);

  // lang buttons
  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  });

  // theme toggle
  el.themeToggle?.addEventListener('click', toggleTheme);

  // mobile menu
  el.menuBtn?.addEventListener('click', openMobileMenu);
  el.menuClose?.addEventListener('click', closeMobileMenu);
  el.mobileMenu?.addEventListener('click', (e) => {
    if (e.target === el.mobileMenu) closeMobileMenu();
  });
}

function openMobileMenu() {
  el.mobileMenu.classList.remove('is-hidden');
  el.mobileMenu.setAttribute('aria-hidden', 'false');
  el.menuBtn.setAttribute('aria-expanded', 'true');
}

function closeMobileMenu() {
  el.mobileMenu.classList.add('is-hidden');
  el.mobileMenu.setAttribute('aria-hidden', 'true');
  el.menuBtn.setAttribute('aria-expanded', 'false');
}

// i18n
function t(key, vars = {}) {
  const dict = I18N[state.currentLang] || I18N.EN;
  const base = dict[key] || I18N.EN[key] || key;
  return Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, v), base);
}

function setLanguage(code) {
  if (!I18N[code]) return;
  state.currentLang = code;
  localStorage.setItem('ratebridge-lang', code);
  applyLanguage(code);
  setBackendStatus(state.backendOnline);
  renderQuickAmounts();
  calculate();
}

function applyLanguage(code) {
  const dict = I18N[code] || I18N.EN;
  document.documentElement.lang = dict.htmlLang;

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = dict[node.dataset.i18n] || I18N.EN[node.dataset.i18n] || '';
  });

  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.lang === code);
  });

  renderQuickAmounts();
}

// Toast
let toastTimer;
function showToast(msg) {
  clearTimeout(toastTimer);
  el.toastMsg.textContent = msg;
  el.toast.classList.remove('is-hidden');
  toastTimer = setTimeout(() => el.toast.classList.add('is-hidden'), 2600);
}

// Time helpers
function timeAgo(isoString) {
  if (!isoString) return '—';
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 10)   return t('timeJustNow');
  if (diff < 60)   return t('timeSecondsAgo', { value: diff });
  if (diff < 3600) return t('timeMinutesAgo', { value: Math.floor(diff / 60) });
  return t('timeHoursAgo', { value: Math.floor(diff / 3600) });
}
