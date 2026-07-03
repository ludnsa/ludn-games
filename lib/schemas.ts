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
