# Skribbl Solver

Static site for [skribbl.io](https://skribbl.io) players: search the blank hint the game shows you against 69
bundled word lists (~23k words), and build a merged list to paste into a custom lobby. No accounts, no backend,
everything runs in the browser and persists to `localStorage`.

Live at <https://skribbl.cpwillis.dev>. Not affiliated with skribbl.io.

Hobby project: no support, no warranty, no guarantee of service.
[Terms](https://cpwillis.dev/terms) · [Privacy](https://cpwillis.dev/privacy) ·
[Attributions](https://skribbl.cpwillis.dev/attributions)

## Hint syntax

`_`, `?` and `*` each stand for one unknown letter, spaces are literal word breaks, everything else is a literal
character. Matching is anchored and case-insensitive.

```
_oa__      board, coach, coast, koala, toast
b*n*n*     banana
*** ****   Bob Ross, Hot Fuzz, Jet Pack
```

The letter-count field is the same pattern in another form: typing `3 4` fills the hint field with `*** ****`,
and the two stay in sync as you type.

## Local development

```bash
npx serve public
```

Any static file server works. No `npm install`, no build step, no dependencies. `.claude/launch.json` wires the
same command up for editor and agent previews.

The service worker deliberately does not register on `localhost` or `127.0.0.1` (`public/js/pwa.js`), so a plain
reload shows your edits.

One self-check covers the hint-pattern logic in `public/js/app.js`:

```bash
node test.mjs
```

## Deployment

Cloudflare Workers static assets, configured in [`wrangler.jsonc`](wrangler.jsonc). Push to `main` and Workers
Builds runs `bash ../deploy.sh` (deploy command set in the Cloudflare dashboard, not in this repo). No build
command.

`./deploy.sh` runs the same thing locally against your own `wrangler` login. Before `npx wrangler@4 deploy` it:

- stamps the git short SHA into `CACHE` in `public/sw.js` (byte-changing the file is what makes clients reinstall
  the service worker and re-cache), and into the `build-sha` span in the footer
- stamps `<lastmod>` in `public/sitemap.xml` and JSON-LD `dateModified` from each page's own last commit date, not
  the deploy date
- restores all three files on exit, so the `xxxxxxx` placeholders stay in git

A dirty working tree gets a timestamp suffix on the cache version, since HEAD no longer describes what shipped.

## Word lists

Each list is a JSON array of strings under `public/words/<Group>/<Name>.json`. `public/words/manifest.json` is the
source of truth for what ships; a file not listed there is invisible to the app and to the service worker's
precache. Merged selections are deduplicated case-insensitively. The NSFW list is opt-in.

Lists name third-party brands, characters and people. Nothing is claimed or reproduced beyond the names
themselves; see [Attributions](https://skribbl.cpwillis.dev/attributions) for the credits and the takedown route.

[CONTRIBUTING.md](CONTRIBUTING.md) covers adding a list and the constraints on changes.
