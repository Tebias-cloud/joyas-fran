import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    // 👇 Aquí agregamos el 95 y el 100 para tener máxima calidad disponible 👇
    qualities: [75, 85, 95, 100], 
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'unsplash.com' },
      
      // 👇 Tu ID de proyecto correcto 👇
      { protocol: 'https', hostname: 'hptiuhmsuhsuamgmpgwg.supabase.co' },
      
      // Puedes dejar esta por si acaso
      { protocol: 'https', hostname: '**.supabase.co' }, 
    ],
    minimumCacheTTL: 60,
  },
};

export default nextConfig;