# Joyas Fran

E-commerce para una joyería real de Iquique. Centraliza catálogo, inventario, pedidos y pagos; además incluye asistencia con IA para cargar productos desde fotografías.

## Estado

En endurecimiento previo a producción. El flujo principal está implementado, pero la salida pública exige completar la configuración externa y el QA descritos abajo.

## Funcionalidades

- Catálogo con categorías, variantes, tallas y stock.
- Carrito persistente, cupones y cálculo de despacho.
- Checkout Pro de Mercado Pago.
- Confirmación transaccional e idempotente de pagos y stock en PostgreSQL.
- Panel administrativo responsivo para productos, categorías, pedidos, promociones y ajustes.
- Compresión WebP y múltiples imágenes por producto.
- Asistente Gemini para nombre, descripción, categoría y metadatos SEO.
- Texto editable para Instagram preparado desde la ficha y el stock actual.
- Editor experimental de encuadre y tres fondos preparados: segmentación local, revisión y copia derivada conservando la original.
- Supabase Auth, RLS, Storage y RPC.

## Stack

- Next.js 16, React 19 y TypeScript.
- Supabase/PostgreSQL.
- Mercado Pago.
- Gemini API.
- Tailwind CSS.
- Playwright para pruebas E2E.

## Desarrollo local

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Verificación:

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

Las pruebas E2E requieren un entorno aislado y las credenciales indicadas en `.env.example`. No deben ejecutarse contra producción.

## Configuración

Variables obligatorias:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAIL`
- `NEXT_PUBLIC_SITE_URL`
- `MP_ACCESS_TOKEN`
- `MP_WEBHOOK_SECRET`
- `GEMINI_API_KEY`

`SUPABASE_SERVICE_ROLE_KEY`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` y `GEMINI_API_KEY` son secretos de servidor.

## Antes de producción

1. Reactivar y aplicar las migraciones del proyecto Supabase.
2. Configurar las variables del entorno de producción.
3. Configurar el webhook de Mercado Pago y copiar su firma secreta.
4. Probar pago aprobado, rechazado, pendiente, webhook repetido y falta de stock.
5. Validar RLS y acceso a `/admin`.
6. Ejecutar lint, pruebas, build y QA móvil.
7. Reemplazar la URL temporal por el dominio definitivo.

La arquitectura y sus invariantes están documentadas en [ARCHITECTURE.md](ARCHITECTURE.md). La operación diaria está resumida en [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md).
