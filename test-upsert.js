require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const profileUpdates = {
    id: '63e8e57f-0ade-4338-bcc9-04a6114c392b',
    full_name: 'يزيد العنزي',
    phone_number: '+966552779088',
    email: 'sql.sa2026@gmail.com',
    available_tokens: 6
  };
  
  const { data, error } = await supabase.from("profiles").upsert(profileUpdates);
  console.log("Error:", error);
  console.log("Data:", data);
}

test();
