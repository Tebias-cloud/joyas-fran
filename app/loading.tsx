export default function Loading() {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-4 bg-white/80 backdrop-blur-sm">
      <div className="relative">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-gray-100 border-t-black" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-serif text-xs italic">JF</span>
        </div>
      </div>
      <p className="animate-pulse text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">
        Cargando...
      </p>
    </div>
  );
}
