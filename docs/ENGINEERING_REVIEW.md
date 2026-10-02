# Revisión incremental de Joyas Fran

El repositorio tiene una estructura utilizable (servicios, tipos, panel por componentes y rutas de servidor), pero todavía mezcla decisiones de presentación, datos de muestra y reglas comerciales. No se considera certificado para producción por pasar compilación.

## Corregido en esta iteración

| Problema observado | Cambio | Qué significa en la práctica |
| --- | --- | --- |
| Catálogo, búsqueda y sitemap incluían productos desactivados y registros TEST | Consultas públicas limitadas a activos, excluyendo el prefijo de pruebas | Desactivar una joya la retira también de la búsqueda y la ficha |
| La ficha serializaba costos, proveedor y código de barras | Campos internos retirados de la ficha y de las consultas públicas | Esos datos no viajan en la respuesta de la interfaz pública |
| Guardar una joya restablecía su costo a cero | Se conserva el costo existente | Editar una descripción no borra ese dato |
| El escáner y formulario afirmaban automáticamente Plata 925 | Material editable y escáner con valor Por confirmar | La etiqueta/proveedor confirma el material, no la foto |
| Se podía iniciar pago de un producto desactivado | Verificación de actividad en carrito y creación de pago | Un carrito viejo no permite cobrar una pieza retirada |
| Productos de ejemplo parecían vendibles | Marcador de muestra y bloqueo servidor de Mercado Pago hasta revisión | Se puede probar el catálogo sin cobrar precios inventados |
| Catálogo de muestra repetido y fotos ficticias | Importación de diez diseños fotografiados en una transacción | Nombres útiles, fotos reales, categorías Dijes/Pulseras y portada coherente |

## Datos y fotografías

`lib/sample-catalog.ts` es la única lista de diseños de esta muestra. Sus precios y cantidades son ejemplos. Los materiales y las piedras no se adivinan. La nueva importación no usa el antiguo `seed.sql` con joyas de Unsplash.

Las capturas privadas completas no se incluyen en Git. Se conserva solo la región de la foto, sin interfaz, contacto ni mensajes. Los originales recortados se guardan junto a las copias de catálogo. BiRefNet genera una máscara; el fondo se genera por separado y se reutiliza. La composición no genera geometría ni retoca reflejos de la pieza. La pulsera, los huecos y los detalles de los diez diseños tuvieron una revisión visual inicial; la segmentación sigue pudiendo perder bordes.

Los scripts de preparación son reproducibles. Los recortes PNG de trabajo son temporales; los activos web son WebP. El diseño conserva el logo JF suministrado.

## Reemplazo de catálogo

La ruta administrativa realiza autorización, comprueba la instalación de la migración y sube las fotos a un espacio nuevo de Storage antes de llamar a una función SQL privada para `service_role`. La función toma un bloqueo transaccional, registra el respaldo, desactiva los registros anteriores, inserta los diez productos y actualiza portada/destacados. Un error SQL revierte todo el cambio de datos. Repetir la instalación está bloqueado para no sobrescribir datos ya revisados.

Los archivos de una subida interrumpida pueden quedar sin referencias en Storage; se dejan intactos ante un resultado de red ambiguo para no borrar imágenes de una transacción que sí se haya confirmado. Su limpieza posterior requiere verificar referencias.

El respaldo guarda actividad previa de productos, categorías y configuración de portada, no una copia integral de la base. Los pedidos y productos anteriores no se borran. La migración aún debe probarse contra el esquema real: este entorno no tiene credenciales de Supabase ni PostgreSQL local.

## Siguiente trabajo, en orden

1. **Esquema y permisos reales:** verificar tablas, columnas, RLS y permisos de Storage. Reducir las columnas consultadas no impide por sí solo consultar costos directamente con la clave pública si la base concede ese permiso.
2. **Checkout:** revisar `process_checkout` en la base real. Actualmente el navegador envía total e ítems; hay que confirmar que SQL recalcula precios, cantidades, envío y cupón y nunca confía en el total enviado.
3. **Validación administrativa:** reemplazar los payloads genéricos por esquemas compartidos y una operación transaccional para producto/variantes. Hoy una escritura de variantes puede fallar después de actualizar el producto.
4. **Stock:** definir una sola fuente entre `products.stock`, JSON de inventario y variantes; comprobar sincronización en ventas web y ajustes manuales. Validar cantidades agrupadas cuando un carrito repite producto/talla.
5. **Experiencia de mamá:** probar con su teléfono, especialmente recorte, primera descarga del modelo, recuperación de errores y guardado; reducir más controles según lo que realmente use.
6. **Contenido comercial:** revisar Nosotros, políticas y checkout, donde persisten afirmaciones y condiciones históricas que deben confirmar las dueñas.

## Evidencia

Pruebas unitarias cubren filtrado de visibilidad en los puntos de entrada públicos, exclusión de columnas internas, marcador de revisión de pagos, datos de muestra y lógica de fotos. También se ejecutan TypeScript, ESLint y compilación Webpack. No sustituyen una prueba autenticada contra Supabase o una compra de prueba aislada.
