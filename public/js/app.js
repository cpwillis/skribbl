/* ===================================================
   Skribbl Solver - app.js
   Vanilla JS, no dependencies, no build step.
   =================================================== */

'use strict';

// ── In-memory caches ──────────────────────────────────────
const listCache = new Map();   // path → string[]
let manifest = [];             // [{group, name, path}]

// ── Search result pagination ─────────────────────────────
const SEARCH_PAGE_SIZE = 50;

// Pagination state for unlimited scroll
const searchPage = {
    words: [],
    rendered: 0,
};

const builderPage = {
    words: [],
    rendered: 0,
};

const customPage = {
    words: [],
    rendered: 0,
};

// ── Shared state ──────────────────────────────────────────
const appState = {
    selectedPaths: new Set(),
    pool: [],          // merged+deduped words for this selection
};

const builderState = {
    working: [],       // sliced + possibly shuffled
    shuffled: false,
};

// ── DOM refs (populated in init) ──────────────────────────
const dom = {};

// ── Utilities ─────────────────────────────────────────────
function parseWordList(rawText) {
    const trimmed = rawText.trim();
    if (!trimmed) return [];
    try {
        const obj = JSON.parse(trimmed);
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
            return Object.values(obj)
                .map(v => (typeof v === 'object' && v.word ? String(v.word).trim() : String(v).trim()))
                .filter(Boolean);
        }
        if (Array.isArray(obj)) return obj.map(String).map(s => s.trim()).filter(Boolean);
        return [];
    } catch {
        // Format C: comma/newline delimited text
        return trimmed.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    }
}

