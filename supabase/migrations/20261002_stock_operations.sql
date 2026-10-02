-- Joyas Fran — movimientos de stock para ventas externas y conteos físicos
-- No modifica datos existentes al aplicarse.

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_size text NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('sale', 'restock', 'count')),
  quantity_delta integer NOT NULL,
  stock_before integer NOT NULL CHECK (stock_before >= 0),
  stock_after integer NOT NULL CHECK (stock_after >= 0),
  channel text,
  note text,
  idempotency_key uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_created
  ON public.stock_movements(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_count_created
  ON public.stock_movements(movement_type, created_at DESC);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.apply_admin_stock_movement(
  p_product_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_size text,
  p_channel text,
  p_note text,
  p_idempotency_key uuid,
  p_expected_stock integer DEFAULT NULL
)
RETURNS TABLE (
  movement_id uuid,
  stock_before integer,
  stock_after integer,
  quantity_delta integer,
  product_stock integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inventory jsonb;
  v_product_stock integer;
  v_size text;
  v_before integer;
  v_after integer;
  v_delta integer;
  v_new_inventory jsonb;
  v_new_total integer;
  v_existing public.stock_movements%ROWTYPE;
  v_movement_id uuid;
BEGIN
  IF p_movement_type NOT IN ('sale', 'restock', 'count') THEN
    RAISE EXCEPTION 'Tipo de movimiento inválido';
  END IF;

  IF p_movement_type IN ('sale', 'restock') AND COALESCE(p_quantity, 0) <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor que cero';
  END IF;

  IF p_movement_type = 'count' AND COALESCE(p_quantity, -1) < 0 THEN
    RAISE EXCEPTION 'El conteo no puede ser negativo';
  END IF;

  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Falta la clave de idempotencia';
  END IF;

  SELECT *
    INTO v_existing
  FROM public.stock_movements
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN QUERY
    SELECT
      v_existing.id,
      v_existing.stock_before,
      v_existing.stock_after,
      v_existing.quantity_delta,
      COALESCE((SELECT p.stock FROM public.products p WHERE p.id = v_existing.product_id), v_existing.stock_after);
    RETURN;
  END IF;

  SELECT COALESCE(inventory, '{}'::jsonb), COALESCE(stock, 0)
    INTO v_inventory, v_product_stock
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;

  v_size := NULLIF(btrim(COALESCE(p_size, '')), '');

  IF jsonb_object_length(v_inventory) = 0 THEN
    v_inventory := jsonb_build_object('unico', v_product_stock);
  END IF;

  IF v_size IS NULL THEN
    IF v_inventory ? 'unico' THEN
      v_size := 'unico';
    ELSIF jsonb_object_length(v_inventory) = 1 THEN
      SELECT key INTO v_size FROM jsonb_each(v_inventory) LIMIT 1;
    ELSE
      RAISE EXCEPTION 'Selecciona la talla o variante';
    END IF;
  END IF;

  IF NOT (v_inventory ? v_size) THEN
    RAISE EXCEPTION 'La variante seleccionada no existe';
  END IF;

  v_before := COALESCE((v_inventory ->> v_size)::integer, 0);

  IF p_movement_type = 'count'
     AND p_expected_stock IS NOT NULL
     AND v_before <> p_expected_stock THEN
    RAISE EXCEPTION 'El stock cambió desde que abriste el conteo. Recarga antes de confirmar.';
  END IF;

  IF p_movement_type = 'sale' THEN
    v_after := v_before - p_quantity;
    v_delta := -p_quantity;
    IF v_after < 0 THEN
      RAISE EXCEPTION 'No hay stock suficiente para registrar esta venta';
    END IF;
  ELSIF p_movement_type = 'restock' THEN
    v_after := v_before + p_quantity;
    v_delta := p_quantity;
  ELSE
    v_after := p_quantity;
    v_delta := v_after - v_before;
  END IF;

  v_new_inventory := jsonb_set(v_inventory, ARRAY[v_size], to_jsonb(v_after), true);

  SELECT COALESCE(sum(value::integer), 0)
    INTO v_new_total
  FROM jsonb_each_text(v_new_inventory);

  UPDATE public.products
  SET inventory = v_new_inventory,
      stock = v_new_total
  WHERE id = p_product_id;

  INSERT INTO public.stock_movements (
    product_id,
    variant_size,
    movement_type,
    quantity_delta,
    stock_before,
    stock_after,
    channel,
    note,
    idempotency_key
  )
  VALUES (
    p_product_id,
    v_size,
    p_movement_type,
    v_delta,
    v_before,
    v_after,
    NULLIF(btrim(COALESCE(p_channel, '')), ''),
    NULLIF(btrim(COALESCE(p_note, '')), ''),
    p_idempotency_key
  )
  RETURNING id INTO v_movement_id;

  RETURN QUERY
  SELECT v_movement_id, v_before, v_after, v_delta, v_new_total;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_admin_stock_movement(uuid, text, integer, text, text, text, uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_admin_stock_movement(uuid, text, integer, text, text, text, uuid, integer)
  TO service_role;
