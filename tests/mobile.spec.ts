import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

// ─── setup database client ───────────────────────────────────────────────────

const envPath = path.join(__dirname, '../.env.local');
let supabaseUrl = '';
let supabaseServiceRole = '';

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
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceRole = value;
    }
  });
}

supabaseUrl = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
supabaseServiceRole = supabaseServiceRole || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

test.describe('Joyas Fran - Mobile Viewport E2E Tests', () => {
  test.skip(!TEST_ADMIN_EMAIL || !TEST_ADMIN_PASSWORD, 'Configura TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD');
  // Configurar viewport móvil para esta suite
  test.use({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  });

  test('Debería navegar fluidamente en móvil y realizar checkout responsive', async ({ page }) => {
    test.slow();
    
    // 1. Iniciar sesión desde móvil (redirecciona a login con redirect param)
    await page.goto('/admin');
    await expect(page.locator('h1')).toContainText(/Bienvenido/i);
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    
    // Botón de login cómodo de clickear en móvil
    const loginBtn = page.locator('button[type="submit"]');
    await expect(loginBtn).toBeVisible();
    await loginBtn.click({ force: true });

    // 2. Redirección a administración móvil
    await page.waitForURL('**/admin');
    
    // Validar encabezado móvil
    await expect(page.locator('span:has-text("Joyas Fran Admin")')).toBeVisible();

    // 3. Probar navegación mediante barra inferior móvil (div.fixed.bottom-0 para evitar duplicados)
    const ordersNavBtn = page.locator('div.fixed.bottom-0 button:has-text("Pedidos")');
    const catalogNavBtn = page.locator('div.fixed.bottom-0 button:has-text("Catálogo")');
    const inicioNavBtn = page.locator('div.fixed.bottom-0 button:has-text("Inicio")');
    
    await expect(ordersNavBtn).toBeVisible();
    await expect(catalogNavBtn).toBeVisible();
    await expect(inicioNavBtn).toBeVisible();

    // Ir a Pedidos
    await ordersNavBtn.click({ force: true });
    await expect(page.locator('h2')).toContainText('Pedidos');

    // Ir a Catálogo
    await catalogNavBtn.click({ force: true });
    await expect(page.locator('button:has-text("Joyas")')).toBeVisible();

    // Ir a Inicio (Dashboard)
    await inicioNavBtn.click({ force: true });
    await expect(page.locator('h2')).toContainText('Inicio');

    // 4. Navegar a tienda pública en móvil
    const { data: prod } = await supabase
      .from('products')
      .select('slug, inventory')
      .gt('stock', 0)
      .limit(1)
      .single();
    
    if (!prod) {
      await page.goto('/catalogo');
      await expect(page.locator('h1')).toContainText('Todos');
      const productCard = page.locator('a[href^="/producto/"]').first();
      await expect(productCard).toBeVisible();
      await productCard.click({ force: true });
    } else {
      await page.goto(`/producto/${prod.slug}`);
    }

    await page.waitForSelector('h1');

    // Si tiene tallas, seleccionamos una activa
    if (prod && prod.inventory && Object.keys(prod.inventory).length > 0) {
      const activeSizes = Object.keys(prod.inventory).filter(sz => (prod.inventory as Record<string, number>)[sz] > 0);
      if (activeSizes.length > 0) {
        const firstSizeBtn = page.locator(`button:has-text("${activeSizes[0]}")`).first();
        await expect(firstSizeBtn).toBeVisible();
        await firstSizeBtn.click({ force: true });
      }
    }

    // Agregar al carrito
    await page.waitForSelector('button:has-text("Agregar a la bolsa")');
    const addBtn = page.locator('button:has-text("Agregar a la bolsa")');
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click({ force: true });

    // 5. Flujo de Carrito a Checkout en móvil
    await page.goto('/carrito');
    await expect(page.locator('h1')).toContainText('Tu Bolsa de Compras');

    const checkoutBtn = page.locator('a:has-text("Continuar Compra")');
    await checkoutBtn.click({ force: true });

    // Verificar que el formulario de checkout móvil carga
    await page.waitForURL('**/checkout');
    await expect(page.locator('h2:has-text("Datos de contacto")')).toBeVisible();
    
    // Verificar campos del formulario en pantalla móvil (sin email input porque se pre-carga de sesión)
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="rut"]')).toBeVisible();
  });
});
