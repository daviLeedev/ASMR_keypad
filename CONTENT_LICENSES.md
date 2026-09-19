# Content provenance

The bundled KeyLingo engineering seed in `content/seed.ts` was originally authored for this project. It contains 92 word pairs and 30 short expression/sentence pairs, expanded into 244 directional learning items. No dictionary, web corpus, translation API, or commercial dataset was scraped or copied.

The seed and generated packs are offered under the repository's 0BSD license. No third-party content attribution is required. These are small, reviewed engineering examples, not a claim of a production curriculum or independent professional linguistic certification.

English targets use lowercase and omit terminal punctuation deliberately for the compact keyboard exercises. Full sentence matching accepts only the canonical target and listed variants. Korean polite forms are taught consistently in sentence exercises; synonyms are explicit. Categories supply context for homonyms (for example tea, horse, snow, boat). A human bilingual curriculum review remains recommended before expanding the teaching corpus.

`npm run content:validate` validates both directions without changing files. `npm run content:validate -- --write` generates versioned JSON packs and the machine-readable `content/packs/sources.json` attribution report. `npm run content:validate -- --input path/to/pack.json` validates an external pack; imported sources must have an explicit license/attribution entry added here before distribution.

Checksums are SHA-256 of UTF-8 JSON for the normalized item array in schema field order. Import validates NFC, language direction, required fields, aliases, item count, conflicting IDs and checksum before any SQLite mutation. Exact duplicate rows are removed and semantic duplicates merge aliases. Updates require an incremented version; older packs cannot replace newer installed packs. Pack integrity checks detect accidental corruption; they are not cryptographic proof of an untrusted publisher's identity.

Permission to use, copy, modify, and/or distribute this software and content for any purpose with or without fee is hereby granted.

THE SOFTWARE AND CONTENT ARE PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE AND CONTENT INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE AND CONTENT.
