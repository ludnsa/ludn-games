"use server";
import { createClient, type User } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import { cancelSubscription, extendSubscription, getAllSubscriptions } from "@/lib/subscriptions";

/**
 * كل دالة هنا تتأكد بنفسها إن اللي يستدعيها مدير — Server Actions تنستدعى مباشرة
 * بدون المرور على صفحة /admin، فحماية middleware للصفحة ما تكفي.
 * نفس شرط middleware.ts و quiz-admin.ts: app_metadata.role === 'admin'
 */
async function isAdmin(): Promise<boolean> {
  const userClient = await getSupabaseServer();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  return user?.app_metadata?.role === "admin";
}

const NOT_ADMIN = "هذه الصفحة للمدراء فقط.";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function getAdminUsers() {
  if (!(await isAdmin())) return { error: NOT_ADMIN };
  const supabase = getAdminClient();

  // listUsers يرجع 50 مستخدم بس بالصفحة لو ما حددنا — نجيب كل الصفحات عشان العدد يطلع كامل
  const PER_PAGE = 1000;
  const allUsers: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) {
      return { error: error.message };
    }
    allUsers.push(...data.users);
    if (data.users.length < PER_PAGE) break;
  }

  // Fetch profiles to get tokens
  const [{ data: profiles }, subscriptions] = await Promise.all([
    supabase.from("profiles").select("id, available_tokens"),
    getAllSubscriptions(supabase),
  ]);
  const profilesMap = new Map(profiles?.map(p => [p.id, p.available_tokens || 0]) || []);

  const users = allUsers.map((user) => ({
    id: user.id,
    email: user.email || "",
    phone: user.phone || user.user_metadata?.phone_number || user.user_metadata?.phone || "",
    name: user.user_metadata?.name || user.user_metadata?.full_name || "بدون اسم",
    createdAt: user.created_at,
    tokens: profilesMap.get(user.id) || 0,
    subscriptionEndsAt: subscriptions.get(user.id) ?? null,
  }));

  return { users };
}

/** المدير يعطي اشتراك يدوياً (days: يتمدد من نهاية الحالي)، أو يلغيه (days = 0) */
export async function setAdminSubscription(userId: string, days: number) {
  if (!(await isAdmin())) return { success: false as const, error: NOT_ADMIN };
  if (!Number.isInteger(days) || days < 0 || days > 3650) return { success: false as const, error: "مدة غير صحيحة" };
  const supabase = getAdminClient();

  if (days === 0) {
    const ok = await cancelSubscription(supabase, userId);
    revalidatePath("/admin");
    return ok ? { success: true as const, endsAt: null } : { success: false as const, error: "تعذّر إلغاء الاشتراك" };
  }
  const endsAt = await extendSubscription(supabase, userId, days);
  revalidatePath("/admin");
  return endsAt ? { success: true as const, endsAt } : { success: false as const, error: "تعذّر تفعيل الاشتراك" };
}

export async function deleteAdminUser(userId: string) {
  if (!(await isAdmin())) return { success: false, error: NOT_ADMIN };
  const supabase = getAdminClient();

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    return { success: false, error: error.message };
  }

  await supabase.from("profiles").delete().eq("id", userId);

  revalidatePath("/admin");
  return { success: true };
}

