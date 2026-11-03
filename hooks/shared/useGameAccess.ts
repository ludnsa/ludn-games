import { consumeGameSessionAction, checkAccessAction } from "@/app/actions/gameAccess";

export type AccessReason = "free_trial" | "paid" | "subscription" | "no_tokens" | "error";

export function useGameAccess() {

  const checkAccess = async (gameId: string, userId: string): Promise<{ allowed: boolean; reason: AccessReason; availableTokens: number }> => {
    try {
      // استخدام Server Action لتجاوز RLS والحصول على بيانات دقيقة
      const result = await checkAccessAction(gameId);
      return result as { allowed: boolean; reason: AccessReason; availableTokens: number };
    } catch (err) {
      console.error("Error checking game access:", err);
      return { allowed: false, reason: "error", availableTokens: 0 };
    }
  };

  const consumeGameSession = async (gameId: string, userId: string, reason: AccessReason) => {
    try {
      await consumeGameSessionAction(gameId, userId, reason);
    } catch (err) {
      console.error("Error consuming game session via action:", err);
    }
  };

  return { checkAccess, consumeGameSession };
}
