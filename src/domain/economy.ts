import { DEFAULT_TUNING, TuningConfig } from "./config";
import { EconomyState, ThemeUnlock } from "./types";

export function createEconomy(): EconomyState {
  return {
    balance: 0,
    ledger: [],
    unlockedThemeIds: ["starter"],
    rewardedAdsByDate: {},
  };
}

export interface Transaction {
  id: string;
  amount: number;
  reason: string;
  at: string;
  referenceId?: string;
}

/** All Token grants and spends enter through this immutable ledger operation. */
export function transact(
  state: EconomyState,
  transaction: Transaction,
): EconomyState {
  if (state.ledger.some((entry) => entry.id === transaction.id)) return state;
  if (!transaction.id || !Number.isSafeInteger(transaction.amount))
    throw new Error("INVALID_TRANSACTION");
  const balance = state.balance + transaction.amount;
  if (!Number.isSafeInteger(balance)) throw new Error("INVALID_BALANCE");
  if (balance < 0) throw new Error("INSUFFICIENT_BALANCE");
  return {
    ...state,
    balance,
    ledger: [
      ...state.ledger,
      {
        id: transaction.id,
        reason: transaction.reason,
        amount: transaction.amount,
        balanceAfter: balance,
        referenceId: transaction.referenceId,
        createdAt: transaction.at,
      },
    ],
  };
}

export function grantRewardedAd(
  state: EconomyState,
  reward: { receiptId: string; completed: boolean; date: string; at: string },
  config: TuningConfig = DEFAULT_TUNING,
): EconomyState {
  const id = `ad:${reward.receiptId}`;
  if (
    !reward.completed ||
    !reward.receiptId ||
    state.ledger.some((entry) => entry.id === id)
  )
    return state;
  const count = state.rewardedAdsByDate[reward.date] ?? 0;
  if (count >= config.rewardedAdDailyCap) return state;
  const credited = transact(state, {
    id,
    amount: config.rewardedAdTokens,
    reason: "REWARDED_AD",
    referenceId: reward.receiptId,
    at: reward.at,
  });
  return {
    ...credited,
    rewardedAdsByDate: {
      ...credited.rewardedAdsByDate,
      [reward.date]: count + 1,
    },
  };
}

export function unlockTheme(
  state: EconomyState,
  theme: ThemeUnlock,
  level: number,
  at: string,
): EconomyState {
  if (state.unlockedThemeIds.includes(theme.id)) return state;
  if (!Number.isSafeInteger(theme.tokenCost) || theme.tokenCost < 0)
    throw new Error("INVALID_PRICE");
  if (level < theme.unlockLevel) throw new Error("LEVEL_REQUIRED");
  const spent = transact(state, {
    id: `unlock:${theme.id}`,
    amount: -theme.tokenCost,
    reason: "THEME_UNLOCK",
    referenceId: theme.id,
    at,
  });
  return { ...spent, unlockedThemeIds: [...spent.unlockedThemeIds, theme.id] };
}