async function fetchAndParse(path) {
    if (!(LOCAL_DEVELOPMENT && local_mode) && listCache.has(path)) return listCache.get(path);
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to fetch ${path}`);
    const text = await res.text();
    const words = parseWordList(text);
    listCache.set(path, words);
    return words;
}

async function loadSelectedLists(paths) {
    if (!paths.length) return [];
    const results = await Promise.all(paths.map(fetchAndParse));
    const seen = new Set();
    const merged = [];
    for (const arr of results) {
        for (const w of arr) {
            const key = w.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                merged.push(w);
            }
        }
    }
    return merged;
}

function fisher_yates_shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function patternToRegex(raw) {
    // If it's "3 4" style (space-separated numbers), do length matching
    if (/^\s*\d+(\s+\d+)*\s*$/.test(raw)) {
        const lens = raw.trim().split(/\s+/).map(Number);
        const parts = lens.map(n => `.{${n}}`);
        return new RegExp(`^${parts.join(' ')}$`, 'i');
    }
    // Wildcard pattern: _ or ? = single char, * = any chars
    const escaped = raw.split('').map(ch => {
        if (ch === '_' || ch === '?') return '(.)';
        if (ch === '*') return '(.*)';
        return escapeRegex(ch);
    }).join('');
    return new RegExp(`^${escaped}$`, 'i');
}

// Blanks-field regex: * _ ? = single unknown char; spaces are literal word separators
function blanksToRegex(raw) {
    const escaped = raw.split('').map(ch => {
        if (ch === '*' || ch === '_' || ch === '?') return '.';
        if (ch === ' ') return ' ';
        return escapeRegex(ch);
    }).join('');
    return new RegExp(`^${escaped}$`, 'i');
}

// Derive letter-count string from a blanks pattern (e.g. "*b** **" → "4 2")
function blanksToCount(blanks) {
    if (!blanks.trim()) return '';
    return blanks.trim().split(/\s+/).map(w => w.length).join(' ');
}

// Derive blanks pattern from a letter-count string (e.g. "3 4" → "*** ****")
function countToBlanks(count) {
    const trimmed = count.trim();
    if (!trimmed || !/^\d+(\s+\d+)*$/.test(trimmed)) return '';
    return trimmed.split(/\s+/).map(n => '*'.repeat(parseInt(n, 10))).join(' ');
}

function buildWordChip(word) {
    const chip = document.createElement('span');
    chip.className = 'word-chip';
    chip.appendChild(document.createTextNode(word));
    const len = document.createElement('span');
    len.className = 'chip-len';
    len.textContent = word.replace(/ /g, '').length;
    chip.appendChild(len);
    return chip;
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function flashCopied(el) {
    const span = document.createElement('span');
    span.className = 'copied-flash';
    span.textContent = '✓ Copied!';
    el.parentNode.insertBefore(span, el.nextSibling);
    setTimeout(() => span.remove(), 2000);
}

function applyLengthFilter(words, min, max) {
    if (!min && !max) return words;
    return words.filter(w => {
        const l = w.replace(/ /g, '').length;
        if (min && l < min) return false;
        if (max && l > max) return false;
        return true;
    });
}

// ── List Picker Builder ────────────────────────────────────
function buildListPicker(containerId, state, onChangeCallback) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    const groups = {};
    for (const entry of manifest) {
        if (!groups[entry.group]) groups[entry.group] = [];
        groups[entry.group].push(entry);
    }

    for (const [group, entries] of Object.entries(groups)) {
        // Group header
        const header = document.createElement('div');
        header.className = 'picker-group-header';
        header.innerHTML = `<span>${escapeHtml(group)}</span>`;

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'group-toggle-all';
        toggleBtn.textContent = 'Select all';
        toggleBtn.dataset.group = group;
        toggleBtn.addEventListener('click', () => {
            const boxes = container.querySelectorAll(`input[data-group="${CSS.escape(group)}"]`);
            const allChecked = Array.from(boxes).every(b => b.checked);
            boxes.forEach(b => {
                b.checked = !allChecked;
                if (!allChecked) state.selectedPaths.add(b.value);
                else state.selectedPaths.delete(b.value);
            });
            toggleBtn.textContent = allChecked ? 'Select all' : 'Clear';
            onChangeCallback();
        });
        header.appendChild(toggleBtn);
        container.appendChild(header);

        for (const entry of entries) {
            const item = document.createElement('div');
            item.className = 'picker-item';

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.id = `${containerId}-${entry.path}`;
            cb.value = entry.path;
            cb.dataset.group = group;
            cb.checked = state.selectedPaths.has(entry.path);
            cb.addEventListener('change', () => {
                if (cb.checked) state.selectedPaths.add(entry.path);
                else state.selectedPaths.delete(entry.path);
                // Sync the group toggle button text
                const boxes = container.querySelectorAll(`input[data-group="${CSS.escape(group)}"]`);
                const allChecked = Array.from(boxes).every(b => b.checked);
                toggleBtn.textContent = allChecked ? 'Clear' : 'Select all';
                onChangeCallback();
            });

            const label = document.createElement('label');
            label.htmlFor = cb.id;
            label.textContent = entry.name;

            item.appendChild(cb);
            item.appendChild(label);
            container.appendChild(item);
        }
    }
}

function syncPickerCheckboxes(containerId, state) {
    const container = document.getElementById(containerId);
    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = state.selectedPaths.has(cb.value);
    });
}

// ── SHARED POOL REFRESH ──────────────────────────────────
async function refreshPool() {
    appState.pool = await loadSelectedLists([...appState.selectedPaths]);
    runSearch();
    applyBuilderPreset();
}

// ── SEARCH SECTION ─────────────────────────────────────────

function runSearch() {
    const emptyMsg = appState.pool.length
        ? 'No matches found. Try a different pattern.'
        : 'Select one or more word lists to search.';
    runPatternFilter(appState.pool, dom.searchBlanks, dom.searchMinLen, dom.searchMaxLen, blanksToRegex,
        words => renderResults(words, searchPage, dom.searchResults, dom.searchResultCount, 'match', 'matches', emptyMsg));
}

function renderResults(words, pageState, resultsEl, countEl, singular, plural, emptyMsg) {
    resultsEl.innerHTML = '';
    countEl.textContent = '';
    if (!words.length) {
        pageState.words = [];
        pageState.rendered = 0;
        const em = document.createElement('span');
        em.className = 'empty-state';
        em.textContent = emptyMsg;
        resultsEl.appendChild(em);
        return;
    }
    pageState.words = words;
    pageState.rendered = 0;
    appendPage(pageState, resultsEl, countEl, singular, plural);
}

function appendPage(state, resultsEl, countEl, singular, plural) {
    const { words, rendered } = state;
    const next = words.slice(rendered, rendered + SEARCH_PAGE_SIZE);
    const frag = document.createDocumentFragment();
    for (const w of next) frag.appendChild(buildWordChip(w));
    resultsEl.appendChild(frag);
    state.rendered += next.length;

    const noun = words.length === 1 ? singular : plural;
    if (state.rendered < words.length) {
        countEl.textContent = `Showing ${state.rendered} of ${words.length} ${noun} - scroll to load more`;
        // If the container still isn't scrollable, keep loading until it is
        if (resultsEl.scrollHeight <= resultsEl.clientHeight) {
            appendPage(state, resultsEl, countEl, singular, plural);
        }
    } else {
        countEl.textContent = `${words.length} ${noun}`;
    }
}

function runPatternFilter(pool, patternEl, minLenEl, maxLenEl, toRegexFn, onResults) {
    const pattern = patternEl.value.trim();
    const minLen = parseInt(minLenEl.value) || 0;
    const maxLen = parseInt(maxLenEl.value) || 0;
    const filtered = applyLengthFilter(pool, minLen, maxLen);
    if (!pattern) { onResults(filtered); return; }
    let regex;
    try { regex = toRegexFn(pattern); } catch { onResults([]); return; }
    onResults(filtered.filter(w => regex.test(w)));
}

function shuffleResultChips(resultsEl) {
    const chips = Array.from(resultsEl.querySelectorAll('.word-chip'));
    if (!chips.length) return;
    const shuffled = fisher_yates_shuffle(chips);
    resultsEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    shuffled.forEach(c => frag.appendChild(c));
    resultsEl.appendChild(frag);
}

function initScrollPagination(el, pageState, countEl, singular, plural) {
    el.addEventListener('scroll', () => {
        if (!pageState.words.length) return;
        if (pageState.rendered >= pageState.words.length) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
            appendPage(pageState, el, countEl, singular, plural);
        }
    });
}

function initBlanksCountSearch({ blanksEl, countEl, clearBtn, minLenEl, maxLenEl, shuffleBtn, resultsEl, onSearch }) {
    function clear() {
        blanksEl.value = '';
        countEl.value = '';
        onSearch();
    }
    blanksEl.addEventListener('input', debounce(() => {
        countEl.value = blanksToCount(blanksEl.value);
        onSearch();
    }, 150));
    countEl.addEventListener('input', debounce(() => {
        const newBlanks = countToBlanks(countEl.value);
        if (newBlanks || !countEl.value.trim()) blanksEl.value = newBlanks;
        onSearch();
    }, 150));
    minLenEl.addEventListener('input', debounce(onSearch, 150));
    maxLenEl.addEventListener('input', debounce(onSearch, 150));
    clearBtn.addEventListener('click', () => { clear(); blanksEl.focus(); });
    [blanksEl, countEl].forEach(el => {
        el.addEventListener('keydown', e => { if (e.key === 'Escape') clear(); });
    });
    if (shuffleBtn && resultsEl) {
        shuffleBtn.addEventListener('click', () => shuffleResultChips(resultsEl));
    }
}

function setActivePreset(preset) {
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    const target = document.querySelector(`.preset-btn[data-preset="${preset}"]`);
    if (target) target.classList.add('active');
    activePreset = preset;
    dom.customCountWrap.classList.toggle('hidden', activePreset !== 'custom');
}

function initSearchTab() {
    document.getElementById('search-pattern-row').replaceWith(buildPatternRow('search'));
    document.getElementById('search-controls-row').replaceWith(buildControlsRow('search'));
    dom.searchBlanks = document.getElementById('search-blanks');
    dom.searchCount = document.getElementById('search-count');
    dom.searchResults = document.getElementById('search-results');
    dom.searchResultCount = document.getElementById('search-result-count');
    dom.searchMinLen = document.getElementById('search-min-len');
    dom.searchMaxLen = document.getElementById('search-max-len');
    dom.searchShuffleBtn = document.getElementById('search-shuffle-btn');
    dom.searchClearBtn = document.getElementById('search-clear');

    initBlanksCountSearch({
        blanksEl: dom.searchBlanks,
        countEl: dom.searchCount,
        clearBtn: dom.searchClearBtn,
        minLenEl: dom.searchMinLen,
        maxLenEl: dom.searchMaxLen,
        shuffleBtn: dom.searchShuffleBtn,
        resultsEl: dom.searchResults,
        onSearch: runSearch,
    });

    initScrollPagination(dom.searchResults, searchPage, dom.searchResultCount, 'match', 'matches');
}

// ── BUILDER SECTION ────────────────────────────────────────
let activePreset = '50';

function applyBuilderPreset() {
    const minLen = parseInt(dom.builderMinLen.value) || 0;
    const maxLen = parseInt(dom.builderMaxLen.value) || 0;
    let pool = applyLengthFilter(appState.pool, minLen, maxLen);

    if (activePreset === 'all') {
        builderState.working = pool.slice();
    } else if (activePreset === 'custom') {
        const n = parseInt(dom.customCountInput.value) || 50;
        builderState.working = pool.slice(0, n);
    } else {
        builderState.working = pool.slice(0, parseInt(activePreset));
    }
    builderState.shuffled = false;
    renderBuilderPreview();
}

function renderBuilderPreview() {
    const filterText = (dom.builderFilterInput.value || '').toLowerCase().trim();
    const words = filterText
        ? builderState.working.filter(w => w.toLowerCase().includes(filterText))
        : builderState.working;
    const emptyMsg = appState.pool.length
        ? 'No words match the current filters.'
        : 'Select one or more word lists to build a set.';
    renderResults(words, builderPage, dom.builderResults, dom.builderResultCount, 'word', 'words', emptyMsg);
}

function initBuilderTab() {
    dom.builderResults = document.getElementById('builder-results');
    dom.builderResultCount = document.getElementById('builder-result-count');
    dom.builderMinLen = document.getElementById('builder-min-len');
    dom.builderMaxLen = document.getElementById('builder-max-len');
    dom.builderFilterInput = document.getElementById('builder-filter-input');
    dom.builderFilterClear = document.getElementById('builder-filter-clear');
    dom.customCountInput = document.getElementById('custom-count-input');
    dom.customCountWrap = document.getElementById('custom-count-wrap');
    dom.shuffleBtn = document.getElementById('builder-shuffle-btn');
    dom.copyBtn = document.getElementById('builder-copy-btn');
    dom.exportBtn = document.getElementById('builder-export-btn');
    dom.shareBtn = document.getElementById('builder-share-btn');
    dom.saveComboInput = document.getElementById('save-combo-input');
    dom.saveComboBtn = document.getElementById('save-combo-btn');
    dom.comboList = document.getElementById('combo-list');

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setActivePreset(btn.dataset.preset);
            applyBuilderPreset();
        });
    });
    // default active
    document.querySelector('.preset-btn[data-preset="50"]')?.classList.add('active');

    dom.customCountInput.addEventListener('input', debounce(() => {
        if (activePreset === 'custom') applyBuilderPreset();
    }, 300));

    dom.builderMinLen.addEventListener('input', debounce(applyBuilderPreset, 150));
    dom.builderMaxLen.addEventListener('input', debounce(applyBuilderPreset, 150));
    dom.builderFilterInput.addEventListener('input', debounce(renderBuilderPreview, 100));

    initScrollPagination(dom.builderResults, builderPage, dom.builderResultCount, 'word', 'words');

    dom.builderFilterClear.addEventListener('click', () => {
        dom.builderFilterInput.value = '';
        renderBuilderPreview();
    });

    dom.shuffleBtn.addEventListener('click', () => {
        builderState.working = fisher_yates_shuffle(builderState.working);
        builderState.shuffled = true;
        renderBuilderPreview();
    });

    dom.copyBtn.addEventListener('click', () => {
        if (!builderState.working.length) return;
        const text = builderState.working.join(',');
        navigator.clipboard.writeText(text).then(() => flashCopied(dom.copyBtn));
    });

    dom.exportBtn.addEventListener('click', () => {
        if (!builderState.working.length) return;
        const text = builderState.working.join(',');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'skribbl-words.txt';
        a.click();
        URL.revokeObjectURL(url);
    });

    dom.shareBtn.addEventListener('click', () => {
        const state = encodeShareState();
        const url = `${location.origin}${location.pathname}#${state}`;
        navigator.clipboard.writeText(url).then(() => flashCopied(dom.shareBtn));
    });

    dom.saveComboBtn.addEventListener('click', () => {
        const name = dom.saveComboInput.value.trim();
        if (!name || !appState.selectedPaths.size) return;
        const combos = loadCombos();
        combos.push({ name, paths: [...appState.selectedPaths], preset: activePreset });
        saveCombos(combos);
        dom.saveComboInput.value = '';
        renderComboList();
    });

    renderComboList();
}

