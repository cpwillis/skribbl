# Skribbl Solver

A free, open-source fan-made tool for [skribbl.io](https://skribbl.io) players.

> [!WARNING]
> **No support. No warranty. No guarantee of service.** This is a hobby project.
> It may be changed, broken, or shut down permanently at any time without notice
> and without liability. See the
> [Terms of Use](https://skribbl.cpwillis.dev/terms.html) and
> [Privacy & Storage](https://skribbl.cpwillis.dev/privacy.html).
>
> **Not affiliated with skribbl.io.** Independent community tool.

---

## Features

- **Hint Search** - Enter the blank hint from the game (e.g. `_oa__`) using `_`, `?` or `*` for unknown letters, or type word lengths (e.g. `4 3`) in the letter-count field. The two fields stay in sync, results update live as you type, and the letters you already know are highlighted in each match.
- **Word List Builder** - Select and combine any of the included word lists. Merged pools are case-insensitively deduplicated. Choose a word count (50, 100, All, or custom), shuffle, and copy the result as a comma-separated list for a custom lobby.
- **Custom Word List** - Paste your own comma-separated list, save it to your browser, and run the same search against it.
- **Saved Combos** - Save named selections of word lists for quick recall.
- **Share URL** - Encode your current selection into a URL.
- **Surprise Me** - Load a random word list.
- **Export** - Download your word set as a `.txt` file.
- **Word length filter** - Filter by character count in every tab.
- **Dark mode** - Persistent, respects your system preference.
- **PWA** - Installable, works fully offline after first load.
- **Mobile friendly** - Responsive down to small phones.

---

## Word lists

69 lists, ~23,100 words, across Animals, Anime, Brands, Countries, Difficulties,
Dungeons & Dragons, Famous People, Food & Drinks, Harry Potter, Languages,
Miscellaneous, Movies & Shows, Pokémon, Sports and Video Games. The picker on
the [live site](https://skribbl.cpwillis.dev) browses all of them.

Each list is a plain JSON array under `public/words/`, indexed by
[`manifest.json`](public/words/manifest.json), which is the source of truth for
what ships.

Themed lists contain names that belong to other people. **No ownership is
claimed over any of them**, and nothing here is affiliated with or endorsed by
them: they are single-word drawing prompts, and no artwork, logo, character, or
text is reproduced. Full attributions and the takedown route are in the
[Terms of Use](https://skribbl.cpwillis.dev/terms.html#attributions). The NSFW
list contains explicit language and is opt-in only.

---

## Local development

```bash
npx serve public
```

Any static file server works. No toolchain, no `npm install`, no build step.
`.claude/launch.json` wires the same command up for editor and agent previews.
The service worker does not register on localhost, so edits show up on a plain
reload.

One self-check covers the hint-pattern logic:

```bash
node test.mjs
```

## Deployment

Cloudflare Workers static assets, configured in
[`wrangler.jsonc`](wrangler.jsonc).

```bash
./deploy.sh
```

It stamps the build SHA and freshness dates, deploys, then restores the working
tree. The header comment in [`deploy.sh`](deploy.sh) explains the mechanics.
