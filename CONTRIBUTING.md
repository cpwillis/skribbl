# Contributing

Pull requests are welcome, but **there is no commitment to review, respond to,
or merge them**, and no timeframe. Bug reports go to
[Issues](https://github.com/cpwillis/skribbl/issues) on the same basis. This is
a hobby project; see the [Terms of Use](https://skribbl.cpwillis.dev/terms.html)
for the full no-support position.

By opening a pull request you agree your contribution is licensed under the
same [MIT licence](LICENSE) as the rest of the project.

## Code

1. Fork, branch, change.
2. Keep the copyright and licence notices intact.
3. Run the self-check: `node test.mjs`.
4. Open a PR describing what changed and why.

There is no build step, no toolchain, and no dependencies. Plain HTML, CSS, and
browser JavaScript. Keep it that way: a change that needs `npm install` to run
the site will not be merged.

## Word lists

A list is a JSON array of strings at `public/words/<Group>/<Name>.json`, plus
one entry in `public/words/manifest.json`. Nothing else.

Lists may contain names and titles that belong to other people, including
brands, characters, and franchises. What they must not contain is anything that
reproduces someone's work rather than naming it: no lyrics, no dialogue, no
quotations, no prose extracts. A word list is single words and short titles.

If a new list covers a rights holder not already acknowledged, add them to the
attributions in `public/terms.html`.