// ── Saved Combos ──────────────────────────────────────────
function loadCombos() {
    try { return JSON.parse(localStorage.getItem('skribbl_combos') || '[]'); }
    catch { return []; }
}
function saveCombos(combos) {
    localStorage.setItem('skribbl_combos', JSON.stringify(combos));
}

function renderComboList() {
    const combos = loadCombos();
    dom.comboList.innerHTML = '';
    if (!combos.length) {
        dom.comboList.innerHTML = '<span class="empty-state" style="font-size:0.8rem">No saved combos yet.</span>';
        return;
    }
    combos.forEach((combo, idx) => {
        const item = document.createElement('div');
        item.className = 'combo-item';

        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'combo-restore';
        restoreBtn.title = combo.paths.map(p => {
            const e = manifest.find(m => m.path === p);
            return e ? e.name : p;
        }).join(', ');
        restoreBtn.textContent = combo.name;
        restoreBtn.addEventListener('click', () => restoreCombo(combo));

        const delBtn = document.createElement('button');
        delBtn.className = 'combo-delete';
        delBtn.title = 'Delete combo';
        delBtn.innerHTML = '✕';
        delBtn.addEventListener('click', () => {
            const c = loadCombos();
            c.splice(idx, 1);
            saveCombos(c);
            renderComboList();
        });

        item.appendChild(restoreBtn);
        item.appendChild(delBtn);
        dom.comboList.appendChild(item);
    });
}

