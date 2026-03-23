/* ===================================================
   Skribbl Solver — app.js
   Vanilla JS, no dependencies, no build step.
   =================================================== */

'use strict';

// ── In-memory caches ──────────────────────────────────────
const listCache = new Map();   // path → string[]
let manifest = [];             // [{group, name, path}]

// ── Shared state ──────────────────────────────────────────
const searchState = {
    selectedPaths: new Set(),
    pool: [],          // merged+deduped words for this selection
};

const builderState = {
    selectedPaths: new Set(),
    pool: [],          // merged+deduped words
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
    if (listCache.has(path)) return listCache.get(path);
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

function buildHighlightedChip(word, regex) {
    const chip = document.createElement('span');
    chip.className = 'word-chip';

    if (regex) {
        // Re-run regex to get match groups for highlighting
        const m = word.match(regex);
        if (m && m.index !== undefined) {
            // Highlight only captured groups (wildcard positions)
            let result = '';
            let pos = 0;
            const full = m[0];
            // Find individual group positions within the full match
            // Use the regex source to determine wildcard positions in the original pattern
            result = word; // fallback — just use plain text
            // For simplicity: bold the matched portion if it differs from raw in case
            chip.innerHTML = escapeHtml(word);
        } else {
            chip.textContent = word;
        }
    } else {
        chip.textContent = word;
    }

    const len = document.createElement('span');
    len.className = 'chip-len';
    len.textContent = word.replace(/ /g, '').length;
    chip.appendChild(len);
    return chip;
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

// ── SEARCH SECTION ─────────────────────────────────────────
let searchDebounce = null;

async function refreshSearchPool() {
    searchState.pool = await loadSelectedLists([...searchState.selectedPaths]);
    dom.searchWordCount.textContent = `${searchState.pool.length} words loaded`;
    runSearch();
}

function runSearch() {
    const pattern = dom.searchInput.value.trim();
    const minLen = parseInt(dom.searchMinLen.value) || 0;
    const maxLen = parseInt(dom.searchMaxLen.value) || 0;

    let pool = searchState.pool;

    // Apply length filter
    pool = applyLengthFilter(pool, minLen, maxLen);

    if (!pattern) {
        renderSearchResults(pool, null);
        return;
    }

    let regex;
    try { regex = patternToRegex(pattern); }
    catch { renderSearchResults([], null); return; }

    const matched = pool.filter(w => regex.test(w));
    renderSearchResults(matched, regex);
}

function renderSearchResults(words, regex) {
    dom.searchResultCount.textContent = words.length ? `${words.length} match${words.length === 1 ? '' : 'es'}` : '';
    dom.searchResults.innerHTML = '';

    if (!words.length) {
        const em = document.createElement('span');
        em.className = 'empty-state';
        em.textContent = searchState.pool.length
            ? 'No matches found. Try a different pattern.'
            : 'Select one or more word lists to search.';
        dom.searchResults.appendChild(em);
        return;
    }

    const frag = document.createDocumentFragment();
    for (const w of words) {
        frag.appendChild(buildWordChip(w));
    }
    dom.searchResults.appendChild(frag);
}

function initSearch() {
    dom.searchInput = document.getElementById('search-input');
    dom.searchResults = document.getElementById('search-results');
    dom.searchResultCount = document.getElementById('search-result-count');
    dom.searchWordCount = document.getElementById('search-word-count');
    dom.searchMinLen = document.getElementById('search-min-len');
    dom.searchMaxLen = document.getElementById('search-max-len');
    dom.searchShuffleBtn = document.getElementById('search-shuffle-btn');
    dom.searchClearBtn = document.getElementById('search-clear-btn');
    dom.searchSelectAll = document.getElementById('search-select-all');
    dom.searchClearAll = document.getElementById('search-clear-all');
    dom.searchSurpriseBtn = document.getElementById('search-surprise-btn');

    buildListPicker('search-list-picker', searchState, () => refreshSearchPool());

    dom.searchInput.addEventListener('input', debounce(runSearch, 150));
    dom.searchMinLen.addEventListener('input', debounce(runSearch, 150));
    dom.searchMaxLen.addEventListener('input', debounce(runSearch, 150));

    dom.searchClearBtn.addEventListener('click', () => {
        dom.searchInput.value = '';
        dom.searchInput.focus();
        runSearch();
    });

    dom.searchShuffleBtn.addEventListener('click', () => {
        const chips = Array.from(dom.searchResults.querySelectorAll('.word-chip'));
        if (!chips.length) return;
        const shuffled = fisher_yates_shuffle(chips);
        dom.searchResults.innerHTML = '';
        const frag = document.createDocumentFragment();
        shuffled.forEach(c => frag.appendChild(c));
        dom.searchResults.appendChild(frag);
    });

    dom.searchSelectAll.addEventListener('click', () => {
        manifest.forEach(e => searchState.selectedPaths.add(e.path));
        syncPickerCheckboxes('search-list-picker', searchState);
        refreshSearchPool();
    });

    dom.searchClearAll.addEventListener('click', () => {
        searchState.selectedPaths.clear();
        syncPickerCheckboxes('search-list-picker', searchState);
        searchState.pool = [];
        dom.searchWordCount.textContent = '0 words loaded';
        runSearch();
    });

    dom.searchSurpriseBtn.addEventListener('click', () => {
        if (!manifest.length) return;
        const pick = manifest[Math.floor(Math.random() * manifest.length)];
        searchState.selectedPaths.clear();
        searchState.selectedPaths.add(pick.path);
        syncPickerCheckboxes('search-list-picker', searchState);
        refreshSearchPool().then(() => {
            dom.searchSurpriseBtn.title = `Loaded: ${pick.name}`;
        });
    });

    // Keyboard: Escape clears
    dom.searchInput.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            dom.searchInput.value = '';
            runSearch();
        }
    });
}

