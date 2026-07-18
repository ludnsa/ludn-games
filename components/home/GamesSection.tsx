import React from "react";
import Link from "next/link";
import { Swords, Globe, Gavel, Play } from "lucide-react";

const GAMES = [
  {
    id: "castle-war",
    title: "حرب القلاع",
    description: "لعبة استراتيجية تعتمد على الهجوم والدفاع، دمر قلاع خصمك لتنتصر.",
    icon: <Swords className="w-8 h-8 text-rose-500" />,
    path: "/games/castle-war",
    color: "from-rose-500 to-red-600",
  },
  {
    id: "world-domination",
    title: "السيطرة على العالم",
    description: "لعبة استراتيجية وتكتيكية لفرض نفوذك والسيطرة على القارات وتوسيع إمبراطوريتك.",
    icon: <Globe className="w-8 h-8 text-blue-500" />,
    path: "/games/world-domination",
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: "auction",
    title: "المزاد",
    description: "لعبة مزادية وتكتيكية لتحديد الفائز بالمزايدة على السؤال الصحيح.",
    icon: <Gavel className="w-8 h-8 text-amber-500" />,
    path: "/games/auction",
    color: "from-amber-500 to-yellow-600",
  },
];

const PlayfulGameCard = ({ game, index }: { game: any; index: number }) => {
  const getButtonColor = (id: string) => {
    if (id === "castle-war") return "bg-rose-500 border-rose-700 hover:bg-rose-400";
    if (id === "world-domination") return "bg-blue-500 border-blue-700 hover:bg-blue-400";
    if (id === "auction") return "bg-amber-500 border-amber-700 hover:bg-amber-400 text-slate-900";
    return "bg-blue-500 border-blue-700 hover:bg-blue-400";
  };

  const getCardStyles = (id: string) => {
    if (id === "castle-war")
      return {
        card: "border-rose-200 dark:border-rose-900/60 shadow-xl shadow-rose-100 dark:shadow-rose-900/20 hover:shadow-rose-200 dark:hover:shadow-rose-900/40",
        icon: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20",
      };
    if (id === "world-domination")
      return {
        card: "border-blue-200 dark:border-blue-900/60 shadow-xl shadow-blue-100 dark:shadow-blue-900/20 hover:shadow-blue-200 dark:hover:shadow-blue-900/40",
        icon: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20",
      };
    if (id === "auction")
      return {
        card: "border-amber-200 dark:border-amber-900/60 shadow-xl shadow-amber-100 dark:shadow-amber-900/20 hover:shadow-amber-200 dark:hover:shadow-amber-900/40",
        icon: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
      };
    return {
      card: "border-slate-200 dark:border-slate-900/60 shadow-xl shadow-slate-100 dark:shadow-slate-900/20 hover:shadow-slate-200 dark:hover:shadow-slate-900/40",
      icon: "bg-slate-50 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/20",
    };
  };

  const styles = getCardStyles(game.id);

  return (
    <Link href={game.path} className={`group relative flex flex-col h-full bg-white dark:bg-slate-800 rounded-3xl border-b-8 p-6 transition-all duration-300 hover:-translate-y-2 animate-in zoom-in-95 ${styles.card}`} style={{ animationDelay: `${index * 100}ms` }}>
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 border-b-4 group-hover:scale-110 transition-transform duration-300 ${styles.icon}`}>
        {game.icon}
      </div>
      <h2 className="text-2xl font-black mb-3 text-slate-800 dark:text-white">
        {game.title}
      </h2>
      <p className="font-bold text-sm leading-relaxed mb-8 flex-1 text-slate-500 dark:text-slate-400">
        {game.description}
      </p>

      <div className={`w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all text-white border-b-4 active:border-b-0 active:translate-y-1 ${getButtonColor(game.id)}`}>
        العرض الآن <Play size={18} className="fill-current" />
      </div>
    </Link>
  );
};

export const GamesSection = () => {
  return (
    <section id="games-section" className="max-w-7xl mx-auto w-full px-4 py-16 relative z-10 pt-16 md:pt-20">
      <div className="text-center mb-12 md:mb-16">
        <h2 className="text-3xl md:text-5xl font-black mb-3 md:mb-4 text-slate-900 dark:text-white">منصة الألعاب</h2>
        <p className="text-lg md:text-xl font-bold text-slate-500 dark:text-slate-400">جرب أنظمتنا الترفيهية والتفاعلية المبنية بأحدث التقنيات</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl mx-auto">
        {GAMES.map((game, index) => <PlayfulGameCard key={game.id} game={game} index={index} />)}
      </div>
    </section>
  );
};
