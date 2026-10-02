# Validación inicial de fondos

Estado: experimental, no fusionar como función garantizada para cualquier dispositivo.

Se probaron tres capturas reales de Joyas Fran, encuadradas para quitar WhatsApp: corazones, cisnes y ala con piedras. No se incluyen las fotos privadas en Git ni se usan como fixtures públicos.

En CPU Node, con BiRefNet lite fp32, revisión fijada y entrada a 1024 px, el procesamiento medido fue aproximadamente 16 s para corazones, 35 s para cisnes y 27 s para ala. No son tiempos de teléfono ni del Web Worker. La descarga inicial no está incluida. Una prueba inicial por lotes excedió la memoria del entorno; el editor procesa una foto y termina su worker.

Revisión visual inicial: la segmentación distingue los huecos de corazones, cisnes y ala; quedan reflejos rojos del fondo original sobre el metal. No se eliminan porque implicaría retocar la joya. Esta inspección no acredita fidelidad de todos los bordes ni garantiza resultados en otras piezas.

Antes de producción:

- Comprobar el worker empaquetado en Chromium y en el teléfono real de la administradora.
- Probar pulsera/cadena fina, anillo, par de aros, transparencias y fotos con la joya puesta.
- Verificar guardado autenticado, Storage/RLS y que cancelar no cambia el catálogo.
- Confirmar original conservada, selección de portada y rechazo de resultado incorrecto.
- Medir primera descarga, caché, memoria, cancelación y repetición.
- Diseñar corrección de máscara solo si la revisión de casos reales la justifica.

Limitación del entorno: no hay Chromium instalado y su descarga devolvió un archivo inválido. Se verificó que Webpack emite un worker JavaScript y su runtime WASM, pero la ejecución en navegador y la subida real a Supabase no están acreditadas por estas pruebas.

La guía para la administradora está en `ADMIN_GUIDE.md`.

El editor centra la máscara en un lienzo de 1200 × 1200, manteniendo proporciones. Usa por defecto la textura oscura de marca y ofrece marfil como alternativa secundaria. El encuadre manual queda en una sección secundaria. Las pruebas unitarias cubren cadenas tenues y máscaras vacías; la nueva presentación todavía requiere revisión visual en navegador.

Se procesaron además las diez fotografías enviadas por la dueña: nueve dijes y una pulsera. Se revisó visualmente la composición sobre textura oscura, incluidos huecos y cadena de extensión. Los reflejos rojos/amarillos permanecen en las piezas tal como aparecen en las fuentes. El original recortado se conserva por separado. Es una revisión inicial de los activos estáticos, no una garantía de segmentación ni una prueba del worker en teléfono.

La sección Página web guarda exclusivamente la clave `website` en la tabla existente `store_settings`, a través de una ruta autenticada de administrador. Antes de producción, comprobar lectura/guardado con una cuenta real y permisos del bucket `products`, vista móvil, cambios de temporada y exclusión de destacados sin stock. No se aplicaron cambios a tablas o políticas de la base de datos.

## Casos reales adicionales recibidos el 02-10-2026

Se revisaron cuatro fotografías/capturas adicionales como referencia de QA para el flujo móvil. No se infiere material, pureza ni tipo de piedra a partir de la imagen.

- Pulsera/cadena fina con varios colgantes brillantes y una cruz: sirve para comprobar que la máscara no corte eslabones ni colgantes pequeños y que tolere reflejos intensos.
- Dije circular pequeño con centro de tono celeste: sirve para comprobar objetos pequeños con mucho fondo y que el encuadre pueda acercarlos sin inventar detalle.
- Pulsera de cuentas claras/oscuras con corazones: sirve para revisar cuentas pequeñas, cadena de extensión y contraste bajo con fondo claro.
- Pulsera de cuentas violetas con detalles metálicos: sirve para revisar repetición de cuentas, reflejos y cadena de extensión.

Estas capturas incluyen interfaz de historia/mensajería alrededor de la foto. El flujo de producción debe recortar esa interfaz antes de publicar; no debe guardar nombres de contacto, botones, hora, batería ni otros elementos de pantalla como parte de la imagen del producto. Para la demo se mantienen los activos limpios ya preparados en `public/sample-catalog`; estas cuatro fuentes quedan como criterios de prueba para nuevas cargas desde el teléfono.
