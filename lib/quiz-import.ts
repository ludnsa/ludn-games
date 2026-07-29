/**
 * قواعد التحقق المشتركة لاستيراد أسئلة "تحدي الفئات".
 *
 * يستخدمه كلٌّ من:
 *   - scripts/import-questions.ts  (سكربت Node)
 *   - app/actions/quiz-admin.ts    (الرفع الجماعي من لوحة التحكم)
 *
 * لذلك يجب أن يبقى هذا الملف خالياً من أي استيراد خاص بـ Next أو المتصفح.
 */

export const QUIZ_VALID_POINTS = [200, 400, 600] as const;
export type QuizImportPoints = (typeof QUIZ_VALID_POINTS)[number];

/** ترتيب الأعمدة المعتمد في ملف CSV. آخر عمودين اختياريان. */
export const QUIZ_CSV_COLUMNS = [
  "external_ref",
  "category_slug",
  "question_text",
  "answer_text",
  "points",
  "question_image",
  "answer_image",
  "question_image_alt",
  "answer_image_alt",
] as const;

/** العناوين العربية المستخدمة عند تصدير CSV من لوحة التحكم. */
export const QUIZ_CSV_HEADERS_AR = [
  "المرجع",
  "معرف الفئة",
  "السؤال",
  "الإجابة",
  "النقاط",
  "صورة السؤال",
  "صورة الإجابة",
  "وصف صورة السؤال",
  "وصف صورة الإجابة",
] as const;

export interface QuizImportRow {
  external_ref: string | null;
  category_slug: string;
  question_text: string;
  answer_text: string;
  points: QuizImportPoints;
  question_image: string | null;
  answer_image: string | null;
  question_image_alt: string | null;
  answer_image_alt: string | null;
}

export interface QuizRowIssue {
  line: number;
  message: string;
}

export interface QuizParseResult {
  rows: QuizImportRow[];
  errors: QuizRowIssue[];
  warnings: QuizRowIssue[];
}

const cell = (v: unknown) => String(v ?? "").trim();

/**
 * يتحقق من صف واحد.
 * `line` يُستخدم في رسائل الخطأ فقط (رقم السطر في الملف).
 */
export function validateQuizRow(
  raw: Record<string, unknown>,
  line: number
): { row?: QuizImportRow; errors: QuizRowIssue[]; warnings: QuizRowIssue[] } {
  const errors: QuizRowIssue[] = [];
  const warnings: QuizRowIssue[] = [];

  const categorySlug = cell(raw.category_slug);
  const questionText = cell(raw.question_text);
  const answerText = cell(raw.answer_text);
  const pointsRaw = cell(raw.points);

  if (!categorySlug) errors.push({ line, message: "عمود category_slug مطلوب." });
  if (!questionText) errors.push({ line, message: "عمود question_text لا يمكن أن يكون فارغاً." });
  if (!answerText) errors.push({ line, message: "عمود answer_text لا يمكن أن يكون فارغاً." });

  const points = Number(pointsRaw);
  if (!QUIZ_VALID_POINTS.includes(points as QuizImportPoints)) {
    errors.push({
      line,
      message: `قيمة النقاط "${pointsRaw}" غير مقبولة — المسموح: ${QUIZ_VALID_POINTS.join(", ")}.`,
    });
  }

  const questionImage = cell(raw.question_image) || null;
  const answerImage = cell(raw.answer_image) || null;
  let questionAlt = cell(raw.question_image_alt) || null;
  let answerAlt = cell(raw.answer_image_alt) || null;

  // كل صورة تحتاج وصفاً عربياً. أعمدة الوصف اختيارية في CSV،
  // فإن غابت نشتق الوصف من نص السؤال/الإجابة وننبّه.
  if (questionImage && !questionAlt) {
    questionAlt = questionText || null;
    warnings.push({ line, message: "لا يوجد وصف لصورة السؤال — تم اشتقاقه من نص السؤال." });
  }
  if (answerImage && !answerAlt) {
    answerAlt = answerText || null;
    warnings.push({ line, message: "لا يوجد وصف لصورة الإجابة — تم اشتقاقه من نص الإجابة." });
  }

  if (errors.length > 0) return { errors, warnings };

  return {
    row: {
      external_ref: cell(raw.external_ref) || null,
      category_slug: categorySlug,
      question_text: questionText,
      answer_text: answerText,
      points: points as QuizImportPoints,
      question_image: questionImage,
      answer_image: answerImage,
      question_image_alt: questionAlt,
      answer_image_alt: answerAlt,
    },
    errors,
    warnings,
  };
}

