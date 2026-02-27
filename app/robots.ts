import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://joyas-fran.vercel.app'; // <--- TU DOMINIO AQUÍ

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/cuenta/'], // Ocultamos admin y cuenta a Google
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}