import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-playfair)', 'serif'],
        sans: ['var(--font-lato)', 'sans-serif'],
      },
      // --- NUEVAS ANIMACIONES AGREGADAS ---
      keyframes: {
        'zoom-out': {
          '0%': { transform: 'scale(1.15)' }, // La imagen empieza al 115% de tamaño
          '100%': { transform: 'scale(1)' },    // Termina en su tamaño original (100%)
        },
        'fade-in-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)', // El texto empieza 20px más abajo e invisible
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',    // Termina en su posición final y visible
          },
        },
      },
      animation: {
        'zoom-out-slow': 'zoom-out 25s ease-out forwards', // Duración ultra lenta para efecto cine
        'fade-in-up': 'fade-in-up 1s ease-out forwards',   // Duración suave para textos
      },
    },
  },
  plugins: [],
};
export default config;