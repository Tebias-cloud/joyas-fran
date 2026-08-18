const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRole);

async function main() {
  console.log('Querying RLS policies for table: categories...');
  const { data, error } = await supabase.rpc('get_policies_for_table', { table_name: 'categories' });

  if (error) {
    // If RPC doesn't exist, run raw SQL query using normal select (if enabled) or query pg_catalog
    console.log('RPC failed, querying pg_policies directly via select...');
    const { data: policies, error: sqlError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'categories');
      
    if (sqlError) {
      // Let's do a direct query on pg_policies using custom query if we have it, or query list of policies using standard postgres view
      console.error('SQL Error:', sqlError);
    } else {
      console.log('Policies:', policies);
    }
  } else {
    console.log('Policies:', data);
  }
}

main().catch(console.error);
