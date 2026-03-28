'use strict';

/**
 * Clone the shared #tpl-pattern-row template and assign IDs using the given
 * prefix. Elements inside the template carry a data-id attribute; this
 * function turns them into real element IDs of the form `${prefix}-${data-id}`
 * (e.g. prefix "search" → "search-blanks", "search-count", "search-clear").
 *
 * @param {string} prefix  - e.g. "search" or "custom"
 * @returns {DocumentFragment}
 */
function buildPatternRow(prefix) {
    const tpl = document.getElementById('tpl-pattern-row');
    const frag = tpl.content.cloneNode(true);
    frag.querySelectorAll('[data-id]').forEach(el => {
        el.id = `${prefix}-${el.dataset.id}`;
        el.removeAttribute('data-id');
    });
    return frag;
}
