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

  const email = 'singh.surendra06022000@gmail.com';
  console.log(`Querying for email: "${email}"...`);
  const { data: singleData, error: singleError } = await supabase
    .from('admin_users')
    .select('id')
    .eq('email', email)
    .single();

  if (singleError) {
    console.error('Error querying single email:', singleError);
  } else {
    console.log('Query single email success:', singleData);
  }
}

main().catch(console.error);
