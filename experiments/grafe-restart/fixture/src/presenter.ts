import type { Account } from "./account";
export function presentAccount(account: Account): string {
  return account.active ? `account:${account.id}` : "inactive";
}
