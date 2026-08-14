-- 💍 Joyas Fran - Migración de Normalización y Escalabilidad de Catálogo

-- 1. Crear tabla de categorías
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    position INT NOT NULL DEFAULT 0,
    meta_title VARCHAR(255),
    meta_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active_pos ON categories(is_active, position);

-- 2. Insertar categorías predeterminadas
INSERT INTO categories (name, slug, description, image_url, position, is_active)
VALUES 
('Anillos', 'anillos', 'Anillos exclusivos en Plata Italiana Ley 925', '/img/cat-anillos.webp', 10, true),
('Collares', 'collares', 'Collares y cadenas elegantes en Plata Italiana Ley 925', '/img/cat-collares.webp', 20, true),
('Aros', 'aros', 'Aros y argollas detalladas en Plata Italiana Ley 925', '/img/cat-aros.webp', 30, true),
('Pulseras', 'pulseras', 'Pulseras exclusivas en Plata Italiana Ley 925', '/img/cat-pulseras.webp', 40, true)
ON CONFLICT (name) DO NOTHING;

-- 3. Modificar tabla de productos
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(100) UNIQUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_code VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100) UNIQUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(150) DEFAULT 'Joyas Fran';
ALTER TABLE products ADD COLUMN IF NOT EXISTS collection VARCHAR(150);
ALTER TABLE products ADD COLUMN IF NOT EXISTS material VARCHAR(150) DEFAULT 'Plata Ley 925';
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,2) DEFAULT 0 CONSTRAINT chk_cost_price CHECK (cost_price >= 0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- 4. Crear tabla de variantes de producto
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL UNIQUE,
    size VARCHAR(50) NOT NULL,
    stock INT NOT NULL DEFAULT 0 CONSTRAINT chk_variant_stock CHECK (stock >= 0),
    price_override NUMERIC(12,2) CONSTRAINT chk_price_override CHECK (price_override >= 0),
    cost_price NUMERIC(12,2) CONSTRAINT chk_variant_cost CHECK (cost_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(product_id, size)
);

CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);

-- 5. Mapear productos existentes a las nuevas categorías por nombre
UPDATE products p
SET category_id = c.id
FROM categories c
WHERE LOWER(TRIM(p.category)) = LOWER(TRIM(c.name))
  AND p.category_id IS NULL;

-- 6. Establecer un SKU por defecto en productos que no tengan uno
UPDATE products
SET sku = slug
WHERE sku IS NULL;

-- 7. Trigger para sincronizar automáticamente el JSON 'inventory' a la tabla product_variants
CREATE OR REPLACE FUNCTION sync_product_variants()
RETURNS TRIGGER AS $$
BEGIN
  -- A. Eliminar variantes antiguas que ya no están en el nuevo JSON
  DELETE FROM product_variants
  WHERE product_id = NEW.id
    AND size NOT IN (
      SELECT size_key FROM jsonb_each_text(COALESCE(NEW.inventory, '{}')::jsonb) AS val(size_key, stock_value)
    );

  -- B. Insertar o actualizar variantes basadas en el JSON 'inventory'
  INSERT INTO product_variants (product_id, sku, size, stock)
  SELECT 
    NEW.id,
    COALESCE(NEW.sku, NEW.slug) || '-' || TRIM(size_key) AS sku,
    TRIM(size_key) AS size,
    COALESCE(NULLIF(TRIM(stock_value), ''), '0')::INTEGER AS stock
  FROM jsonb_each_text(COALESCE(NEW.inventory, '{}')::jsonb) AS val(size_key, stock_value)
  ON CONFLICT (product_id, size) 
  DO UPDATE SET 
    stock = EXCLUDED.stock,
    sku = EXCLUDED.sku;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_product_variants ON products;
CREATE TRIGGER trg_sync_product_variants
AFTER INSERT OR UPDATE OF inventory, slug, sku ON products
FOR EACH ROW
EXECUTE FUNCTION sync_product_variants();

-- 8. Migración inicial de inventarios JSON existentes a product_variants
INSERT INTO product_variants (product_id, sku, size, stock)
SELECT 
    p.id,
    COALESCE(p.sku, p.slug) || '-' || TRIM(size_key) AS sku,
    TRIM(size_key) AS size,
    COALESCE(NULLIF(TRIM(stock_value), ''), '0')::INTEGER AS stock
FROM products p,
LATERAL jsonb_each_text(COALESCE(p.inventory, '{}')::jsonb) AS val(size_key, stock_value)
ON CONFLICT (sku) DO NOTHING;
