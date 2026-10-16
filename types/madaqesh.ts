// =====================================================================
// حاسبة مداقش
// =====================================================================

export type MadaqeshPhase =
  | "lobby"
  /** السوم: دورة وحدة بالترتيب */
  | "bidding"
  /** صاحب أعلى سومة يقرر: توزيع / تثبيت / فرصة انسحاب / الجميع ثابت */
  | "deciding"
  /** اللاعبين يردون: يرضى أو يعترض (أو ينسحب ولا يكمل في فرصة الانسحاب) */
  | "responding"
  /** المداقشة على الطاولة — ينسجّل صاحب أقوى ورق */
  | "showdown"
  /** نتيجة الجولة (الأرصدة الجديدة) قبل الجولة الجاية */
  | "result"
  | "ended"
  | "closed";

export interface MadaqeshSettings {
  startBalance: number;
  targetAmount: number;
  /** كم مرة يقدر يفلس ويرجع (برصيد 5000) قبل ما يطلع */
  maxBankrupts: number;
  /** الغرفة انقفلت لأن المنشئ فتح غرفة جديدة بهذا الكود */
  movedTo?: string;
}

export type MadaqeshBidKind = "bid" | "allin" | "pass";

export interface MadaqeshBid {
  amount: number;
  kind: MadaqeshBidKind;
}

/**
 * distribute = توزيع (بالتساوي أو على مزاجه) مع تثبيت اختياري
 * withdraw   = فرصة انسحاب: كل واحد ينسحب أو يكمل ويداقش
 * all_fixed  = الجميع ثابت: كل اللي سام يداقش بسومته
 */
export type MadaqeshDecisionMode = "distribute" | "withdraw" | "all_fixed";

export interface MadaqeshDecision {
  mode: MadaqeshDecisionMode;
  /** نصيب كل لاعب من السومة (التوزيع فقط) */
  shares: Record<string, number>;
  /** اللاعبين المثبتين — لازم يداقشون */
  fixed: string[];
}

/** accept = رضى بالتوزيعة، object = أعترض، withdraw = انسحب، stay = يكمل ويداقش */
export type MadaqeshResponse = "accept" | "object" | "withdraw" | "stay";

export interface MadaqeshRoundResult {
  /** تغيّر رصيد كل لاعب في الجولة */
  deltas: Record<string, number>;
  /** مين فاز بالمداقشة (لو صار فيه مداقشة) — null لو تعادل */
  winnerId: string | null;
  /** كل الفايزين: واحد، أو أكثر لو تعادل */
  winnerIds?: string[];
  /** اللي أفلسوا ورجعوا 5000 */
  revived: string[];
  /** اللي خلصت فرصهم وطلعوا */
  eliminated: string[];
  /** جولة ما سام فيها أحد */
  void?: boolean;
}

export interface MadaqeshRound {
  /** ترتيب السوم في هالجولة (يبدأ من اللي بعد بادئ الجولة اللي قبل) */
  order: string[];
  /** دور مين في السوم (رقم في order) */
  turn: number;
  bids: Record<string, MadaqeshBid>;
  deciderId: string | null;
  decision: MadaqeshDecision | null;
  responses: Record<string, MadaqeshResponse>;
  result: MadaqeshRoundResult | null;
}

export interface MadaqeshRoom {
  room_code: string;
  host_user_id: string;
  host_player_id: string | null;
  phase: MadaqeshPhase;
  phase_seq: number;
  phase_ends_at: string | null;
  settings: MadaqeshSettings;
  round_number: number;
  round: MadaqeshRound | null;
  winner_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MadaqeshPlayer {
  id: string;
  room_code: string;
  display_name: string;
  seat: number;
  balance: number;
  bankrupts: number;
  is_out: boolean;
  is_bot: boolean;
  joined_at?: string;
}

/** سجل جولة — للعرض والتراجع */
export interface MadaqeshHistoryRow {
  id: string;
  room_code: string;
  round: number;
  data: {
    round: MadaqeshRound;
    /** الأرصدة قبل الجولة — للتراجع */
    before: { id: string; balance: number; bankrupts: number; is_out: boolean }[];
  };
  created_at: string;
}
