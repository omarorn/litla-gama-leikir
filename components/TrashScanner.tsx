
import React, { useRef, useState, useEffect } from 'react';
import { Camera, Scan, CheckCircle, AlertTriangle, Cpu, Loader2 } from 'lucide-react';
import { identifyTrashItem } from '../services/geminiService';

interface TrashScannerProps {
    onBack: () => void;
    isWinter?: boolean;
}

const TrashScanner: React.FC<TrashScannerProps> = ({ isWinter }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ item: string, bin: string, reason: string } | null>(null);

  const accentColor = isWinter ? 'text-cyan-400' : 'text-yellow-400';
  const borderColor = isWinter ? 'border-cyan-500' : 'border-yellow-500';
  const bgButton = isWinter ? 'bg-cyan-500 hover:bg-cyan-400' : 'bg-yellow-400 hover:bg-yellow-300';

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(s);
    } catch (e) {
      alert("Myndavél virkar ekki. Athugaðu leyfi.");
    }
  };

  useEffect(() => {
    if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.error("Video play failed", e));
    }
    return () => {
        // Cleanup happens when component unmounts or stream changes, but we want to keep stream until explicit stop
    };
  }, [stream, result]); // Re-attach if result is cleared and we go back to video

  // Cleanup on unmount
  useEffect(() => {
      return () => {
          stream?.getTracks().forEach(t => t.stop());
      };
  }, [stream]);

  const scan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setScanning(true);
    
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx?.drawImage(videoRef.current, 0, 0);
    
    const base64 = canvasRef.current.toDataURL('image/jpeg').split(',')[1];
    
    try {
        const data = await identifyTrashItem(base64);
        setResult(data);
    } catch (err) {
        console.error(err);
        setResult({ item: "Villa", bin: "Óþekkt", reason: "Gat ekki greint mynd." });
    } finally {
        setScanning(false);
    }
  };

  const reset = () => {
      setResult(null);
      // Stream is still active, useEffect will re-attach it to the new video element
  };

  return (
    <div className={`w-full bg-slate-900 border-2 ${borderColor} rounded-2xl overflow-hidden shadow-2xl animate-fade-in text-white`}>
      <div className="p-8 flex flex-col items-center min-h-[500px] justify-center">
        
        {!stream && !result && (
            <div className="text-center mb-10">
                <div className={`inline-block p-4 rounded-full border-2 ${borderColor} bg-slate-800 mb-4`}>
                    <Scan size={48} className={isWinter ? 'text-cyan-400' : 'text-yellow-400'} />
                </div>
                <h2 className="text-4xl font-black uppercase tracking-tighter mb-2">
                    AI Flokkunarvél <span className={`text-base align-top ${accentColor}`}>v3.0 PRO</span>
                </h2>
                <p className="text-slate-400 text-lg max-w-md mx-auto">
                    Notaðu Gemini 3 Flash Vision til að greina hvers kyns úrgang með nákvæmni.
                </p>
            </div>
        )}

        <div className="w-full max-w-xl relative">
            {!result ? (
                stream ? (
                    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border-2 border-slate-700">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <div className="absolute inset-0 pointer-events-none">
                            <div className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 ${borderColor}`}></div>
                            <div className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 ${borderColor}`}></div>
                            <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 ${borderColor}`}></div>
                            <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 ${borderColor}`}></div>
                            {scanning && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <Loader2 className="animate-spin text-white" size={48} />
                                </div>
                            )}
                        </div>
                    </div>
                ) : null
            ) : (
                <div className="w-full bg-slate-800 p-8 rounded-xl border border-slate-600 mb-6 text-center shadow-2xl animate-scale-in">
                    <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-lg ring-4 ring-slate-700 bg-slate-700`}>
                        {result.bin.toLowerCase().includes('almennt') ? <AlertTriangle size={48} className="text-orange-400" /> : <CheckCircle size={48} className="text-green-400" />}
                    </div>
                    <h3 className="text-3xl font-black mb-2 uppercase">{result.item}</h3>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="text-slate-400 font-mono text-sm uppercase">Flokkur:</span>
                        <span className={`text-2xl font-bold ${accentColor}`}>{result.bin}</span>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 text-left">
                         <p className="text-slate-300 text-sm leading-relaxed"><Cpu size={14} className="inline mr-2 opacity-50"/>{result.reason}</p>
                    </div>
                    
                    <button onClick={reset} className="mt-8 text-sm text-slate-400 hover:text-white underline decoration-dotted">
                        Skanna annan hlut
                    </button>
                </div>
            )}
        </div>

        <div className="w-full max-w-sm mt-8">
            {!result && (
                !stream ? (
                    <button onClick={startCamera} className={`w-full py-5 ${bgButton} text-black rounded-xl font-black uppercase tracking-widest transition-all hover:scale-105 shadow-lg flex items-center justify-center gap-3`}>
                        <Camera size={24} /> Virkja Skanna
                    </button>
                ) : (
                    <button onClick={scan} disabled={scanning} className={`w-full py-5 ${scanning ? 'bg-slate-700 text-slate-400 cursor-wait' : bgButton + ' text-black'} rounded-xl font-black uppercase tracking-widest shadow-lg`}>
                        {scanning ? "Greini mynd..." : "Greina hlut"}
                    </button>
                )
            )}
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default TrashScanner;
