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

// Clear the in-memory word-list cache, service-worker caches, cookies,
// localStorage, sessionStorage, and IndexedDB, then rebuild the active pool.
// No-ops on deployed origins to prevent end users abusing fetch quotas.
async function clear_cache() {
    if (!LOCAL_DEVELOPMENT) return;

    // In-memory app cache
    listCache.clear();
    appState.pool = [];
    builderState.working = [];

    // Service-worker caches
    if ('caches' in self) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    // Cookies (document-accessible only)
    document.cookie.split(';').forEach(cookie => {
        const name = cookie.split('=')[0].trim();
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });

    // Web Storage
    localStorage.clear();
    sessionStorage.clear();

    // IndexedDB
    if ('indexedDB' in self && indexedDB.databases) {
        const dbs = await indexedDB.databases();
        await Promise.all(dbs.map(db => new Promise((resolve, reject) => {
            const req = indexedDB.deleteDatabase(db.name);
            req.onsuccess = resolve;
            req.onerror = reject;
            req.onblocked = resolve;
        })));
    }

    await refreshPool();
    location.reload();
}

// Injects a "Clear cache" button into the page footer.
// Called from init() in app.js - does nothing on deployed origins.
function initLocalDevTools() {
    if (!LOCAL_DEVELOPMENT) return;
    const footer = document.querySelector('.site-footer');
    if (!footer) return;
    const btn = document.createElement('button');
    btn.textContent = '🔄 Clear cache';
    btn.title = 'Clear caches, cookies, localStorage, sessionStorage, IndexedDB and reload (localhost only)';
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
