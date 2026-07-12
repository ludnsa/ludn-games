require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase.auth.admin.listUsers();
  
  if (data?.users) {
    data.users.forEach(u => {
      console.log("User:", u.email, "Phone:", u.phone, "Metadata:", u.user_metadata);
    });
  }
}

test();
