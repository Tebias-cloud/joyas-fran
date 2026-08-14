-- ============================================================
-- 💍 Joyas Fran — Migración: Políticas de Storage
-- ============================================================
-- Propósito: Configurar el bucket 'products' para:
--   - Lectura pública (anon puede ver imágenes del catálogo)
--   - Escritura/Eliminación solo para usuarios autenticados (admin)
-- ============================================================
-- IMPORTANTE: El bucket debe existir previamente en Supabase Storage.
-- Si no existe, créalo desde el Dashboard de Supabase:
--   Storage → New Bucket → Name: "products" → Public: OFF
-- (Las policies controlan el acceso, no la visibilidad del bucket en sí)
-- ============================================================

-- Asegurarse de que el bucket exista (upsert seguro)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  false,  -- El bucket NO es public; las policies controlan el acceso
  5242880, -- 5 MB límite por archivo
  ARRAY['image/webp', 'image/jpeg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- Limpiar policies previas para evitar conflictos
-- ============================================================
DROP POLICY IF EXISTS "Imágenes de productos públicas (lectura anon)" ON storage.objects;
DROP POLICY IF EXISTS "Admin puede subir imágenes de productos" ON storage.objects;
DROP POLICY IF EXISTS "Admin puede actualizar imágenes de productos" ON storage.objects;
DROP POLICY IF EXISTS "Admin puede eliminar imágenes de productos" ON storage.objects;

-- ============================================================
-- Policy 1: Lectura pública — cualquier visitante puede ver imágenes
-- ============================================================
CREATE POLICY "Imágenes de productos públicas (lectura anon)"
ON storage.objects
FOR SELECT
TO public  -- anon + authenticated
USING (bucket_id = 'products');

-- ============================================================
-- Policy 2: Subida — solo usuarios autenticados (el admin)
-- ============================================================
CREATE POLICY "Admin puede subir imágenes de productos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products');

-- ============================================================
-- Policy 3: Actualización — solo usuarios autenticados
-- ============================================================
CREATE POLICY "Admin puede actualizar imágenes de productos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'products');

-- ============================================================
-- Policy 4: Eliminación — solo usuarios autenticados
-- ============================================================
CREATE POLICY "Admin puede eliminar imágenes de productos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'products');

-- Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas de Storage configuradas correctamente para el bucket ''products''.';
  RAISE NOTICE '   - Lectura: pública (anon + authenticated)';
  RAISE NOTICE '   - Escritura: solo authenticated (admin)';
  RAISE NOTICE '   - Límite por archivo: 5 MB';
  RAISE NOTICE '   - Tipos permitidos: webp, jpeg, png, gif';
END $$;
