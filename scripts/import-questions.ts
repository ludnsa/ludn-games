/**
 * استيراد أسئلة "تحدي الفئات" من ملف CSV أو JSON.
 *
 *   npm run import:quiz -- <path> [--dry-run]
 *
 * أمثلة:
 *   npm run import:quiz -- supabase/seed/quiz-sample.csv --dry-run
 *   npm run import:quiz -- ./content/questions.json
 *
 * ما يفعله:
 *   - يتحقق من كل صف (النقاط، النصوص، وجود ملفات الصور فعلياً على القرص)
 *   - ينشئ الفئات الناقصة
 *   - يحوّل الصور إلى WebP بحد أقصى 1600px للضلع الأطول ويرفعها للـ bucket الخاص
 *   - يحدّث الأسئلة التي تحمل external_ref بدل تكرارها (إعادة الاستيراد آمنة)
 *   - يطبع جدول تغطية لكل فئة، ويخرج بخطأ إذا نقصت أي فئة عن سؤالين في أي قيمة نقاط
 *
 * ملاحظة: هذا السكربت يبني عميل Supabase الخاص به ولا يستورد
 * lib/supabase/server.ts لأن ذلك الملف يعتمد على next/headers.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { parseCSV } from "../lib/csvHelper";
import {
  findCoverageGaps,
  parseQuizJson,
  parseQuizMatrix,
  summarizeCoverage,
  QUIZ_VALID_POINTS,
  type QuizImportRow,
  type QuizCoverage,
} from "../lib/quiz-import";

const BUCKET = "quiz-media";
const MAX_EDGE = 1600;
const MIN_PER_TIER = 2;

// ---------------------------------------------------------------------
// إخراج
// ---------------------------------------------------------------------

const C = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

const log = (msg = "") => console.log(msg);
const info = (msg: string) => console.log(`${C.cyan}•${C.reset} ${msg}`);
const ok = (msg: string) => console.log(`${C.green}✔${C.reset} ${msg}`);
const warn = (msg: string) => console.log(`${C.yellow}⚠${C.reset} ${msg}`);
const err = (msg: string) => console.error(`${C.red}✖${C.reset} ${msg}`);

/**
 * ينهي التنفيذ برسالة خطأ.
 * نرمي استثناءً بدل process.exit() حتى تُغلق مكتبة sharp خيوطها بهدوء
 * (استدعاء process.exit مباشرة يسبب Assertion failed على ويندوز).
 */
class ImportAbort extends Error {}

function die(msg: string): never {
  throw new ImportAbort(msg);
}

// ---------------------------------------------------------------------
// البيئة
// ---------------------------------------------------------------------

/** يقرأ .env يدوياً إذا لم يمرَّر --env-file أو لم تُحمَّل المتغيرات. */
function loadEnvFallback() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  for (const file of [".env.local", ".env"]) {
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) continue;

    for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

// ---------------------------------------------------------------------
// الوسائط
// ---------------------------------------------------------------------

interface Args {
  file: string;
  dryRun: boolean;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const file = argv.find((a) => !a.startsWith("--"));

  if (!file) {
    log();
    log(`${C.bold}الاستخدام:${C.reset} npm run import:quiz -- <path-to-csv-or-json> [--dry-run]`);
    log();
    log(`${C.dim}الأعمدة المتوقعة:${C.reset}`);
    log(
      `${C.dim}  external_ref, category_slug, question_text, answer_text, points, question_image, answer_image${C.reset}`
    );
    log(`${C.dim}  (اختياري) question_image_alt, answer_image_alt${C.reset}`);
    log();
    process.exit(1);
  }

  return { file: path.resolve(process.cwd(), file), dryRun };
}

// ---------------------------------------------------------------------
// الصور
// ---------------------------------------------------------------------

interface PreparedImage {
  buffer: Buffer;
  storagePath: string;
}

// sharp تُحمَّل عند الحاجة فقط — استيراد ملف بلا صور لا يشغّل libvips إطلاقاً
type SharpFactory = (typeof import("sharp"))["default"];
let sharpFactory: SharpFactory | null = null;

async function getSharp(): Promise<SharpFactory> {
  if (!sharpFactory) sharpFactory = (await import("sharp")).default;
  return sharpFactory;
}