export async function updateAdminUser(userId: string, updates: { name?: string; phone?: string; email?: string; password?: string; tokens?: number }) {
  if (!(await isAdmin())) return { success: false, error: NOT_ADMIN };
  const supabase = getAdminClient();

  // Fetch current user to only apply changes
  const { data: { user } } = await supabase.auth.admin.getUserById(userId);
  if (!user) return { success: false, error: "User not found" };

  // 1. Update Profiles FIRST (tokens are the priority)
  if (updates.tokens !== undefined) {
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        available_tokens: updates.tokens,
        ...(updates.name ? { full_name: updates.name } : {}),
        ...(updates.phone ? { phone_number: updates.phone } : {}),
        ...(updates.email ? { email: updates.email } : {}),
      });

    if (profileError) {
      console.error("Profile upsert error:", profileError);
      return { success: false, error: "فشل تحديث رصيد الألعاب: " + profileError.message };
    }
  } else {
    // Update profile fields only (no tokens change)
    const profileUpdates: any = {};
    if (updates.name) profileUpdates.full_name = updates.name;
    if (updates.phone) profileUpdates.phone_number = updates.phone;
    if (updates.email) profileUpdates.email = updates.email;

    if (Object.keys(profileUpdates).length > 0) {
      await supabase.from("profiles").update(profileUpdates).eq("id", userId);
    }
  }

  // 2. Prepare authUpdates only for changed fields
  const authUpdates: any = {};
  if (updates.email && updates.email !== user.email) {
    authUpdates.email = updates.email;
  }
  
  if (updates.phone) {
    let phoneStr = updates.phone.trim();
    if (phoneStr.startsWith("05") && phoneStr.length === 10) {
      phoneStr = "+966" + phoneStr.substring(1);
    } else if (phoneStr.startsWith("5") && phoneStr.length === 9) {
      phoneStr = "+966" + phoneStr;
    } else if (!phoneStr.startsWith("+")) {
      phoneStr = "+" + phoneStr.replace(/\D/g, "");
    }
    if (phoneStr !== user.phone && phoneStr.replace("+", "") !== user.phone) {
      authUpdates.phone = phoneStr;
    }
  }
  
  if (updates.password && updates.password.length > 0) authUpdates.password = updates.password;

  const userMetadataUpdates: any = {};
  if (updates.name && updates.name !== user.user_metadata?.name && updates.name !== user.user_metadata?.full_name) {
    userMetadataUpdates.name = updates.name;
  }
  if (updates.phone && updates.phone !== user.user_metadata?.phone && updates.phone !== user.user_metadata?.phone_number) {
    userMetadataUpdates.phone = updates.phone;
  }

  if (Object.keys(userMetadataUpdates).length > 0) {
    authUpdates.user_metadata = userMetadataUpdates;
  }

  // Only call updateUserById if there are actual auth changes
  if (Object.keys(authUpdates).length > 0) {
    const { error } = await supabase.auth.admin.updateUserById(userId, authUpdates);
    if (error) {
      console.error("updateUserById error:", error);
      revalidatePath("/admin");
      return { success: true, error: "تم تحديث الرصيد، لكن فشل تحديث بيانات الدخول." };
    }
  }

  revalidatePath("/admin");
  return { success: true };
}

/**
 * المشتريات: كل عملية دفع ناجحة من جدول transactions، الأحدث أول. قراءة بس.
 * ميسّر يحفظ المبلغ بالهللة، فنقسمه على 100. اسم الباقة يطلع بالواجهة من lib/packages.
 */
export async function getAdminPurchases() {
  if (!(await isAdmin())) return { error: NOT_ADMIN };
  const supabase = getAdminClient();

  const { data: rows, error } = await supabase
    .from("transactions")
    .select("id, payment_id, user_id, package_id, amount, currency, payment_method, created_at")
    .eq("status", "paid")
    .order("created_at", { ascending: false });
  if (error) return { error: error.message };

  // أسماء المشترين من كل صفحات المستخدمين (نفس طريقة getAdminUsers)
  const PER_PAGE = 1000;
  const people = new Map<string, { name: string; email: string; phone: string }>();
  for (let page = 1; ; page++) {
    const { data, error: usersError } = await supabase.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (usersError) return { error: usersError.message };
    for (const user of data.users) {
      people.set(user.id, {
        name: user.user_metadata?.name || user.user_metadata?.full_name || "بدون اسم",
        email: user.email || "",
        phone: user.phone || user.user_metadata?.phone_number || user.user_metadata?.phone || "",
      });
    }
    if (data.users.length < PER_PAGE) break;
  }

  const subscriptions = await getAllSubscriptions(supabase);
  const now = Date.now();
  const activeSubscribers = [...subscriptions.values()].filter((endsAt) => Date.parse(endsAt) > now).length;

  const purchases = (rows ?? []).map((t) => {
    const person = people.get(t.user_id);
    return {
      id: String(t.id),
      paymentId: t.payment_id as string,
      name: person?.name ?? "حساب محذوف",
      email: person?.email ?? "",
      phone: person?.phone ?? "",
      packageId: t.package_id as number,
      amount: (Number(t.amount) || 0) / 100,
      currency: (t.currency as string) || "SAR",
      method: (t.payment_method as string) || "",
      createdAt: t.created_at as string,
      subscriptionEndsAt: subscriptions.get(t.user_id) ?? null,
    };
  });

  return { purchases, activeSubscribers };
}
