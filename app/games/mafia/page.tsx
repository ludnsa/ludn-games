import MafiaApp from "@/components/games/mafia/MafiaApp";

/** صفحة منشئ لعبة المافيا — تحتاج تسجيل دخول (middleware.ts) */
export default function MafiaHostPage() {
  return <MafiaApp mode="host" />;
}
