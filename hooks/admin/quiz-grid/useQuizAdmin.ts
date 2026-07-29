"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { exportToCSV, parseCSV } from "@/lib/csvHelper";
import { convertImageToWebp } from "@/lib/image-webp";
import {
  parseQuizMatrix,
  QUIZ_CSV_HEADERS_AR,
  summarizeCoverage,
  findCoverageGaps,
} from "@/lib/quiz-import";
import {
  bulkImportQuizQuestions,
  deleteQuizCategory,
  deleteQuizQuestion,
  listQuizCategories,
  listQuizQuestions,
  saveQuizCategory,
  saveQuizQuestion,
  uploadQuizMedia,
  type QuizAdminQuestion,
} from "@/app/actions/quiz-admin";
import type { QuizCategory, QuizPoints } from "@/types";

export interface QuizFormState {
  id: string | null;
  category_id: string;
  external_ref: string;
  question_text: string;
  answer_text: string;
  points: QuizPoints;
  question_image: string | null;
  question_image_alt: string;
  answer_image: string | null;
  answer_image_alt: string;
  is_active: boolean;
}

const emptyForm = (categoryId = ""): QuizFormState => ({
  id: null,
  category_id: categoryId,
  external_ref: "",
  question_text: "",
  answer_text: "",
  points: 200,
  question_image: null,
  question_image_alt: "",
  answer_image: null,
  answer_image_alt: "",
  is_active: true,
});

