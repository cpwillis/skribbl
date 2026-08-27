# Skribbl Solver

A free, open-source fan-made tool for [skribbl.io](https://skribbl.io) players.

**Live site:** [skribbl.cpwillis.dev](https://skribbl.cpwillis.dev)

> **Not affiliated with skribbl.io.** Independent community tool.
>
> **No support. No warranty. No guarantee of service.** This is a hobby project.
> It may be changed, broken, or shut down permanently at any time without notice
> and without liability. See [Terms of Use](public/terms.html) and
> [Privacy & Storage](public/privacy.html).

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

69 lists, ~23,100 words.

| Category           | Lists                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| Default            | English                                                                                              |
| Animals            | Animals, Birds, Bugs, Dinosaurs, Lizards, Mammals                                                    |
| Anime              | Adventure, Horror, Romance, Slice of Life                                                            |
| Brands             | Automotive, Fashion, Tech                                                                            |
| Countries          | Africa, America, Asia, Europe, Oceania                                                               |
| Difficulties       | Easy, Medium, Hard, Difficult                                                                        |
| Dungeons & Dragons | Grab Bag, Items, Monsters, Spells                                                                    |
| Famous People      | Actors, Musicians, YouTubers                                                                         |
| Food & Drinks      | Drinks, Foods, Vegetables                                                                            |
| Harry Potter       | Characters, General, Spells                                                                          |
| Languages          | French, German, Korean, Spanish                                                                      |
| Miscellaneous      | Meme, NSFW, Random Items                                                                             |
| Movies & Shows     | Action, Comedy, Crime, DC Universe, Horror, Marvel, Netflix, TV Series                               |
| Pokémon            | Gen 1-8                                                                                              |
| Sports             | Athletes, Sports                                                                                     |
| Video Games        | Fortnite, League of Legends, Minecraft, Mobile Legends, Nintendo, Overwatch, Roblox, Super Smash Bros |

Lists are plain JSON arrays under `public/words/`, indexed by
`public/words/manifest.json`. Adding a list means dropping in a JSON array of
strings and adding one manifest entry. No build step.

### Third-party names

Themed lists contain names and titles that belong to other people: brands,
characters, franchises, films, games, and real individuals. They are included
only as single-word drawing prompts.

**No ownership is claimed over any of them.** All rights stay with their
respective owners and original creators. This project is not affiliated with,
endorsed by, or sponsored by any of them, and no individual named in any list is
associated with it. The lists reproduce no artwork, logos, characters, text, or
other creative work: names and titles only. Full attributions are in the
[Terms of Use](public/terms.html#attributions). If you own rights in something
here and want it gone, open an issue and it will normally be removed.

The NSFW list contains explicit language and is opt-in only.

---

## Local development

```bash
npx serve public
```

Any static file server works. There is no toolchain, no `npm install`, and no
build step. `.claude/launch.json` wires the same command up for editor/agent
previews. The service worker does not register on localhost, so edits show up on
a plain reload.

There is one self-check covering the hint-pattern logic:

```bash
node test.mjs
```

## Deployment

Cloudflare Workers static assets, configured in `wrangler.jsonc`.

```bash
./deploy.sh
```

`deploy.sh` stamps the git short SHA into the service worker cache name and the
page footer, deploys with `wrangler`, then restores the working tree. Every
deploy therefore byte-changes `sw.js`, which forces clients to reinstall the
service worker and re-cache. No manual version bump.

---

## Contributing

Pull requests are welcome but **there is no commitment to review, respond to, or
merge them**, and no timeframe. Bug reports go to
[GitHub Issues](https://github.com/cpwillis/skribbl/issues) on the same basis.

1. Fork, branch, change.
2. Open a PR describing what changed and why.
3. Preserve the [licence](#licence) attribution requirements.

---

## Licence

**Custom Attribution Licence.** See [LICENSE](LICENSE) for full terms.

**Summary:** free to use, fork, and modify. Derivative works must credit
[cpwillis](https://github.com/cpwillis) and link back to this repository. No
support, no warranty, no liability.

---

## Credits

Built by [cpwillis](https://github.com/cpwillis). Word lists are
community-sourced everyday vocabulary.