/** يحوّل الصورة إلى WebP ويقصّها إلى 1600px كحد أقصى للضلع الأطول. */
async function prepareImage(absolutePath: string): Promise<PreparedImage> {
  const sharp = await getSharp();
  const buffer = await sharp(absolutePath)
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();

  // اسم مبني على محتوى الملف: إعادة الاستيراد لا تُنشئ نسخاً مكررة
  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 20);
  return { buffer, storagePath: `imported/${hash}.webp` };
}

// ---------------------------------------------------------------------
// جداول التقرير
// ---------------------------------------------------------------------

function printCoverageTable(title: string, coverage: QuizCoverage) {
  const slugs = Object.keys(coverage).sort();
  if (slugs.length === 0) {
    warn(`${title}: لا توجد بيانات.`);
    return;
  }

  const width = Math.max(12, ...slugs.map((s) => s.length));
  log();
  log(`${C.bold}${title}${C.reset}`);
  log(
    `${C.dim}${"الفئة".padEnd(width)}  ${QUIZ_VALID_POINTS.map((p) => String(p).padStart(5)).join(
      "  "
    )}   الإجمالي${C.reset}`
  );

  for (const slug of slugs) {
    const counts = coverage[slug];
    const total = QUIZ_VALID_POINTS.reduce((sum, p) => sum + counts[p], 0);
    const cells = QUIZ_VALID_POINTS.map((p) => {
      const n = counts[p];
      const text = String(n).padStart(5);
      return n < MIN_PER_TIER ? `${C.red}${text}${C.reset}` : `${C.green}${text}${C.reset}`;
    }).join("  ");
    log(`${slug.padEnd(width)}  ${cells}   ${String(total).padStart(7)}`);
  }
  log();
}

// ---------------------------------------------------------------------
// التغطية النهائية من قاعدة البيانات
// ---------------------------------------------------------------------

async function fetchDbCoverage(supabase: SupabaseClient): Promise<QuizCoverage> {
  const { data: categories } = await supabase.from("quiz_categories").select("id, slug");
  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("category_id, points")
    .eq("is_active", true);

  const slugById = new Map((categories || []).map((c) => [c.id as string, c.slug as string]));
  const coverage: QuizCoverage = {};

  (categories || []).forEach((c) => {
    coverage[c.slug as string] = { 200: 0, 400: 0, 600: 0 };
  });

  (questions || []).forEach((q) => {
    const slug = slugById.get(q.category_id as string);
    if (!slug) return;
    const points = q.points as 200 | 400 | 600;
    if (coverage[slug]) coverage[slug][points] += 1;
  });

  return coverage;
}

// ---------------------------------------------------------------------
// التشغيل
// ---------------------------------------------------------------------

