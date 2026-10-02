# Arquitectura

Joyas Fran es un monolito modular en Next.js. La interfaz, los controladores HTTP y la integración con servicios externos se despliegan juntos; PostgreSQL conserva las transacciones críticas.

## Capas

- `app/`: páginas, layouts y Route Handlers.
- `components/`: interfaz reutilizable sin acceso privilegiado.
- `services/`: reglas de negocio y adaptadores externos.
- `lib/`: autenticación, configuración, clientes y utilidades.
- `types/`: contratos compartidos.
- `supabase/migrations/`: cambios versionados de base de datos.

## Límites de confianza

- El navegador nunca determina el monto que Mercado Pago cobra.
- La service role de Supabase solo se utiliza en el servidor.
- Las rutas administrativas comprueban la sesión y el rol antes de usar privilegios.
- El webhook valida `x-signature` y `x-request-id` mediante HMAC-SHA256.
- Un pago se vuelve a consultar directamente en Mercado Pago antes de confirmarlo.
- El stock se descuenta mediante `confirm_payment_stock`, no con actualizaciones separadas desde el cliente.

## Compra y pago

1. El cliente valida el stock visible y crea una orden mediante `process_checkout`.
2. `POST /api/payment/create` recupera el total guardado y crea la preferencia.
3. Mercado Pago procesa el cobro y notifica `POST /api/payment/webhook`.
4. El servidor valida la firma, consulta el pago y compara referencia, estado y monto.
5. PostgreSQL confirma la orden y descuenta stock de forma atómica.
6. Si el stock se agota después del cobro, el sistema intenta reembolsar y registra el incidente.

La ruta `/api/payment/commit` confirma el retorno interactivo del comprador. El webhook sigue siendo la fuente confiable cuando el cliente cierra la pestaña o no regresa.

## Administración

`proxy.ts` protege `/admin`, `/cuenta` y `/checkout`. Los Route Handlers administrativos repiten la autorización en servidor antes de leer o modificar datos privilegiados.

El panel permite operar desde móvil, pero el inventario solo baja automáticamente para ventas procesadas por la web. Las ventas presenciales, por Instagram o por WhatsApp requieren todavía un ajuste manual; una futura función de venta rápida debe resolverlo sin debilitar la transacción de stock.

## Asistente de catálogo

El scanner conserva una original y prepara una copia WebP para Gemini. El servidor solo descarga JPG/PNG/WebP del bucket público `products`, limita a 15 MB y 40 megapíxeles y prepara una copia de análisis de hasta 1200 px. El formulario siempre queda sujeto a revisión humana.

La IA no decide precio, stock, SKU ni material. También puede preparar un borrador editable para Instagram usando la ficha actual; no publica ni sincroniza publicaciones externas.

El editor de fondos experimental conserva la original y añade un PNG derivado a la galería solo tras revisión explícita. Usa BiRefNet lite (MIT), revisión `de15b22ba131738a16dff04aab8bdf8dc32e3ac1`, mediante Transformers.js (Apache-2.0), en un Web Worker. Los pesos se descargan desde Hugging Face y se cachean en el navegador; las fotografías no se envían a ese proveedor. El worker se termina al completar, cancelar o cerrar para liberar memoria. La segmentación genera únicamente alfa; RGB proviene de la foto encuadrada (hasta 1600 px), sin generación, retoque ni eliminación de reflejos. Tres fondos sólidos están definidos en `lib/product-photo.ts`.

Se usa Webpack explícitamente en desarrollo y build: Turbopack de Next 16.1.1 emite este worker como `.ts` sin compilar. No basta con un build exitoso: comprobar el worker en navegador es parte de la validación. `.npmrc` evita descargar CUDA de ONNX Node, que no se utiliza para el editor cliente.

Límites: descarga inicial pesada (~180 MB de pesos más runtime), alto consumo de memoria y recortes imperfectos en huecos y cadenas. Requiere revisión, conexión inicial y navegador moderno. No hay clasificación fiable de confianza ni corrección manual de máscara aún. No se debe anunciar soporte perfecto para todos los diseños/dispositivos. Una copia en la galería también es pública cuando se guarda el producto; la original no es un archivo privado.

## Decisiones pendientes

- Plataforma gratuita definitiva, después de probar cookies, imágenes, Route Handlers y webhooks.
- Registro rápido de ventas externas.
- Validación del editor con más diseños y teléfonos reales; corrección manual de máscaras y fondos de marca.
- Publicación opcional mediante Meta Graph API después de validar permisos y cuenta comercial.
