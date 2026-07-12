"use server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

function getAdminClient(cookieStore: any) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) { }
        },
      },
    }
  );
}

export async function getAdminUsers() {
  const cookieStore = await cookies();
  const supabase = getAdminClient(cookieStore);

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
  const cookieStore = await cookies();
  const supabase = getAdminClient(cookieStore);

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    return { success: false, error: error.message };
  }

  // Try deleting from profiles table just in case it exists and cascade didn't work
  await supabase.from("profiles").delete().eq("id", userId);

  revalidatePath("/admin");
  return { success: true };
}

export async function updateAdminUser(userId: string, updates: { name?: string; phone?: string; email?: string; password?: string; tokens?: number }) {
  const cookieStore = await cookies();
  const supabase = getAdminClient(cookieStore);

  const authUpdates: any = {};
  if (updates.email) authUpdates.email = updates.email;
  
  if (updates.phone) {
    let phoneStr = updates.phone.trim();
    if (phoneStr.startsWith("05") && phoneStr.length === 10) {
      phoneStr = "+966" + phoneStr.substring(1);
    } else if (phoneStr.startsWith("5") && phoneStr.length === 9) {
      phoneStr = "+966" + phoneStr;
    } else if (!phoneStr.startsWith("+")) {
      phoneStr = "+" + phoneStr.replace(/\D/g, "");
    }
    authUpdates.phone = phoneStr;
  }
  
  if (updates.password && updates.password.length > 0) authUpdates.password = updates.password;

  const userMetadataUpdates: any = {};
  if (updates.name) userMetadataUpdates.name = updates.name;
  if (updates.phone) userMetadataUpdates.phone = updates.phone;

  if (Object.keys(userMetadataUpdates).length > 0) {
    authUpdates.user_metadata = userMetadataUpdates;
  }

  const { error } = await supabase.auth.admin.updateUserById(userId, authUpdates);
  if (error) {
    return { success: false, error: error.message };
  }

  // Sync with profiles table using upsert
  const profileUpdates: any = { id: userId };
  if (updates.name) profileUpdates.full_name = updates.name;
  if (updates.phone) profileUpdates.phone_number = updates.phone;
  if (updates.email) profileUpdates.email = updates.email;
  if (updates.tokens !== undefined) profileUpdates.available_tokens = updates.tokens;

  if (Object.keys(profileUpdates).length > 1) { // >1 because id is always present
    await supabase.from("profiles").upsert(profileUpdates);
  }

  revalidatePath("/admin");
  return { success: true };
}
