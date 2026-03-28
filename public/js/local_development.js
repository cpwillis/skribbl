/* ===================================================
   local-dev.js - localhost-only development tooling.
   All exports are globals referenced by app.js.
   On any non-localhost origin every function is a no-op
   so this file is safe to ship to production.
   =================================================== */

'use strict';

// True only when running on localhost / 127.0.0.1.
// Evaluated once at parse time - cannot be spoofed after load.
const LOCAL_DEVELOPMENT = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

// Set to true in the browser console to bypass the in-memory listCache in
// fetchAndParse so edited word-list files are picked up on every fetch.
let local_mode = false;

// Clear the in-memory word-list cache and rebuild the active pool.
// No-ops on deployed origins to prevent end users abusing fetch quotas.
function clear_cache() {
    if (!LOCAL_DEVELOPMENT) return Promise.resolve();
    listCache.clear();
    appState.pool = [];
    builderState.working = [];
    return refreshPool();
}

// Injects a "Clear cache" button into the page footer.
// Called from init() in app.js - does nothing on deployed origins.
function initLocalDevTools() {
    if (!LOCAL_DEVELOPMENT) return;
    const footer = document.querySelector('.site-footer');
    if (!footer) return;
    const btn = document.createElement('button');
    btn.textContent = '🔄 Clear cache';
    btn.title = 'Clear in-memory word-list cache and reload (localhost only)';
    btn.className = 'btn-ghost';
    btn.style.cssText = 'margin-top:0.6rem;font-size:0.8rem;';
    btn.addEventListener('click', () => {
        btn.textContent = '⏳ Reloading…';
        btn.disabled = true;
        clear_cache().then(() => {
            btn.textContent = '✓ Cache cleared';
            setTimeout(() => {
                btn.textContent = '🔄 Clear cache';
                btn.disabled = false;
            }, 1500);
        });
    });
    const row = document.createElement('p');
    row.style.marginTop = '0.4rem';
    row.appendChild(btn);
    footer.appendChild(row);
}
