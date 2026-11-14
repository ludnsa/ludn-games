/**
 * بديل @/lib/supabase/server للمحاكي: مفتاح الخدمة = القاعدة الوهمية، والحساب المسجّل = اللي حدده المحاكي
 * (AsyncLocalStorage عشان كل "جهاز" يشتغل بحسابه حتى لو الطلبات متزامنة).
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { FakeSupabase } from "./fake-supabase";

export const simContext = new AsyncLocalStorage<{ userId: string | null }>();

let current: FakeSupabase | null = null;

export function setFakeSupabase(db: FakeSupabase) {
  current = db;
}

export function getSupabaseServiceRole(): FakeSupabase {
  if (!current) throw new Error("mafia-sim: ما انضبطت القاعدة الوهمية (setFakeSupabase)");
  return current;
}

export async function getGameUserId(): Promise<string | null> {
  return simContext.getStore()?.userId ?? null;
}

export async function getSupabaseServer(): Promise<never> {
  throw new Error("mafia-sim: getSupabaseServer ما يستخدمها كود المافيا");
}

/** ينفّذ دالة كأن المستخدم المسجّل هو userId (null = زائر) */
export function asUser<T>(userId: string | null, fn: () => Promise<T>): Promise<T> {
  return simContext.run({ userId }, fn);
}
