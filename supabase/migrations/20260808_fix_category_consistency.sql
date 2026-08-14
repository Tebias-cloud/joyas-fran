-- ============================================================
-- 💍 Joyas Fran — Migración: Consistencia de category_id
-- ============================================================
-- Propósito: Asegurar que todos los productos existentes tengan
-- category_id asignado correctamente, migrando desde el campo
-- legado `category` (varchar) a la FK normalizada.
-- ============================================================
-- Segura para ejecutar múltiples veces (idempotente).
-- ============================================================

-- 1. Mapear productos que tienen `category` (string) pero no tienen `category_id`
UPDATE products p
SET category_id = c.id
FROM categories c
WHERE LOWER(TRIM(p.category)) = LOWER(TRIM(c.name))
  AND p.category_id IS NULL
  AND p.category IS NOT NULL
  AND p.category != '';

-- 2. Sincronizar el campo legado `category` en productos que ya tienen category_id
-- pero el campo string está desactualizado o vacío
UPDATE products p
SET category = c.name
FROM categories c
WHERE p.category_id = c.id
  AND (p.category IS NULL OR p.category = '' OR p.category != c.name);

-- 3. Reporte de estado post-migración
DO $$
DECLARE
  total_products     INTEGER;
  with_category_id   INTEGER;
  without_category_id INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_products FROM products;
  SELECT COUNT(*) INTO with_category_id FROM products WHERE category_id IS NOT NULL;
  without_category_id := total_products - with_category_id;

  RAISE NOTICE '📊 Reporte de consistencia de categorías:';
  RAISE NOTICE '   Total productos: %', total_products;
  RAISE NOTICE '   Con category_id: %', with_category_id;
  RAISE NOTICE '   Sin category_id (huérfanos): %', without_category_id;

  IF without_category_id > 0 THEN
    RAISE NOTICE '⚠️  Existen % producto(s) sin categoría asignada. Revisar manualmente.', without_category_id;
  ELSE
    RAISE NOTICE '✅ Todos los productos tienen category_id asignado correctamente.';
  END IF;
END $$;
