"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { ContactMessageSchema } from "@/lib/schemas";

const DUPLICATE_MESSAGE =
  "عذراً يا بطل! تم استقبال رسالة من هذا البريد أو رقم الجوال خلال الـ 24 ساعة الماضية. يرجى المحاولة غداً لحماية النظام.";
const FLOOD_MESSAGE = "وصلتنا رسائل كثيرة الحين. جرّب مرة ثانية بعد دقايق.";

export async function submitContactMessage(formData: FormData) {
  const data = {
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    message: formData.get("message"),
  };

  const parsed = ContactMessageSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await getSupabaseServer();

  try {
    // فحص التكرار والإغراق بالقاعدة نفسها (trigger contact_messages_guard من 0013) وقت الإدخال،
    // وخطأه يرجع تحت. دالة check_recent_message ما يناديها المتصفح ولا النموذج (0013 سحب صلاحيتها)
    const { error } = await supabase
      .from("contact_messages")
      .insert([{
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email,
        message: parsed.data.message
      }]);

    if (error) {
      // رفض من القاعدة نفسها (0013): رسالة مكررة، أو رسائل كثيرة الحين، أو البيانات ما تطابق القيد
      if (error.message === "contact_duplicate") return { success: false, error: DUPLICATE_MESSAGE };
      if (error.message === "contact_flood") return { success: false, error: FLOOD_MESSAGE };
      if (error.code === "23514") return { success: false, error: "تأكد من بياناتك (الاسم والجوال والإيميل) وحاول مرة ثانية." };
      throw error;
    }

    return { success: true, message: "تم إرسال رسالتك بنجاح! فريقنا بيتواصل معك بأقرب وقت 🎮🔥" };
  } catch (error: unknown) {
    console.error("Error sending message:", error);
    return { success: false, error: "حدث خطأ أثناء الإرسال، يرجى المحاولة لاحقاً." };
  }
}
