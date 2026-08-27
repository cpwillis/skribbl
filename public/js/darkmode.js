/* Shared dark-mode initialisation - loaded by every page, before first paint. */
(function () {
  var BAR = { light: '#f7f8fa', dark: '#0e1015' };
  var stored = localStorage.getItem('skribbl_theme');
  var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  function apply(next, btn) {
    document.documentElement.setAttribute('data-theme', next);
    // The media-query theme-color tags can't see an explicit override, so drive one directly
    var meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (meta) meta.setAttribute('content', BAR[next]);
    if (btn) {
      btn.textContent = next === 'dark' ? '\u2600\ufe0f' : '\ud83c\udf19';
      btn.title = next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
      btn.setAttribute('aria-pressed', String(next === 'dark'));
    }
  }

  apply(theme, null);

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('dark-mode-toggle');
    if (!btn) return;
    apply(document.documentElement.getAttribute('data-theme'), btn);
    btn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      localStorage.setItem('skribbl_theme', next);
      apply(next, btn);
    });
  });
})();
