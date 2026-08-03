"use server";

import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { QUIZ_CONFIG } from "@/constants/quiz-grid";
import {
  findCoverageGaps,
  summarizeCoverage,
  type QuizImportRow,
  type QuizCoverage,
} from "@/lib/quiz-import";
import type { QuizCategory, QuizPoints, QuizQuestion } from "@/types";

/**
 * إدارة بنك أسئلة "تحدي الفئات".
 * كل دالة هنا تعيد التحقق من صلاحية المدير بنفسها — لا نعتمد على
 * middleware وحده، لأن Server Actions يمكن استدعاؤها مباشرة.
 */

type AdminResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : { data: T }))
  | { success: false; error: string };

function fail(error: string): { success: false; error: string } {
  return { success: false, error };
}

/**
 * نفس شرط middleware.ts: app_metadata.role === 'admin'
 * الحقل `ok` مُميِّز صريح ليعمل تضييق النوع في كل مواضع الاستدعاء.
 */
type AdminContext =
  | { ok: false; error: string }
  | { ok: true; admin: ReturnType<typeof getSupabaseServiceRole>; userId: string };

async function requireAdmin(): Promise<AdminContext> {
  const userClient = await getSupabaseServer();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) return { ok: false, error: "يجب تسجيل الدخول." };
  if (user.app_metadata?.role !== "admin") {
    return { ok: false, error: "هذه الصفحة للمدراء فقط." };
  }

  return { ok: true, admin: getSupabaseServiceRole(), userId: user.id };
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s/\\]+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------
// الفئات
// ---------------------------------------------------------------------

export interface QuizAdminCategory extends QuizCategory {
  image_url: string | null;
}

export async function listQuizCategories(): Promise<AdminResult<QuizAdminCategory[]>> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return fail(ctx.error);

  const { data, error } = await ctx.admin
    .from("quiz_categories")
    .select("*")
    .order("name_ar", { ascending: true });

  if (error) {
    console.error("listQuizCategories error:", error);
    return fail("تعذّر جلب الفئات.");
  }

  const categories = (data || []) as QuizCategory[];
  const paths = categories.map((c) => c.image_path).filter((p): p is string => Boolean(p));

  const signed: Record<string, string> = {};
  if (paths.length > 0) {
    const { data: urls } = await ctx.admin.storage
      .from(QUIZ_CONFIG.MEDIA_BUCKET)
      .createSignedUrls(paths, 60 * 30);
    urls?.forEach((u) => {
      if (u.path && u.signedUrl) signed[u.path] = u.signedUrl;
    });
  }

  return {
    success: true,
    data: categories.map((c) => ({
      ...c,
      image_url: c.image_path ? signed[c.image_path] ?? null : null,
    })),
  };
}

export async function saveQuizCategory(input: {
  id?: string | null;
  name_ar: string;
  slug?: string;
  is_active?: boolean;
  image_path?: string | null;
  image_alt?: string | null;
}): Promise<AdminResult<QuizCategory>> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return fail(ctx.error);

  const nameAr = input.name_ar?.trim();
  if (!nameAr) return fail("اسم الفئة مطلوب.");

  const slug = slugify(input.slug || nameAr);
  if (!slug) return fail("تعذّر توليد معرّف للفئة، اكتب معرّفاً بالإنجليزية.");

  // صورة الفئة تحتاج وصفاً عربياً — نفس شرط صور الأسئلة
  if (input.image_path && !input.image_alt?.trim()) {
    return fail("اكتب وصفاً عربياً لصورة الفئة.");
  }

  const payload = {
    name_ar: nameAr,
    slug,
    is_active: input.is_active ?? true,
    image_path: input.image_path || null,
    image_alt: input.image_path ? input.image_alt?.trim() || null : null,
  };

  const query = input.id
    ? ctx.admin.from("quiz_categories").update(payload).eq("id", input.id).select().single()
    : ctx.admin.from("quiz_categories").insert(payload).select().single();

  const { data, error } = await query;

  if (error) {
    if (error.code === "23505") return fail(`المعرّف "${slug}" مستخدم في فئة أخرى.`);
    console.error("saveQuizCategory error:", error);
    return fail("تعذّر حفظ الفئة.");
  }

  return { success: true, data: data as QuizCategory };
}

export async function deleteQuizCategory(id: string): Promise<AdminResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return fail(ctx.error);

  const { count } = await ctx.admin
    .from("quiz_questions")
    .select("*", { count: "exact", head: true })
    .eq("category_id", id);

  if ((count || 0) > 0) {
    return fail(`لا يمكن حذف فئة تحتوي على ${count} سؤال. احذف أسئلتها أولاً أو عطّلها.`);
  }

  const { data: category } = await ctx.admin
    .from("quiz_categories")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await ctx.admin.from("quiz_categories").delete().eq("id", id);
  if (error) return fail("تعذّر حذف الفئة.");

  if (category?.image_path) {
    await ctx.admin.storage.from(QUIZ_CONFIG.MEDIA_BUCKET).remove([category.image_path]);
  }

  return { success: true };
}

