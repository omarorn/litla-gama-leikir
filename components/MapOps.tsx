
import React, { useState } from 'react';
import { MapPin, Search, ExternalLink, Navigation } from 'lucide-react';
import { findPlaces } from '../services/geminiService';

const MapOps: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{text: string, links: string[]} | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapUrl, setMapUrl] = useState<string | null>(null);

  const handleSearch = async () => {
      if (!query) return;
      setLoading(true);
      const data = await findPlaces(query);
      setResult(data);
      
      // Create an embed URL for the map based on the query
      // Using the public iframe generator pattern for simple grounding visualization
      const encodedQuery = encodeURIComponent(query);
      setMapUrl(`https://maps.google.com/maps?q=${encodedQuery}&t=&z=13&ie=UTF8&iwloc=&output=embed`);
      
      setLoading(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900 border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl text-white flex flex-col h-[600px]">
        <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between shrink-0">
            <h2 className="text-xl font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin size={20} /> Svæðisstjórn <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">LIVE</span>
            </h2>
            <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors">Loka</button>
        </div>
        
        <div className="flex flex-col md:flex-row h-full">
            {/* Sidebar Controls */}
            <div className="w-full md:w-1/3 p-6 border-r border-slate-700 flex flex-col bg-slate-800/50">
                <div className="flex gap-2 mb-6">
                    <input 
                        className="flex-1 bg-slate-900 border border-slate-600 p-3 rounded text-white focus:border-blue-500 outline-none"
                        placeholder="Leita: t.d. Sorpa, Landspítali..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button onClick={handleSearch} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded transition-colors disabled:opacity-50">
                        <Search size={20} />
                    </button>
                </div>

                {loading && (
                    <div className="flex items-center gap-2 text-blue-300 animate-pulse mb-4">
                        <Navigation className="animate-spin" size={16} />
                        <span className="text-sm font-mono">Reikna hnit...</span>
                    </div>
                )}

                {result && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="bg-slate-900 p-4 rounded border border-slate-600 animate-fade-in mb-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Greining:</h3>
                            <p className="text-sm leading-relaxed text-slate-300">{result.text}</p>
                        </div>

                        {result.links.length > 0 && (
                            <div className="space-y-2">
                                {result.links.map((link, i) => (
                                    <a key={i} href={link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-blue-300 hover:text-blue-100 bg-slate-900 p-2 rounded border border-slate-700 hover:border-blue-500 transition-colors">
                                        <ExternalLink size={12} /> Opna í Google Maps
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Map Area */}
            <div className="flex-1 bg-slate-950 relative">
                {mapUrl ? (
                    <iframe 
                        width="100%" 
                        height="100%" 
                        src={mapUrl}
                        frameBorder="0" 
                        scrolling="no" 
                        marginHeight={0} 
                        marginWidth={0}
                        className="w-full h-full grayscale-[50%] contrast-125 hover:grayscale-0 transition-all duration-500"
                        title="Map View"
                    ></iframe>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 opacity-50">
                        <MapPin size={64} className="mb-4" />
                        <p className="text-sm uppercase font-bold tracking-widest">Ekkert kort valið</p>
                    </div>
                )}
                
                {/* Overlay Grid Effect */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,0,0,0)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20"></div>
            </div>
        </div>
    </div>
  );
};

export default MapOps;