/**
 * يحوّل مصفوفة CSV (من lib/csvHelper.parseCSV) إلى صفوف مُتحقَّق منها.
 * يقبل العناوين الإنجليزية أو العربية، ويقبل أيضاً ملفاً بدون عناوين
 * إذا كان الترتيب مطابقاً لـ QUIZ_CSV_COLUMNS.
 */
export function parseQuizMatrix(matrix: string[][]): QuizParseResult {
  const rows: QuizImportRow[] = [];
  const errors: QuizRowIssue[] = [];
  const warnings: QuizRowIssue[] = [];

  if (matrix.length === 0) {
    return { rows, errors: [{ line: 0, message: "الملف فارغ." }], warnings };
  }

  const header = matrix[0].map((h) => h.trim());
  const arIndex = QUIZ_CSV_HEADERS_AR.indexOf(header[0] as never);
  const hasHeader =
    QUIZ_CSV_COLUMNS.includes(header[0] as never) || arIndex !== -1 || header[0] === "";

  // خريطة اسم العمود -> موضعه
  const columnIndex: Record<string, number> = {};
  if (hasHeader) {
    header.forEach((name, i) => {
      const en = QUIZ_CSV_COLUMNS.indexOf(name as never);
      if (en !== -1) {
        columnIndex[name] = i;
        return;
      }
      const ar = QUIZ_CSV_HEADERS_AR.indexOf(name as never);
      if (ar !== -1) columnIndex[QUIZ_CSV_COLUMNS[ar]] = i;
    });
  } else {
    QUIZ_CSV_COLUMNS.forEach((name, i) => {
      columnIndex[name] = i;
    });
  }

  const missing = (["category_slug", "question_text", "answer_text", "points"] as const).filter(
    (c) => columnIndex[c] === undefined
  );
  if (missing.length > 0) {
    errors.push({ line: 1, message: `أعمدة مفقودة في العناوين: ${missing.join(", ")}` });
    return { rows, errors, warnings };
  }

  const body = hasHeader ? matrix.slice(1) : matrix;

  body.forEach((cells, i) => {
    const line = i + (hasHeader ? 2 : 1);
    if (cells.every((c) => !c || !c.trim())) return; // تخطي الأسطر الفارغة

    const raw: Record<string, unknown> = {};
    QUIZ_CSV_COLUMNS.forEach((name) => {
      const idx = columnIndex[name];
      raw[name] = idx === undefined ? "" : cells[idx];
    });

    const result = validateQuizRow(raw, line);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    if (result.row) rows.push(result.row);
  });

  return { rows, errors, warnings };
}

/** يقبل مصفوفة JSON بنفس أسماء الأعمدة. */
export function parseQuizJson(input: unknown): QuizParseResult {
  const rows: QuizImportRow[] = [];
  const errors: QuizRowIssue[] = [];
  const warnings: QuizRowIssue[] = [];

  if (!Array.isArray(input)) {
    return { rows, errors: [{ line: 0, message: "ملف JSON يجب أن يحتوي على مصفوفة صفوف." }], warnings };
  }

  input.forEach((item, i) => {
    const result = validateQuizRow((item || {}) as Record<string, unknown>, i + 1);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    if (result.row) rows.push(result.row);
  });

  return { rows, errors, warnings };
}

export type QuizCoverage = Record<string, Record<QuizImportPoints, number>>;

/** عدد الأسئلة لكل فئة ولكل قيمة نقاط. */
export function summarizeCoverage(rows: QuizImportRow[]): QuizCoverage {
  const summary: QuizCoverage = {};
  rows.forEach((r) => {
    if (!summary[r.category_slug]) summary[r.category_slug] = { 200: 0, 400: 0, 600: 0 };
    summary[r.category_slug][r.points] += 1;
  });
  return summary;
}

/**
 * الفئات التي لا تملك العدد الأدنى في إحدى قيم النقاط.
 * الحد الأدنى 2 لأن كل عمود في اللوحة يحتاج سؤالين من كل قيمة.
 */
export function findCoverageGaps(coverage: QuizCoverage, minimum = 2): string[] {
  const gaps: string[] = [];
  Object.entries(coverage).forEach(([slug, counts]) => {
    QUIZ_VALID_POINTS.forEach((p) => {
      if (counts[p] < minimum) {
        gaps.push(`الفئة "${slug}": ${counts[p]} سؤال بقيمة ${p} (المطلوب ${minimum} على الأقل).`);
      }
    });
  });
  return gaps;
}