// ---------------------------------------------------------------------
// الأسئلة
// ---------------------------------------------------------------------

export interface QuizAdminQuestion extends QuizQuestion {
  question_image_url: string | null;
  answer_image_url: string | null;
}

export async function listQuizQuestions(filters?: {
  categoryId?: string | null;
  points?: QuizPoints | null;
  activeOnly?: boolean | null;
}): Promise<AdminResult<QuizAdminQuestion[]>> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return fail(ctx.error);

  let query = ctx.admin.from("quiz_questions").select("*").order("created_at", { ascending: false });

  if (filters?.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters?.points) query = query.eq("points", filters.points);
  if (filters?.activeOnly === true) query = query.eq("is_active", true);
  if (filters?.activeOnly === false) query = query.eq("is_active", false);

  const { data, error } = await query;
  if (error) {
    console.error("listQuizQuestions error:", error);
    return fail("تعذّر جلب الأسئلة.");
  }

  const questions = (data || []) as QuizQuestion[];
  const paths = questions
    .flatMap((q) => [q.question_image, q.answer_image])
    .filter((p): p is string => Boolean(p));

  const signed: Record<string, string> = {};
  if (paths.length > 0) {
    const { data: urls } = await ctx.admin.storage
      .from(QUIZ_CONFIG.MEDIA_BUCKET)
      .createSignedUrls(paths, 60 * 30);
    urls?.forEach((u) => {
      if (u.path && u.signedUrl) signed[u.path] = u.signedUrl;
    });
  }

  return {
    success: true,
    data: questions.map((q) => ({
      ...q,
      question_image_url: q.question_image ? signed[q.question_image] ?? null : null,
      answer_image_url: q.answer_image ? signed[q.answer_image] ?? null : null,
    })),
  };
}

export async function saveQuizQuestion(input: {
  id?: string | null;
  category_id: string;
  external_ref?: string | null;
  question_text: string;
  answer_text: string;
  points: QuizPoints;
  question_image?: string | null;
  question_image_alt?: string | null;
  answer_image?: string | null;
  answer_image_alt?: string | null;
  is_active?: boolean;
}): Promise<AdminResult<QuizQuestion>> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return fail(ctx.error);

  const questionText = input.question_text?.trim();
  const answerText = input.answer_text?.trim();

  if (!input.category_id) return fail("اختر فئة للسؤال.");
  if (!questionText) return fail("نص السؤال مطلوب.");
  if (!answerText) return fail("نص الإجابة مطلوب.");
  if (![200, 400, 600].includes(input.points)) return fail("قيمة النقاط يجب أن تكون 200 أو 400 أو 600.");

  // كل صورة تحتاج وصفاً عربياً — شرط إلزامي في لوحة التحكم
  if (input.question_image && !input.question_image_alt?.trim()) {
    return fail("اكتب وصفاً عربياً لصورة السؤال.");
  }
  if (input.answer_image && !input.answer_image_alt?.trim()) {
    return fail("اكتب وصفاً عربياً لصورة الإجابة.");
  }

  const payload = {
    category_id: input.category_id,
    external_ref: input.external_ref?.trim() || null,
    question_text: questionText,
    answer_text: answerText,
    points: input.points,
    question_image: input.question_image || null,
    question_image_alt: input.question_image_alt?.trim() || null,
    answer_image: input.answer_image || null,
    answer_image_alt: input.answer_image_alt?.trim() || null,
    is_active: input.is_active ?? true,
  };

  const query = input.id
    ? ctx.admin.from("quiz_questions").update(payload).eq("id", input.id).select().single()
    : ctx.admin.from("quiz_questions").insert(payload).select().single();

  const { data, error } = await query;

  if (error) {
    if (error.code === "23505") return fail("يوجد سؤال آخر بنفس قيمة external_ref.");
    console.error("saveQuizQuestion error:", error);
    return fail("تعذّر حفظ السؤال.");
  }

  return { success: true, data: data as QuizQuestion };
}

export async function deleteQuizQuestion(id: string): Promise<AdminResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return fail(ctx.error);

  const { data: question } = await ctx.admin
    .from("quiz_questions")
    .select("question_image, answer_image")
    .eq("id", id)
    .maybeSingle();

  const { error } = await ctx.admin.from("quiz_questions").delete().eq("id", id);
  if (error) return fail("تعذّر حذف السؤال.");

  // تنظيف الصور المرتبطة (لا نُفشل العملية إن تعذّر الحذف)
  const paths = [question?.question_image, question?.answer_image].filter(
    (p): p is string => Boolean(p)
  );
  if (paths.length > 0) {
    await ctx.admin.storage.from(QUIZ_CONFIG.MEDIA_BUCKET).remove(paths);
  }

  return { success: true };
}

// ---------------------------------------------------------------------
// الصور
// ---------------------------------------------------------------------

