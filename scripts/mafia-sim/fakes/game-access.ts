/** بديل @/app/actions/gameAccess للمحاكي: المنشئ دايماً عنده اشتراك */
export async function checkAccessAction(gameId: string) {
  void gameId;
  return { allowed: true, reason: "subscription" as const, availableTokens: 0 };
}

export async function consumeGameSessionAction() {
  return { success: true };
}
