import Image from 'next/image';
import Link from 'next/link';
import type { WebsiteContent } from '@/lib/website-content';

export default function HomeHero({ content, preview = false }: { content: WebsiteContent; preview?: boolean }) {
  const heroImage = content.heroImage || '/img/banner-home.webp';

  return (
    <section className={`relative w-full bg-[#121212] overflow-hidden ${preview ? 'min-h-[420px]' : 'h-[90svh] min-h-[620px]'}`}>
      <div className="absolute inset-0 overflow-hidden">
        <div className={`relative h-full w-full ${preview ? '' : 'animate-zoom-out-slow'}`}>
          <Image
            src={heroImage}
            alt="Colección Joyas Fran"
            fill
            className="object-cover opacity-80"
            style={{ objectPosition: `center ${content.heroPosition}%` }}
            priority={!preview}
            sizes={preview ? '700px' : '100vw'}
            quality={95}
            unoptimized={heroImage.startsWith('http')}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/20 to-black/85" />
      </div>

      <div className={`relative z-10 h-full flex flex-col items-center justify-center text-center text-white px-6 ${preview ? 'min-h-[420px] py-12' : ''}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px w-8 bg-white/40" />
          <span className="text-[10px] md:text-xs uppercase tracking-[0.4em] font-medium text-white/90">
            {content.heroBadge}
          </span>
          <div className="h-px w-8 bg-white/40" />
        </div>

        <h1 className={`font-serif italic mb-6 leading-[0.95] drop-shadow-2xl max-w-5xl ${preview ? 'text-4xl md:text-5xl' : 'text-5xl md:text-7xl lg:text-8xl'}`}>
          {content.heroTitle}
        </h1>

        <p className={`max-w-xl font-normal text-white drop-shadow-md leading-relaxed tracking-wide ${preview ? 'text-sm md:text-base mb-8' : 'text-base md:text-xl mb-12'}`}>
          {content.heroDescription}
        </p>

        {preview ? (
          <span className="bg-white text-black px-10 py-4 text-[11px] font-bold uppercase tracking-[0.3em] border border-white shadow-xl">
            {content.heroButton}
          </span>
        ) : (
          <Link
            href="/catalogo"
            className="bg-white text-black px-10 md:px-12 py-4 text-[11px] font-bold uppercase tracking-[0.3em] transition-all duration-300 border border-white hover:bg-black hover:text-white shadow-xl"
          >
            {content.heroButton}
          </Link>
        )}
      </div>
    </section>
  );
}
