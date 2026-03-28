# Skribbl Solver

A free, open-source fan-made tool for [skribbl.io](https://skribbl.io) players.

**Live site:** [skribbl.cpwillis.dev](https://skribbl.cpwillis.dev)

> **Not affiliated with skribbl.io.** This is an independent community tool.

---

## Features

- **Hint Search** — Enter the blank hint from skribbl.io (e.g. `_oa__`) using `_`/`?` for single unknowns and `*` for multi-character wildcards. Or type word lengths (e.g. `4 3`) in the letter-count field — the two fields stay in sync. Results update live as you type.
- **Word List Builder** — Select and combine any of the 70+ included word lists. Merged pools are case-insensitively deduplicated. Choose a word count (50, 100, All, or custom), shuffle, and copy the result as a comma-separated list for use in skribbl.io custom games.
- **Custom Word List** — Paste your own comma-separated word list, save it to your browser, and run the same blank/pattern search against it.
- **Multi-select & deduplication** — Combine multiple lists from different categories into a single deduplicated pool.
- **Saved Combos** — Save named selections of word lists to your browser for quick recall.
- **Share URL** — Encode your current list selection into a URL to share with others.
- **Surprise Me** — Load a random word list at the click of a button.
- **Export** — Download your word set as a `.txt` file.
- **Dark mode** — Persistent, respects your system preference.
- **Word length filter** — Filter words by character count in all three tabs (Search, Builder, Custom).
- **PWA** — Installable, works offline after first load.
- **Mobile friendly** — Responsive layout for phones and tablets.

---

## Word Lists Included

| Category           | Lists                                                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Default            | English                                                                                                                             |
| Animals            | Animals, Birds, Bugs, Dinosaurs, Lizards, Mammals                                                                                   |
| Anime              | Adventure, Horror, Romance, Slice of Life                                                                                           |
| Brands             | Automotive, Fashion, Tech                                                                                                           |
| Countries          | Africa, America, Asia, Europe, Oceania                                                                                              |
| Difficulties       | Easy, Medium, Hard, Difficult                                                                                                       |
| Dungeons & Dragons | Grab Bag, Items, Monsters, Spells                                                                                                   |
| Famous People      | Actors, Musicians, YouTubers                                                                                                        |
| Food & Drinks      | Drinks, Foods, Vegetables                                                                                                           |
| Harry Potter       | Characters, General, Spells                                                                                                         |
| Languages          | French, German, Korean, Spanish                                                                                                     |
| Miscellaneous      | Meme, NSFW, Random Items                                                                                                            |
| Movies & Shows     | Action, Comedy, Crime, DC Universe, Horror, Marvel, Netflix, TV Series                                                              |
| Pokémon            | Gen 1–8                                                                                                                             |
| Sports             | Athletes, Sports                                                                                                                    |
| Video Games        | Fortnite, League of Legends, League of Legends (2), Minecraft, Mobile Legends, Nintendo, Overwatch Heroes, Roblox, Super Smash Bros |

---

## Deployment (Cloudflare Pages)

This is a zero-build static site. To deploy your own copy:

1. Fork this repository.
2. Connect the fork to [Cloudflare Pages](https://pages.cloudflare.com/).
3. Set **build command** to _(empty)_ and **output directory** to `/`.
4. Optionally add a custom domain in the CF Pages dashboard.

No `npm install`, no build step, no toolchain required.

---

## Contributing

Contributions are welcome via pull request. Please:

1. Fork the repository.
2. Make your changes on a feature branch.
3. Open a PR with a clear description of what was changed and why.
4. Ensure your changes comply with the [licence](#licence) — credit to the original author and a link back to this repository must be preserved.

Bug reports and feature requests are welcome via [GitHub Issues](https://github.com/cpwillis/skribbl/issues).

---

## Licence

This project is licensed under a **Custom Attribution Licence**. See [LICENSE](LICENSE) for full terms.

**Summary:** Free to use, fork, and modify. Derivative works must credit [cpwillis](https://github.com/cpwillis) and link back to this repository. No warranty provided.

---

## Credits

- Word lists sourced from the community and the skribbl.io default word database.
- Built by [cpwillis](https://github.com/cpwillis).
