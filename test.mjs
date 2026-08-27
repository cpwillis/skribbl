// Self-check for the pattern logic in public/js/app.js. Run: node test.mjs
// app.js is a plain browser script with no exports, so it is evaluated in a vm
// context with the few globals it touches at load time stubbed out.
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import assert from 'node:assert/strict';

// vm arrays come from another realm, so copy into host arrays before deep-comparing
const arr = v => (v === null ? null : [...v]);

const ctx = createContext({ document: { addEventListener() {} }, localStorage: { getItem: () => null } });
runInContext(readFileSync(new URL('public/js/app.js', import.meta.url), 'utf8'), ctx);
const { blanksToRegex, blanksToCount, countToBlanks, knownMask, applyLengthFilter } = ctx;

// blanks: * _ ? are one unknown character each, spaces are literal separators
assert.ok(blanksToRegex('b*n*n*').test('banana'));
assert.ok(!blanksToRegex('b*n*n*').test('bananas'), 'anchored: no partial match');
assert.ok(blanksToRegex('*** ****').test('hot dogs'));
assert.ok(!blanksToRegex('*** ****').test('hotdogsx'), 'space must line up');
assert.ok(blanksToRegex('R*m** *n* ***i*t').test('romeo and juliet'), 'case-insensitive');
assert.ok(!blanksToRegex('c.t').test('cat'), 'regex metacharacters are literal');

// the two input fields stay in sync
assert.equal(blanksToCount('*b** **'), '4 2');
assert.equal(blanksToCount('   '), '');
assert.equal(countToBlanks('3 4'), '*** ****');
assert.equal(countToBlanks('not numbers'), '');
assert.equal(blanksToCount(countToBlanks('5 3 6')), '5 3 6', 'round trip');

// knownMask drives the <mark> highlighting: true only where the hint pinned a letter
assert.deepEqual(arr(knownMask('banana', 'b*n*n*')), [true, false, true, false, true, false]);
assert.equal(knownMask('banana', '******'), null, 'nothing known = no highlighting');
assert.equal(knownMask('banana', 'b*n'), null, 'length mismatch = no highlighting');
assert.deepEqual(arr(knownMask('hot dog', '*o* d**')), [false, true, false, false, true, false, false],
  'the separating space is not a known letter');

// length filter ignores spaces, and an absent bound is not a bound
assert.deepEqual(arr(applyLengthFilter(['a', 'abc', 'ab cd'], 0, 3)), ['a', 'abc']);
assert.deepEqual(arr(applyLengthFilter(['a', 'abc', 'ab cd'], 4, 0)), ['ab cd']);
assert.deepEqual(arr(applyLengthFilter(['a', 'abc'], 0, 0)), ['a', 'abc']);

console.log('ok');
