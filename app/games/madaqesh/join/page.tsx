import MadaqeshApp from "@/components/games/madaqesh/MadaqeshApp";

/**
 * صفحة انضمام اللاعبين — متاحة بدون تسجيل دخول.
 * مسار /join مستثنى في middleware.ts مثل بقية مسارات انضمام الألعاب.
 */
export default function MadaqeshJoinPage() {
  return <MadaqeshApp mode="join" />;
}
