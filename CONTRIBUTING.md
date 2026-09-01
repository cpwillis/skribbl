# Contributing

PRs and [issues](https://github.com/cpwillis/skribbl/issues) are welcome, but there is no commitment to review,
respond, merge, or do it in any timeframe. See the [README](README.md) for the no-support position.

## Code

Fork, branch, change, run `node test.mjs`, open a PR saying what and why.

Constraints, in rough order of how likely you are to trip on them:

- Plain HTML, CSS and browser JS. A change that needs `npm install` to run the site will not be merged.
- New page? Add its **extensionless** URL to `STATIC_URLS` in `public/sw.js`. The asset router 307s every `.html`
  URL, and `cache.addAll` stores the redirected response, which a navigation then cannot render.
- Leave the `xxxxxxx` placeholders in `public/sw.js` and the `build-sha` span in `public/index.html` alone.
  `deploy.sh` stamps them and greps to confirm the stamp landed, so renaming either breaks the deploy.

## Word lists

A JSON array of strings at `public/words/<Group>/<Name>.json`, plus one entry in `public/words/manifest.json`.
Nothing else.

Names and titles that belong to other people are fine. Anything that reproduces someone's work rather than naming
it is not: no lyrics, no dialogue, no quotations, no prose extracts. Single words and short titles only.

If a list covers a rights holder not already credited, add them to `public/attributions.html`.
