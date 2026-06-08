import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://sjkxzpbbetpwniexrcmv.supabase.co";
const supabaseKey = "sb_publishable_hrVhJYXWMTOO-e8ptRhmwA_VQss1qkW";

export const supabase = createClient(supabaseUrl, supabaseKey);
