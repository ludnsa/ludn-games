import { z } from "zod";

export const ContactMessageSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون أكثر من حرفين"),
  phone: z.string().min(9, "رقم الجوال غير صحيح"),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  message: z.string().min(10, "الرسالة قصيرة جداً").max(200, "الرسالة طويلة جداً الحد الأقصى 200 حرف"),
});

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2, "الاسم الثنائي مطلوب"),
  phoneNumber: z.string().optional(),
});

// ---------------------------------------------------------------
// مخططات لعبة تحدي الفئات (quiz-grid)
// كل تعديل على الجلسة يمر عبر Server Action ويُتحقق منه هنا أولاً
// ---------------------------------------------------------------

export const QuizRoomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^Q[A-Z0-9]{4}$/, "رمز الغرفة غير صحيح");

export const QuizStartSessionSchema = z.object({
  roomCode: QuizRoomCodeSchema,
  categoryIds: z.array(z.uuid("معرّف فئة غير صحيح")).length(6, "يجب اختيار 6 فئات بالضبط"),
  t1Name: z.string().trim().min(1, "اسم الفريق الأول مطلوب").max(30, "اسم الفريق طويل جداً"),
  t2Name: z.string().trim().min(1, "اسم الفريق الثاني مطلوب").max(30, "اسم الفريق طويل جداً"),
});

export const QuizSelectCellSchema = z.object({
  roomCode: QuizRoomCodeSchema,
  cellId: z.uuid("معرّف الخلية غير صحيح"),
});

export const QuizResolveSchema = z.object({
  roomCode: QuizRoomCodeSchema,
  // null = لا أحد أجاب
  awardedTeam: z.union([z.literal(1), z.literal(2), z.null()]),
});

export const QuizLifelineSchema = z.object({
  roomCode: QuizRoomCodeSchema,
  team: z.union([z.literal(1), z.literal(2)]),
  kind: z.enum(["call", "pit", "rest"]),
  targetPlayerId: z.uuid().nullable().optional(),
});

export const QuizJoinSchema = z.object({
  roomCode: QuizRoomCodeSchema,
  deviceId: z.string().trim().min(6, "معرّف الجهاز غير صحيح").max(100),
  displayName: z.string().trim().min(2, "الاسم قصير جداً").max(20, "الاسم طويل جداً"),
  team: z.union([z.literal(1), z.literal(2)]),
});

// Schema for World Domination room sync
export const WDRoomPayloadSchema = z.object({
  game_state: z.string().optional(),
  team1_name: z.string().optional(),
  team2_name: z.string().optional(),
  score1: z.number().optional(),
  score2: z.number().optional(),
  turn: z.number().optional(),
  timer: z.number().optional(),
  current_country_id: z.string().nullable().optional(),
  active_question: z.any().optional(), // Using any for nested complex objects to avoid overly strict schema breaking game
  team1_choice: z.string().nullable().optional(),
  team2_choice: z.string().nullable().optional(),
  show_result: z.boolean().optional(),
  is_attacking: z.boolean().optional(),
  is_question_revealed: z.boolean().optional(),
  cards1: z.any().optional(),
  cards2: z.any().optional(),
  protected_countries: z.any().optional(),
  challenges_used1: z.any().optional(),
  challenges_used2: z.any().optional(),
  map_position: z.any().optional(),
  capitals: z.any().optional(),
  stolen_capital_alert: z.string().nullable().optional(),
  spied_country_id: z.string().nullable().optional(),
  countries: z.array(z.any()).optional(),
}).passthrough();
