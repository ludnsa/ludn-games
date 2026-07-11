"use server";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseServer } from "@/lib/supabase/server";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

function getServiceRoleKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  
  // Fallback: manually parse .env.local if not loaded by Next.js yet
  try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    if (envConfig.SUPABASE_SERVICE_ROLE_KEY) {
      return envConfig.SUPABASE_SERVICE_ROLE_KEY;
    }
  } catch (e) {
    console.error("Could not parse .env.local dynamically:", e);
  }
  
  return null;
}

export async function consumeGameSessionAction(gameId: string, clientUserId: string, reason: string) {
  try {
    // 🛡️ حماية أمنية: التأكد من هوية المستخدم الحقيقية من الكوكيز (السيرفر)
    const supabaseServer = await getSupabaseServer();
    const { data: { user }, error } = await supabaseServer.auth.getUser();
    
    if (error || !user) {
      throw new Error("Unauthorized: Invalid session");
    }

    // الاعتماد على معرف المستخدم من الجلسة الموثقة في السيرفر وليس من المتصفح
    const userId = user.id;

    const serviceKey = getServiceRoleKey();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !url) {
      throw new Error("Missing Supabase credentials for Admin client");
    }

    const supabaseAdmin = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });

    // 1. Fetch user_games record for this game
    const { data: userGame } = await supabaseAdmin
      .from("user_games")
      .select("games_played, is_purchased")
      .eq("user_id", userId)
      .eq("game_id", gameId)
      .maybeSingle();

    if (userGame) {
      await supabaseAdmin
        .from("user_games")
        .update({ games_played: (userGame.games_played || 0) + 1 })
        .eq("user_id", userId)
        .eq("game_id", gameId);
    } else {
      await supabaseAdmin
        .from("user_games")
        .insert({
          user_id: userId,
          game_id: gameId,
          games_played: 1,
          is_purchased: false,
        });
    }

    // 2. Deduct token if paid and not purchased
    if (reason === "paid") {
      // If the user already owns the game (lifetime), we shouldn't deduct a token.
      if (userGame?.is_purchased) {
        return { success: true };
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("available_tokens")
        .eq("id", userId)
        .maybeSingle();

      if (profile && (profile.available_tokens || 0) > 0) {
        await supabaseAdmin
          .from("profiles")
          .update({ available_tokens: profile.available_tokens - 1 })
          .eq("id", userId);
      }
    }

    return { success: true };
  } catch (err) {
    console.error("consumeGameSessionAction Error:", err);
    return { success: false, error: "Failed to consume game session." };
  }
}

export async function fetchUserGamesAction(clientUserId: string) {
  try {
    // 🛡️ حماية أمنية
    const supabaseServer = await getSupabaseServer();
    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) return [];
    
    const userId = user.id;

    const serviceKey = getServiceRoleKey();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceKey || !url) return [];

    const supabaseAdmin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data } = await supabaseAdmin
      .from("user_games")
      .select("*")
      .eq("user_id", userId);

    return data || [];
  } catch (err) {
    console.error("fetchUserGamesAction Error:", err);
    return [];
  }
}

export async function fetchUserProfileAction(clientUserId: string) {
  try {
    // 🛡️ حماية أمنية
    const supabaseServer = await getSupabaseServer();
    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) return null;
    
    const userId = user.id;

    const serviceKey = getServiceRoleKey();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceKey || !url) return null;

    const supabaseAdmin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email, available_tokens")
      .eq("id", userId)
      .maybeSingle();

    return data;
  } catch (err) {
    console.error("fetchUserProfileAction Error:", err);
    return null;
  }
}
