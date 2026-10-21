import { loadAccount, type Account } from "./account";
import { presentAccount } from "./presenter";
export function run(id: string): string {
  const account: Account = loadAccount(id);
  return presentAccount(account);
}