function restoreCombo(combo) {
    appState.selectedPaths.clear();
    combo.paths.forEach(p => appState.selectedPaths.add(p));
    syncPickerCheckboxes('list-picker', appState);

    setActivePreset(combo.preset || '50');
    refreshPool();
}

// ── Share URL ─────────────────────────────────────────────
function encodeShareState() {
    const obj = {
        paths: [...appState.selectedPaths],
        preset: activePreset,
        custom: dom.customCountInput?.value || '',
    };
    return btoa(encodeURIComponent(JSON.stringify(obj)));
}

function decodeShareState(hash) {
    try {
        return JSON.parse(decodeURIComponent(atob(hash)));
    } catch {
        return null;
    }
}

function applyShareState(state) {
    if (!state) return false;
    if (!state.paths?.length) return false;

    appState.selectedPaths.clear();
    state.paths.forEach(p => appState.selectedPaths.add(p));
    syncPickerCheckboxes('list-picker', appState);

    setActivePreset(state.preset || '50');
    if (state.custom && dom.customCountInput) dom.customCountInput.value = state.custom;

    return true;
}

// ── Dark mode ─────────────────────────────────────────────
function initDarkMode() {
    const stored = localStorage.getItem('skribbl_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);

    const btn = document.getElementById('dark-mode-toggle');
    if (!btn) return;
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

    btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('skribbl_theme', next);
        btn.textContent = next === 'dark' ? '☀️' : '🌙';
        btn.title = next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    });
}