export function useQuizAdmin() {
  const [categories, setCategories] = useState<QuizCategory[]>([]);
  const [questions, setQuestions] = useState<QuizAdminQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState<"question" | "answer" | null>(null);

  // مرشّحات القائمة
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterPoints, setFilterPoints] = useState<QuizPoints | "">("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState<QuizFormState>(emptyForm());

  // معاينات محلية للصور قبل الحفظ (تُلغى عند الاستبدال)
  const [previews, setPreviews] = useState<{ question: string | null; answer: string | null }>({
    question: null,
    answer: null,
  });
  const previewsRef = useRef(previews);
  previewsRef.current = previews;

  const [isCategoryPanelOpen, setIsCategoryPanelOpen] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState<{ id: string | null; name_ar: string; slug: string }>(
    { id: null, name_ar: "", slug: "" }
  );

  // -------------------------------------------------------------------
  // التحميل
  // -------------------------------------------------------------------

  const loadCategories = useCallback(async () => {
    const res = await listQuizCategories();
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    setCategories(res.data);
  }, []);

  const loadQuestions = useCallback(async () => {
    const res = await listQuizQuestions({
      categoryId: filterCategory || null,
      points: filterPoints || null,
      activeOnly: filterActive === "all" ? null : filterActive === "active",
    });
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    setQuestions(res.data);
  }, [filterCategory, filterPoints, filterActive]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      await loadCategories();
      if (!cancelled) await loadQuestions();
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isLoading) return;
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory, filterPoints, filterActive]);

  // تنظيف روابط المعاينة عند الخروج
  useEffect(() => {
    return () => {
      Object.values(previewsRef.current).forEach((url) => url && URL.revokeObjectURL(url));
    };
  }, []);

  // -------------------------------------------------------------------
  // مشتقات
  // -------------------------------------------------------------------

  const categoryNameById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name_ar])),
    [categories]
  );

  const visibleQuestions = useMemo(() => {
    const term = search.trim();
    if (!term) return questions;
    return questions.filter(
      (q) => q.question_text.includes(term) || q.answer_text.includes(term)
    );
  }, [questions, search]);

  /** تغطية كل فئة: هل تملك سؤالين على الأقل من كل قيمة نقاط؟ */
  const coverage = useMemo(() => {
    const map = new Map<string, Record<QuizPoints, number>>();
    categories.forEach((c) => map.set(c.id, { 200: 0, 400: 0, 600: 0 }));
    questions.forEach((q) => {
      if (!q.is_active) return;
      const counts = map.get(q.category_id);
      if (counts) counts[q.points] += 1;
    });
    return map;
  }, [categories, questions]);

  /**
   * التغطية أعلاه تعكس المرشّحات الحالية، فلا تُعتمد كتحذير إلا عند
   * عرض كل الأسئلة بدون تصفية.
   */
  const isCoverageReliable = !filterCategory && !filterPoints && filterActive === "all";

  // -------------------------------------------------------------------
  // الفئات
  // -------------------------------------------------------------------

  const submitCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!categoryDraft.name_ar.trim()) {
      toast.error("اكتب اسم الفئة بالعربية.");
      return;
    }

    setIsSaving(true);
    const res = await saveQuizCategory({
      id: categoryDraft.id,
      name_ar: categoryDraft.name_ar,
      slug: categoryDraft.slug || undefined,
    });
    setIsSaving(false);

    if (!res.success) {
      toast.error(res.error);
      return;
    }

    toast.success(categoryDraft.id ? "تم تحديث الفئة." : "تمت إضافة الفئة.");
    setCategoryDraft({ id: null, name_ar: "", slug: "" });
    await loadCategories();
  };

  const editCategory = (category: QuizCategory) => {
    setCategoryDraft({ id: category.id, name_ar: category.name_ar, slug: category.slug });
    setIsCategoryPanelOpen(true);
  };

  const toggleCategoryActive = async (category: QuizCategory) => {
    const res = await saveQuizCategory({
      id: category.id,
      name_ar: category.name_ar,
      slug: category.slug,
      is_active: !category.is_active,
    });
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success(category.is_active ? "تم تعطيل الفئة." : "تم تفعيل الفئة.");
    await loadCategories();
  };

  const removeCategory = async (category: QuizCategory) => {
    if (!window.confirm(`حذف الفئة "${category.name_ar}"؟`)) return;
    const res = await deleteQuizCategory(category.id);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("تم حذف الفئة.");
    await loadCategories();
  };

  // -------------------------------------------------------------------
  // الصور
  // -------------------------------------------------------------------

  const uploadImage = async (kind: "question" | "answer", file: File) => {
    setIsUploading(kind);
    try {
      const converted = await convertImageToWebp(file);

      const body = new FormData();
      body.append("file", converted.file);
      body.append("kind", kind);

      const res = await uploadQuizMedia(body);
      if (!res.success) {
        URL.revokeObjectURL(converted.previewUrl);
        toast.error(res.error);
        return;
      }

      setPreviews((prev) => {
        const old = prev[kind];
        if (old) URL.revokeObjectURL(old);
        return { ...prev, [kind]: converted.previewUrl };
      });

      setForm((prev) => ({
        ...prev,
        [kind === "question" ? "question_image" : "answer_image"]: res.data.path,
      }));

      toast.success(`تم رفع الصورة (${converted.width}×${converted.height}).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر رفع الصورة.");
    } finally {
      setIsUploading(null);
    }
  };

  const clearImage = (kind: "question" | "answer") => {
    setPreviews((prev) => {
      const old = prev[kind];
      if (old) URL.revokeObjectURL(old);
      return { ...prev, [kind]: null };
    });
    setForm((prev) => ({
      ...prev,
      [kind === "question" ? "question_image" : "answer_image"]: null,
      [kind === "question" ? "question_image_alt" : "answer_image_alt"]: "",
    }));
  };

  // -------------------------------------------------------------------
  // الأسئلة
  // -------------------------------------------------------------------

  const resetForm = () => {
    setPreviews((prev) => {
      Object.values(prev).forEach((url) => url && URL.revokeObjectURL(url));
      return { question: null, answer: null };
    });
    setForm(emptyForm(form.category_id));
  };

  const submitQuestion = async (e: FormEvent) => {
    e.preventDefault();

    setIsSaving(true);
    const res = await saveQuizQuestion({
      id: form.id,
      category_id: form.category_id,
      external_ref: form.external_ref || null,
      question_text: form.question_text,
      answer_text: form.answer_text,
      points: form.points,
      question_image: form.question_image,
      question_image_alt: form.question_image_alt,
      answer_image: form.answer_image,
      answer_image_alt: form.answer_image_alt,
      is_active: form.is_active,
    });
    setIsSaving(false);

    if (!res.success) {
      toast.error(res.error);
      return;
    }

    toast.success(form.id ? "تم حفظ التعديلات." : "تمت إضافة السؤال.");
    resetForm();
    await loadQuestions();
  };

  const editQuestion = (question: QuizAdminQuestion) => {
    setPreviews((prev) => {
      Object.values(prev).forEach((url) => url && URL.revokeObjectURL(url));
      return { question: null, answer: null };
    });

    setForm({
      id: question.id,
      category_id: question.category_id,
      external_ref: question.external_ref || "",
      question_text: question.question_text,
      answer_text: question.answer_text,
      points: question.points,
      question_image: question.question_image,
      question_image_alt: question.question_image_alt || "",
      answer_image: question.answer_image,
      answer_image_alt: question.answer_image_alt || "",
      is_active: question.is_active,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeQuestion = async (question: QuizAdminQuestion) => {
    if (!window.confirm("حذف هذا السؤال نهائياً؟")) return;
    const res = await deleteQuizQuestion(question.id);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("تم حذف السؤال.");
    await loadQuestions();
  };

  const toggleQuestionActive = async (question: QuizAdminQuestion) => {
    const res = await saveQuizQuestion({
      id: question.id,
      category_id: question.category_id,
      external_ref: question.external_ref,
      question_text: question.question_text,
      answer_text: question.answer_text,
      points: question.points,
      question_image: question.question_image,
      question_image_alt: question.question_image_alt,
      answer_image: question.answer_image,
      answer_image_alt: question.answer_image_alt,
      is_active: !question.is_active,
    });
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    await loadQuestions();
  };

  // -------------------------------------------------------------------
  // CSV
  // -------------------------------------------------------------------

  const exportCSV = () => {
    const slugById = new Map(categories.map((c) => [c.id, c.slug]));
    const rows = questions.map((q) => [
      q.external_ref || "",
      slugById.get(q.category_id) || "",
      q.question_text,
      q.answer_text,
      q.points,
      q.question_image || "",
      q.answer_image || "",
      q.question_image_alt || "",
      q.answer_image_alt || "",
    ]);

    exportToCSV("اسئلة_تحدي_الفئات", [...QUIZ_CSV_HEADERS_AR], rows);
    toast.success(`تم تصدير ${rows.length} سؤال.`);
  };

  /** رفع جماعي بنفس قواعد سكربت الاستيراد. */
  const importCSV = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseQuizMatrix(parseCSV(text));

      if (parsed.errors.length > 0) {
        const preview = parsed.errors
          .slice(0, 3)
          .map((e) => `سطر ${e.line}: ${e.message}`)
          .join(" • ");
        toast.error(
          `${parsed.errors.length} خطأ في الملف — لم يُستورد شيء. ${preview}`,
          { duration: 10000 }
        );
        return;
      }

      if (parsed.rows.length === 0) {
        toast.error("لم يُعثر على صفوف صالحة في الملف.");
        return;
      }

      parsed.warnings.slice(0, 3).forEach((w) => toast.warning(`سطر ${w.line}: ${w.message}`));

      setIsSaving(true);
      const res = await bulkImportQuizQuestions(parsed.rows);
      setIsSaving(false);

      if (!res.success) {
        toast.error(res.error);
        return;
      }

      toast.success(
        `تم الاستيراد: ${res.data.inserted} جديد، ${res.data.updated} محدَّث.` +
          (res.data.createdCategories.length
            ? ` فئات جديدة: ${res.data.createdCategories.join("، ")}.`
            : "")
      );

      res.data.warnings.forEach((w) => toast.warning(w, { duration: 8000 }));

      const gaps = findCoverageGaps(summarizeCoverage(parsed.rows));
      if (gaps.length > 0) {
        toast.warning(
          `${gaps.length} فئة في هذا الملف أقل من سؤالين لإحدى قيم النقاط — راجع جدول التغطية.`,
          { duration: 10000 }
        );
      }

      await loadCategories();
      await loadQuestions();
    } catch (e) {
      console.error("importCSV error:", e);
      toast.error("تعذّر قراءة الملف.");
      setIsSaving(false);
    }
  };

  return {
    // بيانات
    categories, questions: visibleQuestions, totalQuestions: questions.length,
    isLoading, isSaving, isUploading,
    categoryNameById, coverage, isCoverageReliable,

    // مرشّحات
    filterCategory, setFilterCategory,
    filterPoints, setFilterPoints,
    filterActive, setFilterActive,
    search, setSearch,

    // نموذج السؤال
    form, setForm, previews,
    submitQuestion, editQuestion, removeQuestion, toggleQuestionActive, resetForm,
    uploadImage, clearImage,

    // الفئات
    isCategoryPanelOpen, setIsCategoryPanelOpen,
    categoryDraft, setCategoryDraft,
    submitCategory, editCategory, toggleCategoryActive, removeCategory,

    // CSV
    exportCSV, importCSV,
  };
}
