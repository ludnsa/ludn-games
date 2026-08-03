import { PhoneCall, Shovel, Armchair, Zap, Repeat2, Megaphone, type LucideIcon } from "lucide-react";
import type { QuizLifelineKey } from "@/types";

/** أيقونة موحّدة لكل وسيلة مساعدة — تُستخدم في اللوحة، السؤال، الإجابة، ولوحة النتائج. */
export const QUIZ_LIFELINE_ICONS: Record<QuizLifelineKey, LucideIcon> = {
  call: PhoneCall,
  pit: Shovel,
  rest: Armchair,
  double: Zap,
  extraTurn: Repeat2,
  audience: Megaphone,
};
