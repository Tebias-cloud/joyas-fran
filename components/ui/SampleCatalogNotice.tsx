'use client';
import { useEffect, useState } from 'react';

export default function SampleCatalogNotice() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    let mounted = true;
    fetch('/api/catalog-status', { cache: 'no-store' }).then(response => response.ok ? response.json() : null).then(data => { if (mounted) setActive(Boolean(data?.exampleValues)); }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  return active ? <p className="bg-zinc-900 text-zinc-200 text-center text-xs px-5 py-3">Colección en revisión · precios y existencias de ejemplo. Las joyas sin revisar no permiten pagos.</p> : null;
}
