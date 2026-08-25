-- ============================================================
-- 💍 Joyas Fran — Migración: Idempotencia y Concurrencia en Stock
-- ============================================================
-- Propósito: Prevenir la doble deducción de stock protegiendo el
-- procedimiento almacenado confirm_payment_stock contra llamadas
-- concurrentes o reintentos duplicados de Mercado Pago (Webhook + Commit).
-- ============================================================

CREATE OR REPLACE FUNCTION public.confirm_payment_stock(p_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
  v_status text;
  v_items jsonb;
  item jsonb;
  v_selected_size text;
  v_quantity int;
BEGIN
  -- 1. Obtener los items y el estado de la orden bloqueando la fila para evitar lectura sucia / concurrencia
  SELECT status, items INTO v_status, v_items 
  FROM orders 
  WHERE id = p_order_id 
  FOR UPDATE;

  -- 2. Si la orden ya está pagada o procesada, salir inmediatamente (Idempotencia)
  IF v_status = 'Pagado' THEN
    RETURN;
  END IF;

  -- 3. Recorrer cada producto comprado
  FOR item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    
    -- Extraer la talla y la cantidad en variables para facilitar la lectura
    v_selected_size := item->>'selectedSize';
    v_quantity := (item->>'quantity')::int;

    -- Si el producto tiene una talla seleccionada
    IF v_selected_size IS NOT NULL AND v_selected_size <> '' THEN
        
        UPDATE products
        SET 
          -- A: Restar del stock general (evitando que quede en negativo con GREATEST)
          stock = GREATEST(0, COALESCE(stock, 0) - v_quantity),
          
          -- B: Restar específicamente dentro del JSON de inventario ("inventory")
          inventory = jsonb_set(
            COALESCE(inventory, '{}'::jsonb), -- Si el inventario es null, asume vacío
            ARRAY[v_selected_size],           -- Busca la llave de la talla (ej: "9")
            to_jsonb(GREATEST(0, COALESCE((inventory->>v_selected_size)::int, 0) - v_quantity)) -- Resta la cantidad
          )
        WHERE id = (item->>'id')::uuid;

    ELSE
        -- Si el producto NO tiene talla (es talla única o sin variante)
        -- Solo restamos el stock general
        UPDATE products
        SET stock = GREATEST(0, COALESCE(stock, 0) - v_quantity)
        WHERE id = (item->>'id')::uuid;
    END IF;
    
  END LOOP;

  -- 4. Marcar la orden como Pagada
  UPDATE orders
  SET status = 'Pagado'
  WHERE id = p_order_id;
END;
$$;
