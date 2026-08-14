-- ============================================================
-- 💍 Joyas Fran — Seed de productos de prueba
-- ============================================================
-- Propósito: Poblar la BD para poder probar catálogo, carrito y checkout.
-- Los nombres incluyen [TEST] para no confundirlos con productos reales.
-- Imágenes tomadas de Unsplash (dominio ya permitido en next.config.ts).
-- ============================================================

-- Ejecutar SOLO en entornos de desarrollo/staging.
-- En producción, poblar el catálogo desde el panel de administración.
-- ============================================================

DO $$
DECLARE
  cat_anillos   INTEGER;
  cat_collares  INTEGER;
  cat_aros      INTEGER;
  cat_pulseras  INTEGER;
BEGIN

  -- 1. Obtener IDs de categorías existentes de forma dinámica
  SELECT id INTO cat_anillos  FROM categories WHERE slug = 'anillos'  LIMIT 1;
  SELECT id INTO cat_collares FROM categories WHERE slug = 'collares' LIMIT 1;
  SELECT id INTO cat_aros     FROM categories WHERE slug = 'aros'     LIMIT 1;
  SELECT id INTO cat_pulseras FROM categories WHERE slug = 'pulseras' LIMIT 1;

  -- Verificar que existan las categorías antes de insertar
  IF cat_anillos IS NULL OR cat_collares IS NULL OR cat_aros IS NULL OR cat_pulseras IS NULL THEN
    RAISE EXCEPTION 'Faltan categorías base. Ejecuta primero la migración 20260725_normalization.sql';
  END IF;

  -- ============================================================
  -- 2. Insertar productos de prueba
  -- ============================================================

  -- Anillo 1: Con tallas, sin oferta
  INSERT INTO products (
    name, description, price, compare_at_price, cost_price,
    category, category_id,
    image_url, images,
    slug, sku, stock, inventory,
    brand, material,
    is_featured, is_new, is_active,
    meta_title, meta_description
  ) VALUES (
    '[TEST] Anillo Solitario Clásico',
    'Anillo solitario en Plata Italiana Ley 925 con acabado pulido. Diseño clásico atemporal, ideal para uso diario o regalo especial. Resistente a la oxidación.',
    12900, NULL, 4500,
    'Anillos', cat_anillos,
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800',
    ARRAY[
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800',
      'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=800'
    ],
    'anillo-solitario-clasico-test', 'ANI-SOL-001', 15,
    '{"8": 3, "9": 4, "10": 5, "11": 3}'::jsonb,
    'Joyas Fran', 'Plata Ley 925',
    true, true, true,
    '[TEST] Anillo Solitario Clásico | Plata 925 | Joyas Fran',
    'Anillo solitario en Plata Italiana Ley 925, acabado pulido. Tallas 8-11.'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Anillo 2: Con oferta y tallas
  INSERT INTO products (
    name, description, price, compare_at_price, cost_price,
    category, category_id,
    image_url, images,
    slug, sku, stock, inventory,
    brand, material,
    is_featured, is_new, is_active,
    meta_title, meta_description
  ) VALUES (
    '[TEST] Anillo Banda Minimalista',
    'Banda minimalista en Plata Ley 925. Perfecta para usar sola o apilar con otros anillos. Acabado mate que no pierde brillo.',
    8900, 14900, 3200,
    'Anillos', cat_anillos,
    'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800',
    ARRAY[
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800',
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800'
    ],
    'anillo-banda-minimalista-test', 'ANI-BAN-002', 20,
    '{"7": 4, "8": 6, "9": 6, "10": 4}'::jsonb,
    'Joyas Fran', 'Plata Ley 925',
    false, false, true,
    '[TEST] Anillo Banda Minimalista | Oferta | Joyas Fran',
    'Banda minimalista en Plata 925, acabado mate. Oferta especial.'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Anillo 3: Talla única, sin variantes
  INSERT INTO products (
    name, description, price, compare_at_price, cost_price,
    category, category_id,
    image_url, images,
    slug, sku, stock, inventory,
    brand, material,
    is_featured, is_new, is_active,
    meta_title, meta_description
  ) VALUES (
    '[TEST] Anillo Ajustable Corazón',
    'Anillo ajustable con detalle de corazón en Plata Ley 925. Talla única regulable. Ideal como regalo.',
    9900, NULL, 3500,
    'Anillos', cat_anillos,
    'https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=800',
    ARRAY[
      'https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=800'
    ],
    'anillo-ajustable-corazon-test', 'ANI-COR-003', 8,
    '{"Talla Única": 8}'::jsonb,
    'Joyas Fran', 'Plata Ley 925',
    false, true, true,
    '[TEST] Anillo Ajustable Corazón | Plata 925 | Joyas Fran',
    'Anillo ajustable con corazón en Plata 925. Talla única.'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Collar 1: Con oferta, Talla Única
  INSERT INTO products (
    name, description, price, compare_at_price, cost_price,
    category, category_id,
    image_url, images,
    slug, sku, stock, inventory,
    brand, material,
    is_featured, is_new, is_active,
    meta_title, meta_description
  ) VALUES (
    '[TEST] Collar Cadena Veneciana 45cm',
    'Collar cadena veneciana en Plata Italiana Ley 925, largo 45 cm. Cierre de mosquetón. Delicada y resistente, ideal para uso diario.',
    18900, 24900, 7000,
    'Collares', cat_collares,
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800',
    ARRAY[
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800',
      'https://images.unsplash.com/photo-1586105449897-20b5efeb3233?w=800'
    ],
    'collar-cadena-veneciana-45cm-test', 'COL-VEN-001', 12,
    '{"Talla Única": 12}'::jsonb,
    'Joyas Fran', 'Plata Ley 925',
    true, false, true,
    '[TEST] Collar Cadena Veneciana 45cm | Oferta | Joyas Fran',
    'Collar veneciana en Plata 925, 45 cm. En oferta.'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Collar 2: Sin oferta, Talla Única
  INSERT INTO products (
    name, description, price, compare_at_price, cost_price,
    category, category_id,
    image_url, images,
    slug, sku, stock, inventory,
    brand, material,
    is_featured, is_new, is_active,
    meta_title, meta_description
  ) VALUES (
    '[TEST] Collar Gargantilla con Dije Luna',
    'Gargantilla en Plata Ley 925 con dije de luna menguante. Largo 40 cm. Cierre reasa. Elegante y delicada.',
    22900, NULL, 8500,
    'Collares', cat_collares,
    'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=800',
    ARRAY[
      'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=800',
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800'
    ],
    'collar-gargantilla-dije-luna-test', 'COL-LUN-002', 6,
    '{"Talla Única": 6}'::jsonb,
    'Joyas Fran', 'Plata Ley 925',
    false, true, true,
    '[TEST] Collar Gargantilla Dije Luna | Plata 925 | Joyas Fran',
    'Gargantilla con dije luna en Plata 925, 40 cm.'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Aro 1: Con oferta
  INSERT INTO products (
    name, description, price, compare_at_price, cost_price,
    category, category_id,
    image_url, images,
    slug, sku, stock, inventory,
    brand, material,
    is_featured, is_new, is_active,
    meta_title, meta_description
  ) VALUES (
    '[TEST] Aros Argolla Lisa 25mm',
    'Aros argolla lisa en Plata Italiana Ley 925. Diámetro 25 mm. Cierre de presión. Cómodos para uso diario y versátiles para cualquier estilo.',
    11900, 15900, 4200,
    'Aros', cat_aros,
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800',
    ARRAY[
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800',
      'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=800'
    ],
    'aros-argolla-lisa-25mm-test', 'ARO-ARG-001', 18,
    '{"Talla Única": 18}'::jsonb,
    'Joyas Fran', 'Plata Ley 925',
    true, false, true,
    '[TEST] Aros Argolla Lisa 25mm | Oferta | Joyas Fran',
    'Argollas lisas en Plata 925, 25 mm. En oferta.'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Aro 2: Sin oferta, stock bajo (para testear low stock badge)
  INSERT INTO products (
    name, description, price, compare_at_price, cost_price,
    category, category_id,
    image_url, images,
    slug, sku, stock, inventory,
    brand, material,
    is_featured, is_new, is_active,
    meta_title, meta_description
  ) VALUES (
    '[TEST] Aros Trepadores Espiral',
    'Aros trepadores espiral en Plata Ley 925. Diseño moderno que sube por la oreja. Cierre de presión. Stock limitado.',
    16900, NULL, 6000,
    'Aros', cat_aros,
    'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800',
    ARRAY[
      'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800'
    ],
    'aros-trepadores-espiral-test', 'ARO-TRE-002', 3,
    '{"Talla Única": 3}'::jsonb,
    'Joyas Fran', 'Plata Ley 925',
    false, false, true,
    '[TEST] Aros Trepadores Espiral | Plata 925 | Joyas Fran',
    'Aros trepadores espiral en Plata 925. Últimas unidades.'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Pulsera 1: Sin oferta, talla única
  INSERT INTO products (
    name, description, price, compare_at_price, cost_price,
    category, category_id,
    image_url, images,
    slug, sku, stock, inventory,
    brand, material,
    is_featured, is_new, is_active,
    meta_title, meta_description
  ) VALUES (
    '[TEST] Pulsera Esclava Grabado',
    'Pulsera esclava lisa en Plata Italiana Ley 925. Ideal para grabar con nombre o fecha. Ancho 6 mm. Cierre de mariposa. Regalo perfecto.',
    19900, NULL, 7000,
    'Pulseras', cat_pulseras,
    'https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=800',
    ARRAY[
      'https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=800',
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800'
    ],
    'pulsera-esclava-grabado-test', 'PUL-ESC-001', 10,
    '{"Talla Única": 10}'::jsonb,
    'Joyas Fran', 'Plata Ley 925',
    false, true, true,
    '[TEST] Pulsera Esclava Grabado | Plata 925 | Joyas Fran',
    'Pulsera esclava en Plata 925. Ancho 6 mm, ideal para grabar.'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Pulsera 2: Con oferta
  INSERT INTO products (
    name, description, price, compare_at_price, cost_price,
    category, category_id,
    image_url, images,
    slug, sku, stock, inventory,
    brand, material,
    is_featured, is_new, is_active,
    meta_title, meta_description
  ) VALUES (
    '[TEST] Pulsera Cadena Rolo Fina',
    'Pulsera de cadena rolo fina en Plata Ley 925. Largo 19 cm. Cierre de mosquetón. Delicada y elegante, ideal para apilar.',
    13900, 18900, 5000,
    'Pulseras', cat_pulseras,
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800',
    ARRAY[
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800'
    ],
    'pulsera-cadena-rolo-fina-test', 'PUL-ROL-002', 14,
    '{"Talla Única": 14}'::jsonb,
    'Joyas Fran', 'Plata Ley 925',
    false, false, true,
    '[TEST] Pulsera Cadena Rolo | Oferta | Joyas Fran',
    'Pulsera rolo en Plata 925, 19 cm. En oferta.'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Producto AGOTADO para testear el estado "Agotado" en catálogo
  INSERT INTO products (
    name, description, price, compare_at_price, cost_price,
    category, category_id,
    image_url, images,
    slug, sku, stock, inventory,
    brand, material,
    is_featured, is_new, is_active,
    meta_title, meta_description
  ) VALUES (
    '[TEST] Collar de Perlas (Agotado)',
    'Collar de perlas sintéticas con cierre en Plata Ley 925. Largo 42 cm. Actualmente agotado.',
    31900, NULL, 12000,
    'Collares', cat_collares,
    'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=800',
    ARRAY[
      'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=800'
    ],
    'collar-perlas-agotado-test', 'COL-PER-003', 0,
    '{"Talla Única": 0}'::jsonb,
    'Joyas Fran', 'Plata Ley 925',
    false, false, true,
    '[TEST] Collar Perlas | Agotado | Joyas Fran',
    'Collar de perlas con cierre en Plata 925. Actualmente agotado.'
  ) ON CONFLICT (slug) DO NOTHING;

  RAISE NOTICE '✅ Seed completado: 10 productos de prueba insertados correctamente.';

END $$;
