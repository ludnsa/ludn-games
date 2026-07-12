require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", "63e8e57f-0ade-4338-bcc9-04a6114c392b");
  console.log("Error:", error);
  console.log("Data:", data);
}

test();
