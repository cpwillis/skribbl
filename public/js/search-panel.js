'use strict';

// ── Shared template HTML ──────────────────────────────────
const TEMPLATE_PATTERN_ROW = `
<div class="pattern-row">
  <div class="pattern-col pattern-input-blanks">
    <span class="pattern-col-label">Search by Letters &amp; Blanks</span>
    <div class="pattern-input-wrap">
      <input type="text" data-id="blanks" placeholder="Rom** *n* ***iet"
             autocomplete="off" autocorrect="off" spellcheck="false"
             aria-label="Search by blanks" />
    </div>
  </div>
  <div class="pattern-col pattern-input-count">
    <span class="pattern-col-label">Letter Count</span>
    <div class="pattern-input-wrap">
      <input type="text" data-id="count" placeholder="5 3 6"
             autocomplete="off" autocorrect="off" spellcheck="false"
             aria-label="Letter count" />
    </div>
  </div>
  <div class="pattern-col pattern-clear-col">
    <span class="pattern-col-label" aria-hidden="true"></span>
    <button class="clear-btn" data-id="clear" aria-label="Clear search" title="Clear (Esc)">&#x2715;</button>
  </div>
</div>`;

const TEMPLATE_CONTROLS_ROW = `
<div class="len-filter">
  <label data-for="min-len">Length filter:</label>
  <input type="number" data-id="min-len" min="1" max="30" placeholder="min" aria-label="Minimum word length" />
  <span>–</span>
  <input type="number" data-id="max-len" min="1" max="30" placeholder="max" aria-label="Maximum word length" />
  <span class="results-count" data-id="result-count" aria-live="polite"></span>
  <button data-id="shuffle-btn" class="btn-secondary">🔀 Shuffle results</button>
</div>`;

// ── Template helpers ──────────────────────────────────────
/**
 * Stamp out a template string into a DocumentFragment, replacing data-id
 * attributes with real IDs using the given prefix
 * (e.g. prefix "search" + data-id="blanks" → id="search-blanks"),
 * and data-for with a prefixed for attribute on labels.
 */
function buildFromTemplate(html, prefix) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const frag = tpl.content.cloneNode(true);
    frag.querySelectorAll('[data-id]').forEach(el => {
        el.id = `${prefix}-${el.dataset.id}`;
        el.removeAttribute('data-id');
    });
    frag.querySelectorAll('[data-for]').forEach(el => {
        el.setAttribute('for', `${prefix}-${el.dataset.for}`);
        el.removeAttribute('data-for');
    });
    return frag;
}

function buildPatternRow(prefix) { return buildFromTemplate(TEMPLATE_PATTERN_ROW, prefix); }
function buildControlsRow(prefix) { return buildFromTemplate(TEMPLATE_CONTROLS_ROW, prefix); }
