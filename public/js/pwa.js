// No service worker on localhost: a cache-first SW makes every local edit invisible.
const IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

if ('serviceWorker' in navigator && !IS_LOCAL) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // Registration failed - the app still works online
        });
    });
}
