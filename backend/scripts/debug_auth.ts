import 'dotenv/config';
import { supabase } from '../src/services/supabase.js';

async function main() {
  console.log('Connecting to Supabase...');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
  
  const { data, error } = await supabase
    .from('admin_users')
    .select('*');

  if (error) {
    console.error('Error fetching admin_users:', error);
  } else {
    console.log('Registered admin users in DB:', data);
  }
}

main().catch(console.error);
