const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno de .env.local manualmente si es necesario
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
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRole) {
  console.error('Error: Supabase URL o Service Role Key no configurados en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function main() {
  const email = 'test-admin@joyasfran.cl';
  const password = 'TestAdmin123!';

  console.log(`Verificando o creando usuario de prueba: ${email}`);

  // 1. Intentar crear el usuario mediante admin.createUser
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { firstName: 'Test', lastName: 'Admin' },
    app_metadata: { role: 'admin' }
  });

  if (error) {
    if (error.message.includes('already exists') || error.status === 422) {
      console.log('El usuario ya existe. Actualizando contraseña y rol...');
      // Buscar usuario
      const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error('Error al listar usuarios:', listError);
        process.exit(1);
      }
      const user = usersData.users.find(u => u.email === email);
      if (user) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
          password,
          app_metadata: { role: 'admin' }
        });
        if (updateError) {
          console.error('Error al actualizar usuario:', updateError);
          process.exit(1);
        }
        console.log('Usuario actualizado correctamente.');
      } else {
        console.error('No se encontró el usuario a pesar de que el error indicó que existía.');
        process.exit(1);
      }
    } else {
      console.error('Error al crear usuario:', error);
      process.exit(1);
    }
  } else {
    console.log('Usuario creado exitosamente con rol admin.');
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
