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
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  // Sign in as test admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test-admin@joyasfran.cl',
    password: 'TestAdmin123!'
  });

  if (authError) {
    console.error('Auth error:', authError);
    return;
  }

  console.log('Signed in successfully. User ID:', authData.user.id);
  console.log('App Metadata:', authData.user.app_metadata);

  // Try to select categories
  const { data: selectData, error: selectError } = await supabase
    .from('categories')
    .select('*');

  if (selectError) {
    console.error('Select categories error:', selectError);
  } else {
    console.log('Select categories success. Count:', selectData.length);
  }
  const testCatName = `[TEMP-TEST] Categoria RLS`;
  const { data: insertData, error: insertError } = await supabase
    .from('categories')
    .insert({
      name: testCatName,
      slug: `test-slug-rls-${Date.now()}`,
      description: 'Test category from script',
      image_url: '/img/cat-anillos.webp',
      position: 0,
      is_active: true,
      meta_title: testCatName,
      meta_description: 'Test metadata'
    })
    .select();

  if (insertError) {
    console.error('Insert category error:', insertError);
  } else {
    console.log('Insert category success:', insertData);
    // Cleanup
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', insertData[0].id);
    console.log('Cleanup delete error:', deleteError);
  }
}

main().catch(console.error);