// ── Storage Notice Banner ─────────────────────────────────
function initStorageBanner() {
    const dismissed = localStorage.getItem('skribbl_banner_dismissed');
    const banner = document.getElementById('storage-banner');
    if (!banner) return;
    if (dismissed) { banner.classList.add('hidden'); return; }

    document.getElementById('storage-banner-close')?.addEventListener('click', () => {
        banner.classList.add('hidden');
        localStorage.setItem('skribbl_banner_dismissed', '1');
    });
}

// ── Shared notice banner ──────────────────────────────────
function showSharedBanner() {
    const banner = document.getElementById('shared-banner');
    if (!banner) return;
    banner.classList.remove('hidden');
    document.getElementById('shared-banner-close')?.addEventListener('click', () => {
        banner.classList.add('hidden');
        history.replaceState(null, '', location.pathname);
    });
}

// ── Shared controls (picker, select-all, clear-all, surprise) ─
function initSharedControls() {
    dom.selectAll = document.getElementById('select-all');
    dom.clearAll = document.getElementById('clear-all');
    dom.surpriseBtn = document.getElementById('surprise-btn');

    dom.selectAll.addEventListener('click', () => {
        manifest.forEach(e => appState.selectedPaths.add(e.path));
        syncPickerCheckboxes('list-picker', appState);
        refreshPool();
    });

    dom.clearAll.addEventListener('click', () => {
        appState.selectedPaths.clear();
        syncPickerCheckboxes('list-picker', appState);
        appState.pool = [];
        builderState.working = [];
        runSearch();
        renderBuilderPreview();
    });

    dom.surpriseBtn.addEventListener('click', () => {
        if (!manifest.length) return;
        const pick = manifest[Math.floor(Math.random() * manifest.length)];
        appState.selectedPaths.clear();
        appState.selectedPaths.add(pick.path);
        syncPickerCheckboxes('list-picker', appState);
        refreshPool().then(() => {
            dom.surpriseBtn.title = `Loaded: ${pick.name}`;
        });
    });
}

// ── CUSTOM WORD LIST ──────────────────────────────────────
const CUSTOM_KEY = 'skribbl_custom_words';
const customState = { words: [] };