/**
 * يستقبل ملف صورة (محوّلاً إلى WebP في المتصفح مسبقاً) ويرفعه للـ bucket الخاص.
 * يعيد المسار داخل التخزين — لا رابطاً عاماً، فالـ bucket خاص.
 */
export async function uploadQuizMedia(formData: FormData): Promise<AdminResult<{ path: string }>> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return fail(ctx.error);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("لم يتم استلام ملف صالح.");

  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) return fail("حجم الصورة يتجاوز 5 ميجابايت.");
  if (!file.type.startsWith("image/")) return fail("الملف المرفوع ليس صورة.");

  const kind = String(formData.get("kind") || "question");
  const folder = kind === "answer" ? "answers" : kind === "category" ? "categories" : "questions";
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const path = `${folder}/${unique}.webp`;

  const { error } = await ctx.admin.storage
    .from(QUIZ_CONFIG.MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type || "image/webp", upsert: false });

  if (error) {
    console.error("uploadQuizMedia error:", error);
    return fail("تعذّر رفع الصورة.");
  }

  return { success: true, data: { path } };
}

// ---------------------------------------------------------------------
// الرفع الجماعي — نفس قواعد سكربت الاستيراد
// ---------------------------------------------------------------------

export interface QuizBulkResult {
  inserted: number;
  updated: number;
  createdCategories: string[];
  coverage: QuizCoverage;
  gaps: string[];
  warnings: string[];
}

/**
 * يستورد صفوفاً تم التحقق منها في المتصفح عبر lib/quiz-import.
 * الصور غير مدعومة هنا — الرفع الجماعي للنصوص فقط، والصور تُضاف
 * من نموذج السؤال أو عبر سكربت scripts/import-questions.ts.
 */
export async function bulkImportQuizQuestions(
  rows: QuizImportRow[]
): Promise<AdminResult<QuizBulkResult>> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return fail(ctx.error);

  if (!Array.isArray(rows) || rows.length === 0) return fail("لا توجد صفوف للاستيراد.");

  const warnings: string[] = [];
  const slugs = Array.from(new Set(rows.map((r) => r.category_slug)));

  const { data: existing } = await ctx.admin
    .from("quiz_categories")
    .select("id, slug")
    .in("slug", slugs);

  const idBySlug = new Map<string, string>((existing || []).map((c) => [c.slug, c.id]));
  const createdCategories: string[] = [];

  for (const slug of slugs) {
    if (idBySlug.has(slug)) continue;
    const { data, error } = await ctx.admin
      .from("quiz_categories")
      .insert({ slug, name_ar: slug, is_active: true })
      .select("id, slug")
      .single();

    if (error || !data) {
      console.error("bulkImport category error:", error);
      return fail(`تعذّر إنشاء الفئة "${slug}".`);
    }
    idBySlug.set(slug, data.id);
    createdCategories.push(slug);
  }

  // الصفوف التي تحمل external_ref تُحدَّث بدل تكرارها
  const refs = rows.map((r) => r.external_ref).filter((r): r is string => Boolean(r));
  const knownRefs = new Set<string>();
  if (refs.length > 0) {
    const { data: found } = await ctx.admin
      .from("quiz_questions")
      .select("external_ref")
      .in("external_ref", refs);
    found?.forEach((f: { external_ref: string | null }) => {
      if (f.external_ref) knownRefs.add(f.external_ref);
    });
  }

  const withRef = rows.filter((r) => r.external_ref);
  const withoutRef = rows.filter((r) => !r.external_ref);

  const toPayload = (r: QuizImportRow) => ({
    category_id: idBySlug.get(r.category_slug)!,
    external_ref: r.external_ref,
    question_text: r.question_text,
    answer_text: r.answer_text,
    points: r.points,
    question_image: r.question_image,
    question_image_alt: r.question_image_alt,
    answer_image: r.answer_image,
    answer_image_alt: r.answer_image_alt,
    is_active: true,
  });

  if (withRef.length > 0) {
    const { error } = await ctx.admin
      .from("quiz_questions")
      .upsert(withRef.map(toPayload), { onConflict: "external_ref" });
    if (error) {
      console.error("bulkImport upsert error:", error);
      return fail("تعذّر حفظ الأسئلة التي تحمل مرجعاً.");
    }
  }

  if (withoutRef.length > 0) {
    warnings.push(
      `${withoutRef.length} سؤال بدون external_ref — سيُضاف كسجل جديد في كل مرة تستورد فيها الملف.`
    );
    const { error } = await ctx.admin.from("quiz_questions").insert(withoutRef.map(toPayload));
    if (error) {
      console.error("bulkImport insert error:", error);
      return fail("تعذّر حفظ الأسئلة الجديدة.");
    }
  }

  const updated = withRef.filter((r) => knownRefs.has(r.external_ref!)).length;
  const inserted = rows.length - updated;

  const coverage = summarizeCoverage(rows);
  const gaps = findCoverageGaps(coverage);

  return {
    success: true,
    data: { inserted, updated, createdCategories, coverage, gaps, warnings },
  };
}
