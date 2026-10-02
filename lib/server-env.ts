function requireServerEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || value.toLowerCase().includes('placeholder')) {
    throw new Error(`Variable de entorno requerida no configurada: ${name}`);
  }
  return value;
}

export const serverEnv = {
  get siteUrl() {
    const value = requireServerEnv('NEXT_PUBLIC_SITE_URL');
    let url: URL;

    try {
      url = new URL(value);
    } catch {
      throw new Error('NEXT_PUBLIC_SITE_URL debe ser una URL válida');
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('NEXT_PUBLIC_SITE_URL debe usar http o https');
    }

    return url.toString().replace(/\/$/, '');
  },
  get mercadoPagoAccessToken() {
    return requireServerEnv('MP_ACCESS_TOKEN');
  },
  get mercadoPagoWebhookSecret() {
    return requireServerEnv('MP_WEBHOOK_SECRET');
  },
  get geminiApiKey() {
    return requireServerEnv('GEMINI_API_KEY');
  },
};
