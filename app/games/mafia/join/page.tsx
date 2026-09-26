import MafiaApp from "@/components/games/mafia/MafiaApp";

/**
 * صفحة انضمام اللاعبين — متاحة بدون تسجيل دخول.
 * مسار /join مستثنى في middleware.ts مثل بقية مسارات انضمام الألعاب.
 */
export default function MafiaJoinPage() {
  return <MafiaApp mode="join" />;
}
