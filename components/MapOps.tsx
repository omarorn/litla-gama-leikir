import React, { useState } from 'react';
import { MapPin, Search, ExternalLink } from 'lucide-react';
import { findPlaces } from '../services/geminiService';

const MapOps: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{text: string, links: string[]} | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
      if (!query) return;
      setLoading(true);
      const data = await findPlaces(query);
      setResult(data);
      setLoading(false);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900 border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl text-white">
        <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between">
            <h2 className="text-xl font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin size={20} /> Svæðisstjórn
            </h2>
            <button onClick={onBack} className="text-slate-400">Loka</button>
        </div>
        
        <div className="p-6">
            <div className="flex gap-2 mb-6">
                <input 
                    className="flex-1 bg-slate-800 border border-slate-600 p-3 rounded text-white"
                    placeholder="T.d. Hvar er Sorpa? eða Næsta bensínstöð?"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button onClick={handleSearch} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded transition-colors">
                    <Search size={20} />
                </button>
            </div>

            {loading && <div className="text-center text-slate-500 animate-pulse">Leita á korti...</div>}

            {result && (
                <div className="bg-slate-800 p-4 rounded border border-slate-600 animate-fade-in">
                    <p className="mb-4 text-sm leading-relaxed">{result.text}</p>
                    {result.links.length > 0 && (
                        <div className="space-y-2">
                            {result.links.map((link, i) => (
                                <a key={i} href={link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-blue-300 hover:text-blue-100 bg-slate-900 p-2 rounded">
                                    <ExternalLink size={12} /> {link}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

export default MapOps;