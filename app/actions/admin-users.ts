"use server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

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
  const supabase = getAdminClient();

  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    return { error: error.message };
  }

  // Fetch profiles to get tokens
  const { data: profiles } = await supabase.from("profiles").select("id, available_tokens");
  const profilesMap = new Map(profiles?.map(p => [p.id, p.available_tokens || 0]) || []);

  const users = data.users.map((user) => ({
    id: user.id,
    email: user.email || "",
    phone: user.phone || user.user_metadata?.phone_number || user.user_metadata?.phone || "",
    name: user.user_metadata?.name || user.user_metadata?.full_name || "بدون اسم",
    createdAt: user.created_at,
    tokens: profilesMap.get(user.id) || 0,
  }));

  return { users };
}

export async function deleteAdminUser(userId: string) {
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
