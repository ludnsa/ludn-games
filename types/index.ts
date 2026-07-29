// أنواع بيانات الحسابات (Profiles)
export interface UserProfile {
  id?: string;
  full_name: string;
  phone_number?: string;
  email?: string;
  available_tokens?: number;
}

// أنواع بيانات مكتبة الألعاب للمستخدم
export interface UserGame {
  id?: string;
  user_id: string;
  game_id: string;
  is_purchased: boolean;
  games_played: number;
}

export interface WDQuestion {
  q: string;
  options: string[];
  a: string;
}

// أنواع بيانات دول لعبة السيطرة على العالم (مبدئي)
export interface WDCountry {
  id: string;
  geoId: string;
  name: string;
  isActive: boolean;
  isChallenge: boolean;
  owner: 1 | 2 | null;
  lastOwner: 1 | 2 | null;
  value: number;
  originalValue: number;
  activeQuestion?: WDQuestion | null; 
  questions: WDQuestion[];
  forbiddenFor?: number[];
  isStolen?: boolean;
  wasOwnedBefore?: boolean;
}

export interface CWQuestion {
  q: string;
  options?: string[];
  a: string;
}

// ---------------------------------------------------------------
// أنواع بيانات لعبة تحدي الفئات (quiz-grid)
// مكتوبة يدوياً لتطابق ملف supabase/migrations/0001_quiz_grid.sql
// ---------------------------------------------------------------

export type QuizPoints = 200 | 400 | 600;
export type QuizTeam = 1 | 2;
export type QuizGameState = "setup" | "board" | "question" | "answer" | "gameOver";
export type QuizLifeline = "call" | "pit" | "rest";

export interface QuizCategory {
  id: string;
  slug: string;
  name_ar: string;
  is_active: boolean;
  created_at?: string;
}

export interface QuizQuestion {
  id: string;
  category_id: string;
  external_ref: string | null;
  question_text: string;
  answer_text: string;
  points: QuizPoints;
  question_image: string | null;
  question_image_alt: string | null;
  answer_image: string | null;
  answer_image_alt: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// صف الغرفة — يُبث عبر Realtime لأجهزة اللاعبين، لذلك لا يحتوي على
// أي نص سؤال أو إجابة بشكل مقصود.
export interface QuizRoom {
  room_code: string;
  host_user_id: string | null;
  game_state: QuizGameState;
  t1_name: string;
  t2_name: string;
  t1_score: number;
  t2_score: number;
  turn: QuizTeam;
  t1_call_used: boolean;
  t1_pit_used: boolean;
  t1_rest_used: boolean;
  t2_call_used: boolean;
  t2_pit_used: boolean;
  t2_rest_used: boolean;
  active_cell_id: string | null;
  is_question_revealed: boolean;
  call_friend_active: boolean;
  pit_active_team: QuizTeam | null;
  rest_target_player_id: string | null;
  question_deadline_at: string | null;
  is_timer_running: boolean;
  winner_team: 0 | 1 | 2 | null;
  ended_at: string | null;
  created_at?: string;
  updated_at?: string;
}

// خلية من لوحة الـ 36 — لقطة ثابتة تُسحب مرة واحدة عند بداية الجلسة
export interface QuizSessionCell {
  id: string;
  room_code: string;
  question_id: string | null;
  column_index: number;
  row_index: number;
  category_id: string | null;
  category_name_ar: string;
  points: QuizPoints;
  question_text: string;
  answer_text: string;
  question_image: string | null;
  question_image_alt: string | null;
  answer_image: string | null;
  answer_image_alt: string | null;
  status: "available" | "consumed";
  awarded_team: QuizTeam | null;
}

// نسخة الخلية الآمنة للوحة: بدون نص السؤال أو الإجابة
export type QuizBoardCell = Pick<
  QuizSessionCell,
  "id" | "column_index" | "row_index" | "category_name_ar" | "points" | "status" | "awarded_team"
>;

export interface QuizSessionPlayer {
  id: string;
  room_code: string;
  device_id: string;
  display_name: string;
  team: QuizTeam;
  joined_at?: string;
}