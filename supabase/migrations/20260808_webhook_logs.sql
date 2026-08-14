-- ============================================================
-- 💍 Joyas Fran — Migración: Tabla de logs del webhook de Mercado Pago
-- ============================================================
-- Propósito: Registrar cada notificación recibida del webhook de MP
-- para permitir diagnóstico y reconciliación manual de pagos fallidos
-- sin necesidad de herramientas externas como Sentry o Axiom.
-- ============================================================

CREATE TABLE IF NOT EXISTS webhook_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id    TEXT NOT NULL,
  topic         TEXT,
  status        TEXT,                           -- Estado reportado por MP: 'approved', 'rejected', etc.
  order_id      TEXT,                           -- ID de la orden en nuestra BD (si se pudo obtener)
  processed     BOOLEAN NOT NULL DEFAULT false, -- true = la orden fue confirmada exitosamente
  error_message TEXT,                           -- Descripción del error si processed = false
  raw_body      JSONB,                          -- Cuerpo completo de la notificación de MP
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índice para búsquedas por payment_id (diagnóstico de un pago específico)
CREATE INDEX IF NOT EXISTS idx_webhook_logs_payment_id
  ON webhook_logs (payment_id);

-- Índice para búsquedas por order_id (rastrear notificaciones de una orden)
CREATE INDEX IF NOT EXISTS idx_webhook_logs_order_id
  ON webhook_logs (order_id);

-- Índice para buscar notificaciones no procesadas (reconciliación)
CREATE INDEX IF NOT EXISTS idx_webhook_logs_unprocessed
  ON webhook_logs (processed, created_at)
  WHERE processed = false;

-- RLS: Solo el service role (backend) puede insertar/leer estos logs.
-- El usuario anon y los usuarios autenticados normales no tienen acceso.
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Sin políticas habilitadas = solo el service role key puede acceder (comportamiento por defecto de Supabase)
-- No se crean políticas explícitas para este table a propósito.

DO $$
BEGIN
  RAISE NOTICE '✅ Tabla webhook_logs creada correctamente.';
  RAISE NOTICE '   Columnas: id, payment_id, topic, status, order_id, processed, error_message, raw_body, created_at';
  RAISE NOTICE '   RLS habilitado: solo service role puede acceder.';
END $$;
