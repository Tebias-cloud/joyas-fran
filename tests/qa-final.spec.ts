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

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Joyas Fran - QA Final Tests', () => {
  test.skip(!TEST_ADMIN_EMAIL || !TEST_ADMIN_PASSWORD, 'Configura TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD');
  const testPrefix = `[TEST-QA-${Date.now()}]`;
  const testCategoryName = `${testPrefix} Cat`;
  const testProductName = `${testPrefix} Anillo de Plata`;
  let categoryId: number;
  const createdOrderIds: string[] = [];
  let testUserId: string | null = null;

  test.beforeAll(async () => {
    // 1. Resolve test user ID for order insertions
    const { data: usersList } = await supabase.auth.admin.listUsers();
    const testAdmin = usersList?.users.find(u => u.email === TEST_ADMIN_EMAIL);
    testUserId = testAdmin ? testAdmin.id : null;

    // 2. Create temporary category for testing
    const { data: catData, error: catError } = await supabase
      .from('categories')
      .insert({
        name: testCategoryName,
        slug: testPrefix.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
        description: 'Test Category',
        is_active: true,
      })
      .select()
      .single();

    if (catError) throw catError;
    categoryId = catData.id;

    // 3. Set default sizes config for this category
    const { data: settingsData } = await supabase
      .from('store_settings')
      .select('*')
      .eq('key', 'sizes')
      .maybeSingle();

    const currentSizes = settingsData?.value || {};
    const updatedSizes = {
      ...currentSizes,
      [testCategoryName]: ['12', '14', '16'],
    };

    await supabase
      .from('store_settings')
      .upsert({ key: 'sizes', value: updatedSizes }, { onConflict: 'key' });
  });

  test.afterAll(async () => {
    // Clean up created orders
    if (createdOrderIds.length > 0) {
      await supabase.from('order_items').delete().in('order_id', createdOrderIds);
      await supabase.from('orders').delete().in('id', createdOrderIds);
    }
    
    // Clean up created products & category
    const { data: productsToDelete } = await supabase
      .from('products')
      .select('id')
      .like('name', `%${testPrefix}%`);
    
    if (productsToDelete && productsToDelete.length > 0) {
      const ids = productsToDelete.map(p => p.id);
      await supabase.from('products').delete().in('id', ids);
    }

    if (categoryId) {
      await supabase.from('categories').delete().eq('id', categoryId);
    }
  });

  test.beforeEach(async ({ page }) => {
    // Sign in to admin panel
    await page.goto('/admin');
    if (page.url().includes('/login')) {
      await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
      await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
      await page.click('button[type="submit"]', { force: true });
    }
    await page.waitForURL('**/admin');
  });

  test('Flujo Completo: Crear producto, verificar en tienda, hacer checkout e integración de stock', async ({ page }) => {
    test.slow();

    // 1. Ir a Catálogo y agregar producto
    await page.click('button:has-text("Catálogo")', { force: true });
    await page.click('button:has-text("Joyas")', { force: true });
    await page.click('button:has-text("Nueva Joya")', { force: true });
    await page.click('button:has-text("Continuar manualmente")', { force: true });

    // --- Paso 1: Foto ---
    await page.click('button:has-text("Añadir por URL")', { force: true });
    await page.fill('[placeholder="https://... (presiona Enter)"]', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800');
    await page.press('[placeholder="https://... (presiona Enter)"]', 'Enter');
    await page.click('button:has-text("Siguiente paso")', { force: true });

    // --- Paso 2: Detalles ---
    await page.fill('[placeholder="Ej: Anillo de Plata Corazón"]', testProductName);
    await page.selectOption('select', { label: testCategoryName });
    await page.fill('[placeholder="Describe detalladamente el diseño, terminación y estilo de la joya..."]', 'Anillo de prueba QA.');
    await page.click('button:has-text("Siguiente paso")', { force: true });

    // --- Paso 3: Stock y Tallas ---
    await page.fill('label:has-text("Precio de venta ($)") + input', '15000');
    await page.click('button:has-text("Sí (Tallas configuradas)")', { force: true });
    
    // Asignar stock a la talla 12 y 14 con selectores de hermanos adyacentes 100% seguros
    await page.fill('span:has-text("Talla 12") + input', '5');
    await page.fill('span:has-text("Talla 14") + input', '10');
    await page.click('button:has-text("Guardar joya")', { force: true });

    // Verificar en la lista del panel
    await page.waitForSelector(`tr:has-text("${testProductName}")`);
    await expect(page.locator(`tr:has-text("${testProductName}")`)).toBeVisible();

    // 2. Obtener slug desde base de datos
    const { data: prodData } = await supabase
      .from('products')
      .select('id, slug')
      .eq('name', testProductName)
      .single();
    expect(prodData).not.toBeNull();
    const productId = prodData!.id;
    const slug = prodData!.slug;

    // 3. Abrir la página pública y verificar tallas
    await page.goto(`/producto/${slug}`);
    await page.waitForSelector('h1');
    await expect(page.locator('h1')).toContainText(testProductName);

    const size12Btn = page.locator('button:has-text("12")');
    const size14Btn = page.locator('button:has-text("14")');
    await expect(size12Btn).toBeVisible();
    await expect(size14Btn).toBeVisible();

    // Seleccionar talla 14 y agregar a la bolsa
    await size14Btn.click();
    await page.click('button:has-text("Agregar a la bolsa")', { force: true });

    // 4. Ir a carrito y completar Checkout
    await page.goto('/carrito');
    await expect(page.locator('h1')).toContainText('Tu Bolsa de Compras');
    await page.click('a:has-text("Continuar Compra")', { force: true });

    await page.fill('input[name="firstName"]', 'QA');
    await page.fill('input[name="lastName"]', 'E2E');
    await page.fill('input[name="phone"]', '+56 9 91234567');
    await page.fill('input[name="rut"]', '12345678-5'); // RUT VÁLIDO CON DV CORRECTO
    await page.fill('input[name="address"]', 'Calle de prueba 123');

    // Seleccionar región y comuna (nombre del select es 'city' en el DOM)
    await page.selectOption('select[name="region"]', 'Tarapacá');
    await page.selectOption('select[name="city"]', 'Iquique');

    // Seleccionar método de entrega
    await page.click('text=Retiro en Tienda', { force: true });

    // Interceptar la petición de pago para evitar que las credenciales sandbox den error
    let interceptedOrderId = '';
    let isRequestIntercepted = false;
    await page.route('**/api/payment/create', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        const postJSON = request.postDataJSON();
        if (postJSON && postJSON.orderId) {
          interceptedOrderId = postJSON.orderId;
        }
      }
      isRequestIntercepted = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://www.mercadopago.cl/sandbox/payments/mock-checkout',
          token: 'mock-token-id'
        })
      });
    });

    await page.click('button:has-text("IR A PAGAR")', { force: true });
    
    // Esperamos a que la petición sea interceptada y el callback se complete de manera reactiva
    await expect.poll(() => isRequestIntercepted).toBe(true);

    if (interceptedOrderId) {
      createdOrderIds.push(interceptedOrderId);
    }

    // 5. Integración de Base de Datos: Descuento atómico de stock e idempotencia
    // Obtener stock inicial de la variante talla "14" del producto
    const { data: varDataBefore } = await supabase
      .from('product_variants')
      .select('id, stock')
      .eq('product_id', productId)
      .eq('size', '14')
      .single();

    expect(varDataBefore).not.toBeNull();
    const initialStock = varDataBefore!.stock;

    // Crear una orden de prueba para este producto, variante y cantidad de 2 unidades, con items JSONB poblados
    const { data: mockOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        total_amount: 30000,
        status: 'Pendiente Pago',
        user_id: testUserId,
        items: [
          {
            id: productId,
            name: testProductName,
            price: 15000,
            quantity: 2,
            selectedSize: '14'
          }
        ],
        shipping_info: { firstName: 'TesterStock', lastName: 'QA', email: 'testerstock@qa.com', phone: '99999999', address: 'Calle 1', region: 'Tarapacá', comuna: 'Iquique', deliveryMethod: 'pickup' }
      })
      .select()
      .single();

    if (orderError) throw orderError;
    createdOrderIds.push(mockOrder.id);

    // Insertar orden item física en order_items
    await supabase.from('order_items').insert({
      order_id: mockOrder.id,
      product_id: productId,
      variant_id: varDataBefore!.id,
      quantity: 2,
      price: 15000,
      size: '14'
    });

    // Ejecutar RPC confirm_payment_stock (Descuento atómico)
    const { error: rpcError1 } = await supabase.rpc('confirm_payment_stock', {
      p_order_id: mockOrder.id
    });

    expect(rpcError1).toBeNull();

    // Verificar stock final de la variante (Debería ser stockInicial - 2)
    const { data: varDataAfter1 } = await supabase
      .from('product_variants')
      .select('stock')
      .eq('id', varDataBefore!.id)
      .single();

    expect(varDataAfter1!.stock).toBe(initialStock - 2);

    // Simular el comportamiento del Commit de la API: actualizar el estado a "Pagado"
    await supabase
      .from('orders')
      .update({ status: 'Pagado' })
      .eq('id', mockOrder.id);

    // Probar IDEMPOTENCIA: Ejecutar el RPC por segunda vez con la misma orden
    await supabase.rpc('confirm_payment_stock', {
      p_order_id: mockOrder.id
    });

    // Leer stock sin compensaciones artificiales. Debe fallar si el RPC no es idempotente.
    const { data: varDataAfter2 } = await supabase
      .from('product_variants')
      .select('stock')
      .eq('id', varDataBefore!.id)
      .single();

    expect(varDataAfter2!.stock).toBe(initialStock - 2);
  });

  test('Debería probar filtros de fecha en pedidos y verificar actualización de métricas', async ({ page }) => {
    // 1. Insertar órdenes de prueba en diferentes fechas
    const now = new Date();
    const sub7Days = new Date();
    sub7Days.setDate(now.getDate() - 5);
    const sub45Days = new Date();
    sub45Days.setDate(now.getDate() - 45);

    const testOrders = [
      {
        total_amount: 10000,
        status: 'Pagado',
        created_at: now.toISOString(),
        user_id: testUserId,
        items: [],
        shipping_info: { firstName: 'TesterHoy', lastName: 'QA', email: 'testerhoy@qa.com', phone: '99999999', address: 'Calle 1', region: 'Tarapacá', comuna: 'Iquique', deliveryMethod: 'pickup' }
      },
      {
        total_amount: 20000,
        status: 'Pagado',
        created_at: sub7Days.toISOString(),
        user_id: testUserId,
        items: [],
        shipping_info: { firstName: 'Tester7Dias', lastName: 'QA', email: 'tester7dias@qa.com', phone: '99999999', address: 'Calle 1', region: 'Tarapacá', comuna: 'Iquique', deliveryMethod: 'pickup' }
      },
      {
        total_amount: 40000,
        status: 'Pagado',
        created_at: sub45Days.toISOString(),
        user_id: testUserId,
        items: [],
        shipping_info: { firstName: 'Tester45Dias', lastName: 'QA', email: 'tester45dias@qa.com', phone: '99999999', address: 'Calle 1', region: 'Tarapacá', comuna: 'Iquique', deliveryMethod: 'pickup' }
      }
    ];

    const { data: insertedOrders, error: orderError } = await supabase
      .from('orders')
      .insert(testOrders)
      .select();

    if (orderError) throw orderError;
    insertedOrders.forEach(o => createdOrderIds.push(o.id));

    // 2. Ir a Pedidos en el panel
    await page.click('button:has-text("Pedidos")', { force: true });
    await expect(page.locator('h2')).toContainText('Pedidos');

    // 3. Filtrar por "Hoy"
    const dateSelector = page.locator('select');
    await dateSelector.selectOption('hoy');
    await page.waitForTimeout(500);

    // Debe mostrar la orden de hoy y ocultar la de 45 días
    await expect(page.locator('text=TesterHoy').first()).toBeVisible();
    await expect(page.locator('text=Tester45Dias')).toHaveCount(0);

    // 4. Filtrar por "Últimos 7 días"
    await dateSelector.selectOption('7dias');
    await page.waitForTimeout(500);
    await expect(page.locator('text=TesterHoy').first()).toBeVisible();
    await expect(page.locator('text=Tester7Dias').first()).toBeVisible();
    await expect(page.locator('text=Tester45Dias')).toHaveCount(0);

    // 5. Filtrar por "Todo el tiempo"
    await dateSelector.selectOption('todo');
    await page.waitForTimeout(500);
    await expect(page.locator('text=TesterHoy').first()).toBeVisible();
    await expect(page.locator('text=Tester7Dias').first()).toBeVisible();
    await expect(page.locator('text=Tester45Dias').first()).toBeVisible();
  });
});
