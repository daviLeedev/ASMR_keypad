# BM / Economy Spec

## 1. Philosophy

Monetization must sit behind the product loop, not replace it.

Rules:

- no pay-to-win,
- no forced ads in MVP,
- no progression wall requiring payment,
- no gacha/loot box,
- no subscription in MVP,
- store pricing always comes from platform APIs.

## 2. Soft currency

Single currency: `Token`.

Token sources:

- completed Recall/Speed/Word Rain sessions,
- Daily Goal,
- streak milestone,
- level-up,
- limited Rewarded Ad.

Guided mode gives minimal or no Token reward.

## 3. Rewarded Ads

Suggested initial config:

- max 3 rewarded completions/day,
- +10 Token each,
- only offered at natural breaks such as result/reward screen,
- never auto-play.

If ad fails, do not break session flow.

## 4. IAP

MVP Starter Pack example:

- exclusive cosmetic keyboard theme,
- 500 Token,
- small Streak Freeze bundle.

The exact SKU, price, and package contents must be configuration-driven and loaded from store/provider APIs where applicable.

## 5. Keyboard price hypothesis

Initial tuning only:

- entry themes: 300-500 Token,
- mid themes: 600-900 Token,
- premium soft-currency themes: 1,000-1,500 Token.

Some themes may require both level threshold and Token spend.

## 6. Economy safety

Use an economy ledger.

All grants/spends must pass through a single economy service.

Tests must cover:

- insufficient balance,
- duplicate grant protection where applicable,
- reward-ad daily cap,
- keyboard unlock idempotency,
- level/token unlock gates.
