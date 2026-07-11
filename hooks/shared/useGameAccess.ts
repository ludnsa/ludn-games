import { getSupabaseBrowser } from "@/lib/supabase/client";
import { consumeGameSessionAction } from "@/app/actions/gameAccess";

export type AccessReason = "free_trial" | "paid" | "no_tokens" | "error";

export function useGameAccess() {
  const supabase = getSupabaseBrowser();

  const checkAccess = async (gameId: string, userId: string): Promise<{ allowed: boolean; reason: AccessReason; availableTokens: number }> => {
    try {
      // 1. Get user profile for tokens
      const { data: profile } = await supabase
        .from("profiles")
        .select("available_tokens")
        .eq("id", userId)
        .maybeSingle();

      const tokens = profile?.available_tokens || 0;

      // 2. Get user game record to check if THIS game is purchased
      const { data: userGame } = await supabase
        .from("user_games")
        .select("is_purchased")
        .eq("user_id", userId)
        .eq("game_id", gameId)
        .maybeSingle();

      const isPurchased = userGame?.is_purchased || false;

      // Rule 1: Lifetime purchased
      if (isPurchased) {
        return { allowed: true, reason: "paid", availableTokens: tokens };
      }

      // 3. Get TOTAL games played across ALL games to check global free trial
      const { data: allGames } = await supabase
        .from("user_games")
        .select("games_played")
        .eq("user_id", userId);

      let totalGamesPlayed = 0;
      if (allGames) {
        totalGamesPlayed = allGames.reduce((acc, g) => acc + (g.games_played || 0), 0);
      }

      // Rule 2: Global Free Trial (only if they never played ANY game)
      if (totalGamesPlayed === 0) {
        return { allowed: true, reason: "free_trial", availableTokens: tokens };
      }

      // Rule 3: Has Tokens
      if (tokens > 0) {
        return { allowed: true, reason: "paid", availableTokens: tokens };
      }

      // Blocked
      return { allowed: false, reason: "no_tokens", availableTokens: tokens };
    } catch (err) {
      console.error("Error checking game access:", err);
      return { allowed: false, reason: "error", availableTokens: 0 };
    }
  };

  const consumeGameSession = async (gameId: string, userId: string, reason: AccessReason) => {
    try {
      // Call Server Action to bypass RLS and ensure tables are updated
      await consumeGameSessionAction(gameId, userId, reason);
    } catch (err) {
      console.error("Error consuming game session via action:", err);
    }
  };

  const getAvailableTokens = async (userId: string): Promise<number> => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("available_tokens")
      .eq("id", userId)
      .maybeSingle();
    
    return profile?.available_tokens || 0;
  };

  return { checkAccess, consumeGameSession, getAvailableTokens };
}
