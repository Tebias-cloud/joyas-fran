import { test, expect } from '@playwright/test';

test.describe('Joyas Fran - Panel Admin E2E Tests', () => {
  // Test ID auto-generated prefix for safety
  const prefix = `[TEST-${Date.now()}]`;
  const testCategoryName = `${prefix} Categoria`;
  const testProductName = `${prefix} Anillo de Plata`;

  test.beforeEach(async ({ page }) => {
    // Escuchar logs de consola del navegador para debug
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER EXCEPTION:', err.message));

    // 1. Ir a la ruta protegida de admin
    await page.goto('/admin');
    
    // Si redirige a login, iniciar sesión
    if (page.url().includes('/login')) {
      await expect(page.locator('h1')).toContainText(/Bienvenido/i);
      await page.fill('input[name="email"]', 'test-admin@joyasfran.cl');
      await page.fill('input[name="password"]', 'TestAdmin123!');
      await page.click('button[type="submit"]', { force: true });
    }

    // Esperar redirección final a la pantalla de administración
    await page.waitForURL('**/admin');
    await expect(page.locator('h2')).toContainText('Inicio');
  });

  test('Debería cargar el panel de administración correctamente', async ({ page }) => {
    // Verificar que estamos en el dashboard por defecto
    await expect(page.locator('h2')).toContainText('Inicio');
  });

  test('Debería gestionar categorías', async ({ page }) => {
    // Navegar a Catálogo
    await page.click('button:has-text("Catálogo")', { force: true });
    // Ir a pestaña de Categorías
    await page.click('button:has-text("Categorías")', { force: true });
    
    // Crear nueva categoría
    await page.click('button:has-text("Nueva Categoría")', { force: true });
    await page.fill('label:has-text("Nombre") + input', testCategoryName);
    
    // Guardar usando click con force para evitar overlays
    await page.click('form button:has-text("Guardar categoría")', { force: true });

    // Verificar que aparece la categoría en la lista
    await page.waitForSelector(`text=${testCategoryName}`);
    await expect(page.locator(`text=${testCategoryName}`)).toBeVisible();
  });

  test('Debería crear y editar un producto manualmente', async ({ page }) => {
    // Navegar a Catálogo
    await page.click('button:has-text("Catálogo")', { force: true });
    // Asegurarse de tener al menos una categoría primero
    await page.click('button:has-text("Categorías")', { force: true });
    const hasCategory = await page.locator(`text=${testCategoryName}`).isVisible();
    if (!hasCategory) {
      await page.click('button:has-text("Nueva Categoría")', { force: true });
      await page.fill('label:has-text("Nombre") + input', testCategoryName);
      await page.click('form button:has-text("Guardar categoría")', { force: true });
      await page.waitForSelector(`text=${testCategoryName}`);
    }

    // Volver a Joyas
    await page.click('button:has-text("Joyas")', { force: true });

    // Clic en Nueva Joya
    await page.click('button:has-text("Nueva Joya")', { force: true });

    // Saltar Onboarding seleccionando Continuar manualmente
    await page.click('button:has-text("Continuar manualmente")', { force: true });

    // --- Paso 1: Fotos ---
    await page.click('button:has-text("Añadir por URL")', { force: true });
    await page.fill('[placeholder="https://... (presiona Enter)"]', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f');
    await page.press('[placeholder="https://... (presiona Enter)"]', 'Enter');
    await page.click('button:has-text("Siguiente paso")', { force: true });

    // --- Paso 2: Detalles ---
    await page.fill('[placeholder="Ej: Anillo de Plata Corazón"]', testProductName);
    await page.selectOption('select', { label: testCategoryName });
    await page.fill('[placeholder="Describe detalladamente el diseño, terminación y estilo de la joya..."]', 'Hermoso anillo de plata ley 925 de prueba.');
    await page.click('button:has-text("Siguiente paso")', { force: true });

    // --- Paso 3: Precio y Stock ---
    await page.fill('[placeholder="0"]', '25000');
    await page.fill('[placeholder="Cantidad disponible"]', '10');
    await page.click('button:has-text("Guardar joya")', { force: true });

    // Verificar que aparece en la tabla
    await page.waitForSelector(`tr:has-text("${testProductName}")`);
    await expect(page.locator(`tr:has-text("${testProductName}")`)).toBeVisible();

    // Editar producto
    await page.click(`tr:has-text("${testProductName}") button:has(svg)`, { force: true }); // primer botón de acción (editar)
    await page.click('button:has-text("Siguiente paso")', { force: true }); // ir al paso 2
    await page.fill('[placeholder="Ej: Anillo de Plata Corazón"]', `${testProductName} Editado`);
    await page.click('button:has-text("Siguiente paso")', { force: true }); // ir al paso 3
    await page.click('button:has-text("Guardar joya")', { force: true }); // guardar

    // Verificar nombre editado
    await page.waitForSelector(`tr:has-text("${testProductName} Editado")`);
    await expect(page.locator(`tr:has-text("${testProductName} Editado")`)).toBeVisible();
  });

  test('Debería poder ver pedidos y filtrar', async ({ page }) => {
    // Navegar a Pedidos
    await page.click('button:has-text("Pedidos")', { force: true });
    await expect(page.locator('h2')).toContainText('Pedidos');

    // Filtrar pedidos por ID o cliente
    await page.fill('[placeholder="Buscar pedido por ID, cliente, email o estado..."]', 'Pagado');
  });
});
