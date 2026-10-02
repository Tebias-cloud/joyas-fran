'use client';

import { useState } from 'react';
import { Plus, X, Package } from 'lucide-react';
import { TabHeader } from '../_utils';
import type { Category, SizeMap } from '../_types';
import SampleCatalogSetup from './SampleCatalogSetup';

interface SettingsTabProps {
  dbCategories: Category[];
  sizeConfig: SizeMap;
  saveSettings: (key: string, value: SizeMap) => void;
}

export default function SettingsTab({
  dbCategories,
  sizeConfig,
  saveSettings,
}: SettingsTabProps) {
  const [selectedCatForSizes, setSelectedCatForSizes] = useState('');
  const [newSize, setNewSize] = useState('');

  return (
    <div className="space-y-8 animate-fade-in">
      <SampleCatalogSetup />
      <TabHeader
        title="Ajustes Globales"
        description="Define las tallas habilitadas para cada categoría y otras configuraciones globales de la tienda."
      />

      <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        <h3 className="font-serif italic text-xl flex items-center gap-2">
          <Package size={20} /> Tallas por Categoría
        </h3>

        <div className="space-y-4 max-w-md">
          <select
            value={selectedCatForSizes}
            onChange={e => setSelectedCatForSizes(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-black cursor-pointer"
          >
            <option value="">Selecciona una categoría...</option>
            {dbCategories.map(c => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {selectedCatForSizes && (
            <div className="space-y-4 animate-fade-in pt-3 border-t">
              <div className="flex gap-2">
                <input
                  value={newSize}
                  onChange={e => setNewSize(e.target.value)}
                  placeholder="Nueva talla (Ej: 6, 7, Ajustable, Única)"
                  className="flex-grow p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newSize.trim()) {
                        const updatedSizes = {
                          ...sizeConfig,
                          [selectedCatForSizes]: [...(sizeConfig[selectedCatForSizes] || []), newSize.trim()],
                        };
                        saveSettings('sizes', updatedSizes);
                        setNewSize('');
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newSize.trim()) {
                      const updatedSizes = {
                        ...sizeConfig,
                        [selectedCatForSizes]: [...(sizeConfig[selectedCatForSizes] || []), newSize.trim()],
                      };
                      saveSettings('sizes', updatedSizes);
                      setNewSize('');
                    }
                  }}
                  className="bg-black text-white px-5 rounded-lg shadow-md hover:bg-zinc-800 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {(sizeConfig[selectedCatForSizes] || []).map(size => (
                  <div
                    key={size}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-55 rounded-lg border border-gray-200 text-xs font-bold text-gray-700"
                  >
                    <span>{size}</span>
                    <button
                      onClick={() => {
                        const updatedSizes = {
                          ...sizeConfig,
                          [selectedCatForSizes]: sizeConfig[selectedCatForSizes].filter(x => x !== size),
                        };
                        saveSettings('sizes', updatedSizes);
                      }}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {(sizeConfig[selectedCatForSizes] || []).length === 0 && (
                  <p className="text-xs text-gray-400 italic">No hay tallas configuradas en esta categoría.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
