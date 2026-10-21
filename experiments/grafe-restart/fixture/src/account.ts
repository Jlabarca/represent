export interface Account { id: string; active: boolean }
export const loadAccount = (id: string): Account => ({ id, active: true });
