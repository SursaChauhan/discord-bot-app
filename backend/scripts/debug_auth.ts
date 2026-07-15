import 'dotenv/config';
import { supabase } from '../src/services/supabase.js';

async function main() {
  console.log('Querying latest 5 records from interactions...');
  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching interactions:', error);
  } else {
    console.log('Latest interactions:', data);
  }
}

main().catch(console.error);