async function main() {
  const { file, dryRun } = parseArgs();
  loadEnvFallback();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    die(
      "متغيرات البيئة ناقصة. تأكد من وجود NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في ملف .env"
    );
  }

  if (!fs.existsSync(file)) die(`الملف غير موجود: ${file}`);

  log();
  log(`${C.bold}استيراد أسئلة تحدي الفئات${C.reset}`);
  info(`الملف: ${path.relative(process.cwd(), file)}`);
  if (dryRun) warn("وضع المعاينة (--dry-run): لن تُكتب أي بيانات.");
  log();

  // ---- 1) القراءة والتحقق ----
  const raw = fs.readFileSync(file, "utf8");
  const isJson = path.extname(file).toLowerCase() === ".json";

  let parsed;
  if (isJson) {
    try {
      parsed = parseQuizJson(JSON.parse(raw));
    } catch {
      die("تعذّر قراءة ملف JSON — تأكد من صحة التنسيق.");
    }
  } else {
    parsed = parseQuizMatrix(parseCSV(raw));
  }

  if (parsed.errors.length > 0) {
    log();
    err(`${parsed.errors.length} خطأ في الملف — لم يتم استيراد أي شيء:`);
    parsed.errors.slice(0, 40).forEach((e) => log(`   ${C.red}سطر ${e.line}:${C.reset} ${e.message}`));
    if (parsed.errors.length > 40) log(`   ${C.dim}... و ${parsed.errors.length - 40} خطأ آخر${C.reset}`);
    die("أصلح الأخطاء أعلاه ثم أعد المحاولة.");
  }

  const rows = parsed.rows;
  if (rows.length === 0) die("لم يُعثر على أي صف صالح في الملف.");

  ok(`تم التحقق من ${rows.length} صف.`);
  parsed.warnings.slice(0, 20).forEach((w) => warn(`سطر ${w.line}: ${w.message}`));
  if (parsed.warnings.length > 20) {
    log(`   ${C.dim}... و ${parsed.warnings.length - 20} تنبيه آخر${C.reset}`);
  }

  // ---- 2) التحقق من وجود ملفات الصور ----
  const baseDir = path.dirname(file);
  const imageRefs = new Set<string>();
  const missingImages: string[] = [];

  rows.forEach((r) => {
    [r.question_image, r.answer_image].forEach((rel) => {
      if (!rel) return;
      const abs = path.isAbsolute(rel) ? rel : path.resolve(baseDir, rel);
      if (fs.existsSync(abs)) imageRefs.add(rel);
      else missingImages.push(rel);
    });
  });

  if (missingImages.length > 0) {
    log();
    err(`${missingImages.length} صورة مذكورة في الملف غير موجودة على القرص:`);
    Array.from(new Set(missingImages))
      .slice(0, 20)
      .forEach((m) => log(`   ${C.red}${m}${C.reset}`));
    die("المسارات تُحسب نسبةً لمجلد ملف الاستيراد. أصلحها ثم أعد المحاولة.");
  }

  if (imageRefs.size > 0) ok(`تم العثور على ${imageRefs.size} صورة.`);

  // ---- 3) تغطية الملف ----
  printCoverageTable("تغطية الملف المستورد", summarizeCoverage(rows));

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const slugs = Array.from(new Set(rows.map((r) => r.category_slug)));
  const { data: existingCategories, error: catError } = await supabase
    .from("quiz_categories")
    .select("id, slug")
    .in("slug", slugs);

  if (catError) die(`تعذّر الاتصال بقاعدة البيانات: ${catError.message}`);

  const idBySlug = new Map<string, string>((existingCategories || []).map((c) => [c.slug, c.id]));
  const newSlugs = slugs.filter((s) => !idBySlug.has(s));

  const refs = rows.map((r) => r.external_ref).filter((r): r is string => Boolean(r));
  const knownRefs = new Set<string>();
  if (refs.length > 0) {
    const { data: found } = await supabase
      .from("quiz_questions")
      .select("external_ref")
      .in("external_ref", refs);
    found?.forEach((f) => f.external_ref && knownRefs.add(f.external_ref));
  }

  const willUpdate = rows.filter((r) => r.external_ref && knownRefs.has(r.external_ref)).length;
  const withoutRef = rows.filter((r) => !r.external_ref).length;
  const willInsert = rows.length - willUpdate;

  log(`${C.bold}الخطة${C.reset}`);
  info(`فئات جديدة: ${newSlugs.length}${newSlugs.length ? ` (${newSlugs.join(", ")})` : ""}`);
  info(`أسئلة ستُضاف: ${willInsert}`);
  info(`أسئلة ستُحدَّث: ${willUpdate}`);
  info(`صور سترفع: ${imageRefs.size}`);
  if (withoutRef > 0) {
    warn(
      `${withoutRef} صف بدون external_ref — سيُضاف كسجل جديد في كل مرة تعيد فيها الاستيراد.`
    );
  }
  log();

  // ---- 4) المعاينة تتوقف هنا ----
  if (dryRun) {
    const projected = summarizeCoverage(rows);
    const dbCoverage = await fetchDbCoverage(supabase);
    Object.entries(dbCoverage).forEach(([slug, counts]) => {
      if (!projected[slug]) projected[slug] = { 200: 0, 400: 0, 600: 0 };
      // تقدير تقريبي: الصفوف التي تحمل مرجعاً معروفاً تُحدَّث ولا تضيف عدداً
      QUIZ_VALID_POINTS.forEach((p) => {
        projected[slug][p] += counts[p];
      });
    });
    printCoverageTable("التغطية المتوقعة بعد الاستيراد (تقديرية)", projected);
    ok("انتهت المعاينة. لم تُكتب أي بيانات.");
    log();
    return;
  }

  // ---- 5) إنشاء الفئات الناقصة ----
  for (const slug of newSlugs) {
    const { data, error } = await supabase
      .from("quiz_categories")
      .insert({ slug, name_ar: slug, is_active: true })
      .select("id, slug")
      .single();

    if (error || !data) die(`تعذّر إنشاء الفئة "${slug}": ${error?.message}`);
    idBySlug.set(slug, data.id);
    ok(`أُنشئت الفئة "${slug}" — عدّل اسمها العربي من لوحة التحكم.`);
  }

  // ---- 6) رفع الصور ----
  const uploadedPaths = new Map<string, string>();
  let uploadIndex = 0;

  for (const rel of imageRefs) {
    uploadIndex++;
    const abs = path.isAbsolute(rel) ? rel : path.resolve(baseDir, rel);
    try {
      const { buffer, storagePath } = await prepareImage(abs);
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: "image/webp", upsert: true });

      if (error) die(`تعذّر رفع الصورة "${rel}": ${error.message}`);
      uploadedPaths.set(rel, storagePath);
      process.stdout.write(`\r${C.cyan}•${C.reset} رفع الصور: ${uploadIndex}/${imageRefs.size}`);
    } catch (e) {
      die(`تعذّر معالجة الصورة "${rel}": ${(e as Error).message}`);
    }
  }
  if (imageRefs.size > 0) {
    process.stdout.write("\r\x1b[K");
    ok(`تم رفع ${imageRefs.size} صورة إلى ${BUCKET}.`);
  }

  // ---- 7) كتابة الأسئلة ----
  const toPayload = (r: QuizImportRow) => ({
    category_id: idBySlug.get(r.category_slug)!,
    external_ref: r.external_ref,
    question_text: r.question_text,
    answer_text: r.answer_text,
    points: r.points,
    question_image: r.question_image ? uploadedPaths.get(r.question_image) ?? null : null,
    question_image_alt: r.question_image_alt,
    answer_image: r.answer_image ? uploadedPaths.get(r.answer_image) ?? null : null,
    answer_image_alt: r.answer_image_alt,
    is_active: true,
  });

  const withRef = rows.filter((r) => r.external_ref).map(toPayload);
  const noRef = rows.filter((r) => !r.external_ref).map(toPayload);

  const CHUNK = 200;
  for (let i = 0; i < withRef.length; i += CHUNK) {
    const { error } = await supabase
      .from("quiz_questions")
      .upsert(withRef.slice(i, i + CHUNK), { onConflict: "external_ref" });
    if (error) die(`تعذّر حفظ الأسئلة: ${error.message}`);
  }

  for (let i = 0; i < noRef.length; i += CHUNK) {
    const { error } = await supabase.from("quiz_questions").insert(noRef.slice(i, i + CHUNK));
    if (error) die(`تعذّر حفظ الأسئلة: ${error.message}`);
  }

  ok(`تم حفظ ${rows.length} سؤال (${willInsert} جديد، ${willUpdate} محدَّث).`);

  // ---- 8) التغطية النهائية ----
  const finalCoverage = await fetchDbCoverage(supabase);
  printCoverageTable("التغطية النهائية في قاعدة البيانات", finalCoverage);

  const gaps = findCoverageGaps(finalCoverage, MIN_PER_TIER);
  if (gaps.length > 0) {
    err(`${gaps.length} فئة لا تصلح للعب بعد — كل فئة تحتاج ${MIN_PER_TIER} أسئلة على الأقل من كل قيمة:`);
    gaps.forEach((g) => log(`   ${C.red}${g}${C.reset}`));
    die("تم حفظ البيانات، لكن هذه الفئات لن تظهر كخيار صالح للحكم.");
  }

  log();
  ok("كل الفئات مكتملة وجاهزة للعب.");
  log();
}

main().catch((e) => {
  log();
  if (e instanceof ImportAbort) {
    err(e.message);
  } else {
    err(`خطأ غير متوقع: ${e instanceof Error ? e.message : String(e)}`);
    if (e instanceof Error && e.stack) console.error(C.dim + e.stack + C.reset);
  }
  log();
  // ضبط رمز الخروج بدل process.exit() ليُغلق Node موارده بشكل طبيعي
  process.exitCode = 1;
});
