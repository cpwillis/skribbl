/* Shared dark-mode initialisation — used by all pages */
(function () {
  var stored = localStorage.getItem('skribbl_theme');
  var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('dark-mode-toggle');
    if (!btn) return;
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    btn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('skribbl_theme', next);
      btn.textContent = next === 'dark' ? '☀️' : '🌙';
      btn.title = next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    });
  });
})();