// ── BUILDER SECTION ────────────────────────────────────────
let activePreset = '50';

async function refreshBuilderPool() {
    builderState.pool = await loadSelectedLists([...builderState.selectedPaths]);
    dom.builderWordCount.textContent = `${builderState.pool.length} words loaded`;
    applyBuilderPreset();
}

function applyBuilderPreset() {
    const minLen = parseInt(dom.builderMinLen.value) || 0;
    const maxLen = parseInt(dom.builderMaxLen.value) || 0;
    let pool = applyLengthFilter(builderState.pool, minLen, maxLen);

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

    dom.builderResults.innerHTML = '';

    if (!words.length) {
        const em = document.createElement('span');
        em.className = 'empty-state';
        em.textContent = builderState.pool.length
            ? 'No words match the current filters.'
            : 'Select one or more word lists to build a set.';
        dom.builderResults.appendChild(em);
        dom.builderResultCount.textContent = '';
        return;
    }

    dom.builderResultCount.textContent = `${words.length} word${words.length === 1 ? '' : 's'}`;
    const frag = document.createDocumentFragment();
    for (const w of words) frag.appendChild(buildWordChip(w));
    dom.builderResults.appendChild(frag);
}

function initBuilder() {
    dom.builderWordCount = document.getElementById('builder-word-count');
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
    dom.builderSelectAll = document.getElementById('builder-select-all');
    dom.builderClearAll = document.getElementById('builder-clear-all');
    dom.builderSurpriseBtn = document.getElementById('builder-surprise-btn');

    buildListPicker('builder-list-picker', builderState, () => refreshBuilderPool());

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activePreset = btn.dataset.preset;
            dom.customCountWrap.classList.toggle('hidden', activePreset !== 'custom');
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

    dom.builderSelectAll.addEventListener('click', () => {
        manifest.forEach(e => builderState.selectedPaths.add(e.path));
        syncPickerCheckboxes('builder-list-picker', builderState);
        refreshBuilderPool();
    });

    dom.builderClearAll.addEventListener('click', () => {
        builderState.selectedPaths.clear();
        syncPickerCheckboxes('builder-list-picker', builderState);
        builderState.pool = [];
        builderState.working = [];
        dom.builderWordCount.textContent = '0 words loaded';
        renderBuilderPreview();
    });

    dom.builderSurpriseBtn.addEventListener('click', () => {
        if (!manifest.length) return;
        const pick = manifest[Math.floor(Math.random() * manifest.length)];
        builderState.selectedPaths.clear();
        builderState.selectedPaths.add(pick.path);
        syncPickerCheckboxes('builder-list-picker', builderState);
        refreshBuilderPool();
    });

    dom.saveComboBtn.addEventListener('click', () => {
        const name = dom.saveComboInput.value.trim();
        if (!name || !builderState.selectedPaths.size) return;
        const combos = loadCombos();
        combos.push({ name, paths: [...builderState.selectedPaths], preset: activePreset });
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
    builderState.selectedPaths.clear();
    combo.paths.forEach(p => builderState.selectedPaths.add(p));
    syncPickerCheckboxes('builder-list-picker', builderState);

    // Restore preset
    const presetBtns = document.querySelectorAll('.preset-btn');
    presetBtns.forEach(b => b.classList.remove('active'));
    const target = document.querySelector(`.preset-btn[data-preset="${combo.preset || '50'}"]`);
    if (target) { target.classList.add('active'); activePreset = combo.preset || '50'; }
    dom.customCountWrap.classList.toggle('hidden', activePreset !== 'custom');

    refreshBuilderPool();
}

// ── Share URL ─────────────────────────────────────────────
function encodeShareState() {
    const obj = {
        paths: [...builderState.selectedPaths],
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

    builderState.selectedPaths.clear();
    state.paths.forEach(p => builderState.selectedPaths.add(p));
    syncPickerCheckboxes('builder-list-picker', builderState);

    const presetBtns = document.querySelectorAll('.preset-btn');
    presetBtns.forEach(b => b.classList.remove('active'));
    const matchPreset = state.preset || '50';
    const target = document.querySelector(`.preset-btn[data-preset="${matchPreset}"]`);
    if (target) { target.classList.add('active'); activePreset = matchPreset; }
    if (state.custom && dom.customCountInput) dom.customCountInput.value = state.custom;
    dom.customCountWrap?.classList.toggle('hidden', activePreset !== 'custom');

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

// ── Main init ─────────────────────────────────────────────
async function init() {
    initDarkMode();
    initStorageBanner();

    // Fetch manifest
    const res = await fetch('word_lists/manifest.json');
    manifest = await res.json();

    // Build pickers
    initSearch();
    initBuilder();

    // Check URL hash for shared state
    const hash = location.hash.slice(1);
    if (hash) {
        const shared = decodeShareState(hash);
        if (shared && applyShareState(shared)) {
            showSharedBanner();
            await refreshBuilderPool();
        }
    }
}

document.addEventListener('DOMContentLoaded', init);