function loadCustomWordsFromStorage() {
    try {
        const raw = localStorage.getItem(CUSTOM_KEY) || '';
        return raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
    } catch { return []; }
}

function saveCustomWordsToStorage(words) {
    localStorage.setItem(CUSTOM_KEY, words.join(','));
}

function runCustomSearch() {
    const emptyMsg = customState.words.length
        ? 'No matches found. Try a different pattern.'
        : 'Paste words above and save to search.';
    runPatternFilter(customState.words, dom.customBlanks, dom.customSearchMinLen, dom.customSearchMaxLen, blanksToRegex,
        words => renderResults(words, customPage, dom.customResults, dom.customResultCount, 'match', 'matches', emptyMsg));
}

function updateCustomWordCount() {
    const words = dom.customWordsInput.value.split(',').map(s => s.trim()).filter(Boolean);
    dom.customWordCountLabel.textContent = `${words.length} word${words.length === 1 ? '' : 's'}`;
}

function initCustomTab() {
    dom.customWordsInput = document.getElementById('custom-words-input');
    dom.customWordCountLabel = document.getElementById('custom-word-count');
    dom.customWordsSave = document.getElementById('custom-words-save');
    dom.customWordsClear = document.getElementById('custom-words-clear');
    dom.customResults = document.getElementById('custom-results');
    document.getElementById('custom-controls-row').replaceWith(buildControlsRow('custom'));
    dom.customSearchMinLen = document.getElementById('custom-min-len');
    dom.customSearchMaxLen = document.getElementById('custom-max-len');
    dom.customResultCount = document.getElementById('custom-result-count');
    dom.customShuffleBtn = document.getElementById('custom-shuffle-btn');
    document.getElementById('custom-pattern-row').replaceWith(buildPatternRow('custom'));
    dom.customBlanks = document.getElementById('custom-blanks');
    dom.customCount = document.getElementById('custom-count');
    dom.customSearchClear = document.getElementById('custom-clear');

    // Restore persisted words into textarea
    customState.words = loadCustomWordsFromStorage();
    if (customState.words.length) {
        dom.customWordsInput.value = customState.words.join(', ');
        updateCustomWordCount();
    }

    dom.customWordsInput.addEventListener('input', debounce(updateCustomWordCount, 150));

    dom.customWordsSave.addEventListener('click', () => {
        const words = dom.customWordsInput.value.split(',').map(s => s.trim()).filter(Boolean);
        customState.words = words;
        saveCustomWordsToStorage(words);
        dom.customWordsInput.value = words.join(', ');
        updateCustomWordCount();
        runCustomSearch();
        const orig = dom.customWordsSave.textContent;
        dom.customWordsSave.textContent = '✓ Saved!';
        setTimeout(() => { dom.customWordsSave.textContent = orig; }, 1500);
    });

    dom.customWordsClear.addEventListener('click', () => {
        dom.customWordsInput.value = '';
        customState.words = [];
        saveCustomWordsToStorage([]);
        updateCustomWordCount();
        runCustomSearch();
    });

    initBlanksCountSearch({
        blanksEl: dom.customBlanks,
        countEl: dom.customCount,
        clearBtn: dom.customSearchClear,
        minLenEl: dom.customSearchMinLen,
        maxLenEl: dom.customSearchMaxLen,
        shuffleBtn: dom.customShuffleBtn,
        resultsEl: dom.customResults,
        onSearch: runCustomSearch,
    });

    initScrollPagination(dom.customResults, customPage, dom.customResultCount, 'match', 'matches');
}

// ── Tab switching ─────────────────────────────────────────
function initTabs() {
    const sectionRow = document.querySelector('.section-row');
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
            document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
            sectionRow.classList.toggle('custom-tab-active', btn.dataset.tab === 'custom');
        });
    });
}

// ── Main init ─────────────────────────────────────────────
async function init() {
    initDarkMode();
    initStorageBanner();
    initLocalDevTools();

    // Fetch manifest
    const res = await fetch('words/manifest.json');
    manifest = await res.json();

    // Build shared picker and init tools
    buildListPicker('list-picker', appState, () => refreshPool());
    initSharedControls();
    initSearchTab();
    initBuilderTab();
    initCustomTab();
    initTabs();

    // Check URL hash for shared state
    const hash = location.hash.slice(1);
    if (hash) {
        const shared = decodeShareState(hash);
        if (shared && applyShareState(shared)) {
            showSharedBanner();
            await refreshPool();
        }
    }
}

document.addEventListener('DOMContentLoaded', init);
