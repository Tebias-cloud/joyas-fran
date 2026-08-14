/**
 * Configuración centralizada de constantes de entorno y de la aplicación.
 */

// Correo de administración del panel.
// SOLO debe definirse mediante la variable de entorno ADMIN_EMAIL en el servidor.
// Si no está configurada, el acceso a /admin quedará completamente bloqueado.
// NO agregar un fallback hardcodeado aquí.
export const ADMIN_EMAIL: string | undefined = process.env.ADMIN_EMAIL;

// URL del sitio de producción
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://joyasfran.cl';

// Datos de contacto de la tienda
export const CONTACT_EMAIL = 'joyasfran925@gmail.com';
export const CONTACT_PHONE = '56976400158';
export const CONTACT_PHONE_FORMATTED = '+56 9 7640 0158';
export const INSTAGRAM_HANDLE = 'joyas_fran_cl';
export const WHATSAPP_MESSAGE_DEFAULT = 'Hola! Vengo de la tienda online y tengo una consulta.';
export const WHATSAPP_MESSAGE_BUTTON = 'Hola Joyas Fran, tengo una duda...';
