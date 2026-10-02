-- One-time, transactional replacement with the owner's photographed designs.
-- Old rows remain available to orders; only their visibility changes.
CREATE TABLE IF NOT EXISTS public.catalog_replacement_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL
);
ALTER TABLE public.catalog_replacement_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalog_replacement_snapshots FROM anon, authenticated;
GRANT ALL ON public.catalog_replacement_snapshots TO service_role;

CREATE OR REPLACE FUNCTION public.install_photographed_catalog(p_products jsonb, p_hero text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  snapshot_id uuid;
  cat_id integer;
  product_id uuid;
  item jsonb;
  featured jsonb := '[]'::jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('joyas-fran-catalog-replacement'));
  IF EXISTS (SELECT 1 FROM public.products WHERE sku LIKE 'FRAN-MUESTRA-%') THEN
    RAISE EXCEPTION 'El catálogo de muestra ya fue instalado. Edita sus productos desde el panel.';
  END IF;
  IF p_products IS NULL OR jsonb_typeof(p_products) <> 'array' OR jsonb_array_length(p_products) <> 10 THEN
    RAISE EXCEPTION 'Se requieren las diez joyas fotografiadas.';
  END IF;
  INSERT INTO public.catalog_replacement_snapshots(payload)
  SELECT jsonb_build_object(
    'products', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'is_active', is_active)) FROM public.products), '[]'),
    'categories', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM public.categories c), '[]'),
    'website', (SELECT value FROM public.store_settings WHERE key = 'website')
  ) RETURNING id INTO snapshot_id;

  UPDATE public.products SET is_active = false;
  UPDATE public.categories SET is_active = false;

  FOR item IN SELECT value FROM jsonb_array_elements(p_products) LOOP
    IF item->>'category' NOT IN ('Dijes', 'Pulseras') OR item->>'sku' NOT LIKE 'FRAN-MUESTRA-%' THEN
      RAISE EXCEPTION 'Producto de muestra no válido.';
    END IF;
    INSERT INTO public.categories(name, slug, description, image_url, position, is_active)
    VALUES (item->>'category', lower(item->>'category'), 'Joyas fotografiadas de la tienda.', item->>'image_url', CASE WHEN item->>'category' = 'Dijes' THEN 10 ELSE 20 END, true)
    ON CONFLICT (name) DO UPDATE SET image_url = EXCLUDED.image_url, description = EXCLUDED.description, is_active = true
    RETURNING id INTO cat_id;

    INSERT INTO public.products(name, slug, description, price, compare_at_price, category, category_id, image_url, images, stock, inventory, sizes, sku, material, brand, is_active, is_featured)
    VALUES (item->>'name', item->>'slug', item->>'description', (item->>'price')::numeric, NULL, item->>'category', cat_id, item->>'image_url', ARRAY[item->>'image_url', item->>'original_url'], (item->>'stock')::integer, jsonb_build_object('Talla Única', (item->>'stock')::integer), ARRAY['Talla Única'], item->>'sku', 'Por confirmar', 'Joyas Fran', true, jsonb_array_length(featured) < 6)
    RETURNING id INTO product_id;
    IF jsonb_array_length(featured) < 6 THEN featured := featured || jsonb_build_array(product_id); END IF;
  END LOOP;
  INSERT INTO public.store_settings(key, value) VALUES ('website', jsonb_build_object(
    'heroTitle', 'Detalles que cuentan tu historia', 'heroBadge', 'Joyas Fran · Iquique',
    'heroDescription', 'Descubre los dijes y pulseras de nuestra colección.', 'heroButton', 'Ver colección',
    'heroImage', p_hero, 'heroPosition', 50, 'categoriesTitle', 'Elige tu próximo detalle',
    'featuredTitle', 'Nuestra selección', 'featuredProductIds', featured,
    'story', 'Joyas elegidas con cariño para acompañarte o sorprender a alguien especial.',
    'benefits', jsonb_build_array(
      jsonb_build_object('title','Desde Iquique','description','Consulta las opciones de entrega.'),
      jsonb_build_object('title','Para regalar','description','Encuentra un detalle especial.'),
      jsonb_build_object('title','Atención cercana','description','Te ayudamos a elegir tu joya.')
    ), 'catalogTitle', 'Nuestra colección', 'catalogDescription', 'Dijes y pulseras para acompañar tu estilo.'
  )) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  RETURN jsonb_build_object('snapshotId', snapshot_id, 'products', 10);
END $$;
REVOKE ALL ON FUNCTION public.install_photographed_catalog(jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.install_photographed_catalog(jsonb, text) TO service_role;
