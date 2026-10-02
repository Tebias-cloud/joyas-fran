# Guía simple del panel

Esta guía está pensada para operar Joyas Fran sin conocimientos técnicos.

## Agregar una joya

1. Entra a **Productos** y pulsa **Nueva joya**.
2. Elige **Subir foto y recibir ayuda**.
3. Toma o selecciona una foto clara, con buena luz y la joya completa.
4. El sistema propondrá nombre, descripción y categoría.
5. Revisa el texto: la sugerencia ayuda, pero no conoce medidas, piedras ni detalles que no se vean.
6. Escribe el precio y la cantidad disponible.
7. Si quieres anunciarla, pulsa **Preparar texto** en la sección de Instagram, revísalo y cópialo.
8. Pulsa **Guardar joya**.

## Regla principal del stock

El panel es la lista principal de existencias. Una venta pagada en la web descuenta stock automáticamente. Si la venta ocurre presencialmente, por Instagram o por WhatsApp, hay que abrir la joya y descontar esa unidad manualmente.

Una publicación antigua de Instagram no representa stock en tiempo real. Por eso los textos no indican cantidades exactas y siempre invitan a confirmar disponibilidad.

## Fotografías

- En **Fotos del producto**, las nuevas subidas JPG, PNG y WebP se guardan sin recomprimir (hasta 15 MB). Conserva además un respaldo en tu teléfono.
- Usa luz natural suave y evita reflejos fuertes.
- No tapes ninguna parte de la joya.
- Pulsa **Preparar foto** en una foto. La herramienta está en prueba: no garantiza recortes perfectos.
- Si es una captura, abre **Ajustar encuadre** para quitar las barras. El marco verde indica qué parte se usará. Para una foto normal no hace falta ajustar nada.
- Pulsa **Preparar vista previa**. La primera vez descarga un modelo pesado; usa Wi-Fi y, si tu teléfono tarda demasiado, un computador. Puedes cancelar.
- La copia queda cuadrada, centrada y con el fondo oscuro de la tienda. Si prefieres marfil, abre **Cambiar fondo**. Revisa bordes, piedras, cadenas y los huecos interiores. La IA calcula qué se conserva, no dibuja joyas nuevas; puede equivocarse y borrar detalles.
- Si está bien, marca la confirmación y pulsa **Guardar copia con fondo**. Se añade una imagen nueva junto a la original; si era la primera, la copia pasa a ser portada. Guarda la joya para confirmar los cambios del catálogo.
- Si está mal, pulsa **Conservar original / cerrar**. No cambia la foto ni el stock. No se publica automáticamente en Instagram.
- La herramienta no corrige reflejos de colores, desenfoque ni recupera detalle perdido en capturas.

Para tomar fotos: una sola joya completa sobre fondo mate neutro, luz suave junto a una ventana, cámara 1× y tocar la joya en pantalla para enfocar. Sube desde la galería; evita capturas y filtros. No necesitas repetir fotos antiguas para empezar.

## Qué hace y qué no hace la IA

La IA ayuda a redactar y clasificar. Nunca decide el precio, el stock, el material real ni publica por sí sola. Todo queda editable antes de guardar o copiar.

## Cambiar portada y temporada

1. Entra a **Página web**.
2. Si quieres, elige **Clásica**, **Regalos** o **Navidad** para rellenar título y texto. Son sugerencias editables, no cambian las fotos.
3. Selecciona una foto del catálogo o sube una portada propia. Mueve el encuadre arriba o abajo si hace falta.
4. Marca hasta seis joyas destacadas. Las agotadas o desactivadas se ocultan automáticamente de esa sección; la portada se cambia manualmente.
5. Revisa la portada en tamaño celular o computador, marca la confirmación y pulsa **Guardar cambios en la página**.

En **Otros textos de la página** puedes cambiar presentación, ventajas y títulos de inicio y catálogo. Las fotos y nombres de categorías se editan desde **Categorías**. Las ediciones de Página web se conservan al cambiar de pestaña del panel, pero hay que guardarlas antes de cerrar.

Usa joyas reales de la tienda en portada y categorías. Sin portada elegida se muestra la textura oscura sin joyas inventadas. El editor usa un fondo preparado fotografiado desde arriba; no necesita volver a generar el fondo para cada joya. Una foto lateral necesita un fondo compatible: cambiar solo el fondo no cambia el ángulo de la pieza.

Esta sección no modifica navegación, pie de página, políticas ni pagos. Los textos del catálogo pueden tardar hasta un minuto en renovarse según la caché.

## Primera carga con las fotos de mamá

La persona que configura la tienda debe aplicar una vez `supabase/migrations/20261002_sample_catalog.sql` desde el editor SQL de Supabase. Después entra a **Ajustes → Preparar catálogo con las fotos de mamá** y sigue la confirmación del panel.

La carga incorpora nueve dijes y una pulsera con las fotografías originales recortadas, sus copias sobre el fondo oscuro y una portada de corazones y cisnes. No hay anillos ni aros inventados. Los productos anteriores quedan desactivados; se mantienen sus pedidos y se registra un respaldo de visibilidad, categorías y portada.

**Precios, cantidades y materiales requieren confirmación.** Una imagen no permite saber el inventario ni el precio real. Mientras sean de muestra, aparece un aviso y el servidor bloquea sus pagos. Para habilitar una joya, edítala, confirma su material en el paso 2, revisa precio y stock en el paso 3 y marca que has verificado sus datos antes de guardar. Hacer esto una vez permite vender esa pieza; las demás continúan en revisión.

La operación usa la base de datos conectada: si Preview y producción comparten Supabase, ambos verán el catálogo nuevo. No vuelvas a ejecutar la carga para cambiar temporada; usa **Página web**.
