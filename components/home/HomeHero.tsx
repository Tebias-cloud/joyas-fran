import Image from 'next/image';
import Link from 'next/link';
import type { WebsiteContent } from '@/lib/website-content';

export default function HomeHero({ content, preview = false }: { content: WebsiteContent; preview?: boolean }) {
  return (
    <section className={`relative w-full bg-[#121212] overflow-hidden ${preview ? 'min-h-[380px]' : 'min-h-[600px] h-[85svh]'}`}>
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/img/backdrop-noir.webp)' }}>
        {content.heroImage && <Image src={content.heroImage} alt="Selección de joyas de Joyas Fran" fill className="object-cover opacity-80" style={{ objectPosition: `center ${content.heroPosition}%` }} priority={!preview} sizes={preview ? '600px' : '100vw'} unoptimized />}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/80" />
      </div>
      <div className={`relative z-10 flex h-full flex-col items-center justify-center text-center text-white px-6 ${preview ? 'min-h-[380px] py-12' : 'min-h-[600px] py-24'}`}>
        <p className="text-[10px] uppercase tracking-[0.3em] mb-6">{content.heroBadge}</p>
        <h1 className={`font-serif italic mb-6 leading-tight max-w-4xl ${preview ? 'text-4xl' : 'text-5xl md:text-7xl lg:text-8xl'}`}>{content.heroTitle}</h1>
        <p className="max-w-xl text-base md:text-lg mb-10 leading-relaxed">{content.heroDescription}</p>
        {preview ? <span className="bg-white text-black px-8 py-4 text-xs uppercase tracking-widest">{content.heroButton}</span> : <Link href="/catalogo" className="bg-white text-black px-10 py-4 text-xs uppercase tracking-widest hover:bg-black hover:text-white border border-white transition-colors">{content.heroButton}</Link>}
      </div>
    </section>
  );
}
