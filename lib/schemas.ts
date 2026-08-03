import { z } from "zod";

export const ContactMessageSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون أكثر من حرفين"),
  phone: z.string().min(9, "رقم الجوال غير صحيح"),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  message: z.string().min(10, "الرسالة قصيرة جداً").max(200, "الرسالة طويلة جداً الحد الأقصى 200 حرف"),
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

// المرحلة الأولى: اختيار الفئات وسحب الأسئلة (ثقيلة، لا تحصم رمزاً)
export const QuizPrepareSessionSchema = z.object({
  roomCode: QuizRoomCodeSchema,
  categoryIds: z
    .array(z.uuid("معرّف فئة غير صحيح"))
    .min(2, "اختر فئتين على الأقل")
    .max(6, "لا يمكن اختيار أكثر من 6 فئات"),
});

// وسائل المساعدة الستّ — القائمة الكاملة معرَّفة في constants/quiz-grid.ts،
// لكن zod يحتاج قائمة حرفية ثابتة عند البناء فنكررها هنا حرفياً
export const QuizLifelineKeySchema = z.enum([
  "call",
  "pit",
  "rest",
  "double",
  "extraTurn",
  "audience",
]);

// كل فريق يختار 3 وسائل بالضبط، بلا تكرار
const QuizLifelineLoadoutSchema = z
  .array(QuizLifelineKeySchema)
  .length(3, "اختر 3 وسائل مساعدة بالضبط")
  .refine((arr) => new Set(arr).size === arr.length, "لا يمكن اختيار الوسيلة نفسها مرتين");

// المرحلة الثانية: أسماء الفرق، مدة السؤال، ووسائل المساعدة (خفيفة، تبدأ اللعبة فعلياً)
export const QuizStartSessionSchema = z.object({
  roomCode: QuizRoomCodeSchema,
  t1Name: z.string().trim().min(1, "اسم الفريق الأول مطلوب").max(30, "اسم الفريق طويل جداً"),
  t2Name: z.string().trim().min(1, "اسم الفريق الثاني مطلوب").max(30, "اسم الفريق طويل جداً"),
  timerSeconds: z
    .number()
    .int("مدة السؤال يجب أن تكون رقماً صحيحاً")
    .min(15, "أقل مدة للسؤال 15 ثانية")
    .max(300, "أكثر مدة للسؤال 300 ثانية"),
  t1Lifelines: QuizLifelineLoadoutSchema,
  t2Lifelines: QuizLifelineLoadoutSchema,
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
  kind: QuizLifelineKeySchema,
  targetPlayerId: z.uuid().nullable().optional(),
});

export const QuizJoinSchema = z.object({
  roomCode: QuizRoomCodeSchema,
  deviceId: z.string().trim().min(6, "معرّف الجهاز غير صحيح").max(100),
  displayName: z.string().trim().min(2, "الاسم قصير جداً").max(20, "الاسم طويل جداً"),
  team: z.union([z.literal(1), z.literal(2)]),
});
