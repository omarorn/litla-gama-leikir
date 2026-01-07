
import React, { useRef, useState, useEffect } from 'react';
import { Camera, Wand2, RefreshCw, History, Trash2, ArrowRight, Save } from 'lucide-react';
import { editWorkerImage } from '../services/geminiService';

interface HistoryItem {
    id: number;
    original: string;
    edited: string;
    prompt: string;
    date: string;
}

const GearStation: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [photo, setPhoto] = useState<string | null>(null);
  const [editedPhoto, setEditedPhoto] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history on mount
  useEffect(() => {
      const saved = localStorage.getItem('gear_history');
      if (saved) {
          try {
              setHistory(JSON.parse(saved));
          } catch (e) {
              console.error("Failed to load history");
          }
      }
  }, []);

  const startCamera = async () => {
    try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(s);
    } catch (e) {
        alert("Myndavél virkar ekki.");
    }
  };

  useEffect(() => {
    if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
    }
  }, [stream, photo]);

  useEffect(() => {
      return () => {
          stream?.getTracks().forEach(t => t.stop());
      };
  }, [stream]);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx?.drawImage(videoRef.current, 0, 0);
      setPhoto(canvasRef.current.toDataURL('image/jpeg'));
    }
  };

  const handleEdit = async () => {
      if (!photo || !prompt) return;
      setLoading(true);
      const result = await editWorkerImage(photo.split(',')[1], prompt);
      
      if (result) {
          const editedBase64 = `data:image/jpeg;base64,${result}`;
          setEditedPhoto(editedBase64);
          
          // Save to history
          const newItem: HistoryItem = {
              id: Date.now(),
              original: photo,
              edited: editedBase64,
              prompt: prompt,
              date: new Date().toLocaleTimeString()
          };
          
          const newHistory = [newItem, ...history].slice(0, 10); // Keep last 10
          setHistory(newHistory);
          localStorage.setItem('gear_history', JSON.stringify(newHistory));
      }
      setLoading(false);
  };

  const reset = () => {
      setPhoto(null);
      setEditedPhoto(null);
      setPrompt("");
  };

  const loadFromHistory = (item: HistoryItem) => {
      setPhoto(item.original);
      setEditedPhoto(item.edited);
      setPrompt(item.prompt);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearHistory = () => {
      if(confirm("Ertu viss um að þú viljir eyða sögunni?")) {
          setHistory([]);
          localStorage.removeItem('gear_history');
      }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900 border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl text-white flex flex-col max-h-[90vh]">
        <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between shrink-0">
            <h2 className="text-xl font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-2">
                <Wand2 size={20} /> Græjustöðin
            </h2>
            <button onClick={onBack} className="text-slate-400 hover:text-white">Loka</button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
            
            {/* MAIN AREA */}
            {!photo ? (
                <div className="relative bg-black h-64 rounded-lg flex items-center justify-center mb-4 border border-slate-600 shadow-inner">
                    {stream ? (
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                    ) : (
                        <button onClick={startCamera} className="flex flex-col items-center text-slate-500 hover:text-yellow-400 transition-colors">
                            <Camera size={48} />
                            <span className="mt-2 font-bold">Opna Myndavél</span>
                        </button>
                    )}
                    {stream && (
                        <button onClick={takePhoto} className="absolute bottom-4 bg-white text-black p-4 rounded-full shadow-lg border-4 border-slate-200 hover:scale-110 transition-transform">
                            <Camera size={24} />
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* BEFORE / AFTER VIEW */}
                    {editedPhoto ? (
                        <div className="space-y-2 animate-fade-in">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">
                                <Save size={14} /> Samanburður
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-xs text-slate-500 uppercase font-bold">Fyrir</span>
                                    <div className="aspect-square bg-black rounded-lg overflow-hidden border border-slate-600">
                                        <img src={photo} className="w-full h-full object-cover opacity-80" alt="Original" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-yellow-500 uppercase font-bold">Eftir</span>
                                    <div className="aspect-square bg-black rounded-lg overflow-hidden border-2 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                                        <img src={editedPhoto} className="w-full h-full object-cover" alt="Edited" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded border border-slate-700 text-sm text-yellow-200/80 italic text-center">
                                "{prompt}"
                            </div>
                        </div>
                    ) : (
                        <div className="relative h-64 bg-black rounded-lg overflow-hidden border-2 border-yellow-500 shadow-lg">
                            {loading && (
                                <div className="absolute inset-0 bg-black/80 z-10 flex flex-col items-center justify-center">
                                    <RefreshCw className="animate-spin text-yellow-400 mb-2" size={40} />
                                    <span className="animate-pulse font-mono text-yellow-400 font-bold">Galdrar í gangi...</span>
                                </div>
                            )}
                            <img src={photo} className="w-full h-full object-cover" alt="Worker" />
                        </div>
                    )}

                    {/* CONTROLS */}
                    {!editedPhoto && (
                        <div className="flex gap-2 animate-slide-in">
                            <input 
                                type="text" 
                                value={prompt} 
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Lýsing: t.d. 'Vélmenni' eða 'Jólasveinn'"
                                className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400 shadow-inner"
                                onKeyPress={(e) => e.key === 'Enter' && handleEdit()}
                            />
                            <button onClick={handleEdit} disabled={!prompt || loading} className="bg-yellow-400 text-black font-black uppercase px-6 rounded-xl hover:bg-yellow-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                Breyta
                            </button>
                        </div>
                    )}
                    
                    {editedPhoto && (
                        <button onClick={reset} className="w-full py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold uppercase tracking-widest transition-colors shadow-lg">
                            Ný mynd
                        </button>
                    )}
                </div>
            )}

            {/* HISTORY SECTION */}
            {history.length > 0 && (
                <div className="mt-12 pt-6 border-t-2 border-slate-800">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-400 flex items-center gap-2">
                            <History size={18} /> Sagan
                        </h3>
                        <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                            <Trash2 size={12} /> Hreinsa
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {history.map((item) => (
                            <button 
                                key={item.id}
                                onClick={() => loadFromHistory(item)} 
                                className="group relative aspect-square rounded-lg overflow-hidden border border-slate-700 hover:border-yellow-400 transition-all focus:outline-none"
                            >
                                <img src={item.edited} className="w-full h-full object-cover" alt="History" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <span className="text-[10px] font-bold text-white uppercase text-center px-1">
                                        {item.prompt.slice(0, 15)}...
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            <p className="text-[10px] text-slate-600 mt-8 text-center uppercase tracking-widest">
                Knúið af Gemini 2.5 Flash Image Editing
            </p>
        </div>
        <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default GearStation;
