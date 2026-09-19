# Content Pipeline

## 1. Goal

Support a small reviewed seed dataset now and scalable content packs later.

## 2. Content pack manifest

Example:

```json
{
  "id": "ko-en-core",
  "version": 1,
  "schemaVersion": 1,
  "sourceLanguage": "ko",
  "targetLanguage": "en",
  "itemCount": 500,
  "checksum": "..."
}
```

Validate manifests and item payloads with Zod before import.

## 3. Import pipeline

Pipeline steps:

1. ingest source data,
2. normalize language codes and Unicode,
3. map prompt / canonical answer / accepted answers,
4. remove obvious duplicates,
5. validate required fields,
6. run content-specific sanity checks,
7. output versioned pack,
8. generate license/source attribution report,
9. import into local SQLite.

## 4. Data licensing

Never scrape or redistribute commercial dictionary data with unclear rights.

Create and maintain:

- `CONTENT_LICENSES.md`
- `ASSET_LICENSES.md`

If external open datasets are used, record:

- dataset name,
- source URL,
- license,
- attribution requirements,
- transformation performed.

## 5. Ambiguous meanings

Content must support multiple accepted answers.

Example:

```json
{
  "prompt": "큰",
  "acceptedAnswers": ["big", "large"]
}
```

For sentences, do not assume all semantically valid translations are accepted. Treat the learned canonical target sentence and explicitly listed variants as accepted answers.

## 6. User mastery integration

Content selection should be able to query by:

- learning stage,
- mastery score,
- next review date,
- recent wrong answer,
- category,
- difficulty.

Word Rain should weight due/weak review items rather than random content only.
