import React, { useRef, useState } from 'react';
import { Camera, Scan, CheckCircle, AlertTriangle, Cpu } from 'lucide-react';
import { identifyTrashItem } from '../services/geminiService';

interface TrashScannerProps {
    onBack: () => void;
    isWinter?: boolean;
    onSystemDiagnostics?: () => void;
}

const TrashScanner: React.FC<TrashScannerProps> = ({ isWinter, onSystemDiagnostics }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ item: string, bin: string, reason: string } | null>(null);

  const accentColor = isWinter ? 'text-cyan-400' : 'text-yellow-400';
  const borderColor = isWinter ? 'border-cyan-500' : 'border-yellow-500';
  const bgButton = isWinter ? 'bg-cyan-500 hover:bg-cyan-400' : 'bg-yellow-400 hover:bg-yellow-300';

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setActive(true);
      }
    } catch (e) {
      alert("Myndavél virkar ekki.");
    }
  };

  const scan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setScanning(true);
    
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx?.drawImage(videoRef.current, 0, 0);
    
    const base64 = canvasRef.current.toDataURL('image/jpeg').split(',')[1];
    const data = await identifyTrashItem(base64);
    
    setResult(data);
    setScanning(false);
    
    // Stop stream
    const stream = videoRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
    setActive(false);
  };

  return (
    <div className={`w-full bg-slate-900/80 backdrop-blur-md border-2 ${borderColor} rounded-2xl overflow-hidden shadow-2xl animate-fade-in text-white relative`}>
      
      {/* Easter Egg Trigger: Diagnostic Light */}
      <div 
        onClick={onSystemDiagnostics}
        className="absolute top-4 right-4 flex items-center gap-2 cursor-pointer opacity-50 hover:opacity-100 z-20"
      >
          <span className="text-[10px] font-mono text-slate-400 hidden md:inline">SYSTEM DIAG</span>
          <div className={`w-2 h-2 rounded-full ${scanning ? 'bg-red-500 animate-ping' : 'bg-green-500'}`}></div>
      </div>

      <div className="p-8 flex flex-col items-center min-h-[500px] justify-center">
        
        {/* Header Title inside Scanner */}
        {!active && !result && (
            <div className="text-center mb-10">
                <div className={`inline-block p-4 rounded-full border-2 ${borderColor} bg-slate-800 mb-4`}>
                    <Scan size={48} className={isWinter ? 'text-cyan-400' : 'text-yellow-400'} />
                </div>
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-2">
                    AI Flokkunarvél <span className={`text-base align-top ${accentColor}`}>v3.0</span>
                </h2>
                <p className="text-slate-400 text-lg max-w-md mx-auto">
                    Notaðu nýjustu Gemini Vision tækni til að greina úrgang og finna rétta tunnu.
                </p>
            </div>
        )}

        {/* Viewport Area */}
        <div className="w-full max-w-xl relative">
            {!result ? (
                active ? (
                    <div className="relative w-full aspect-[3/4] md:aspect-video bg-black rounded-xl overflow-hidden border-2 border-slate-700 shadow-inner group">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        
                        {/* Scanning UI Overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 ${borderColor}`}></div>
                            <div className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 ${borderColor}`}></div>
                            <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 ${borderColor}`}></div>
                            <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 ${borderColor}`}></div>
                            
                            {!scanning && <div className="absolute inset-0 flex items-center justify-center">
                                <span className="bg-black/50 px-3 py-1 text-xs font-mono text-white rounded">LIVE FEED</span>
                            </div>}
                            
                            {/* Scan Line */}
                            {!scanning && <div className={`absolute left-0 right-0 h-0.5 ${isWinter ? 'bg-cyan-500' : 'bg-yellow-500'} opacity-50 animate-scan-down top-1/2`}></div>}
                        </div>
                    </div>
                ) : (
                    // Idle State - Button handled below
                    <div className="h-0"></div> 
                )
            ) : (
                // Result State
                <div className="w-full bg-slate-800 p-8 rounded-xl border border-slate-600 mb-6 text-center animate-scale-in shadow-2xl">
                    <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 ${result.bin === 'Plast' ? 'bg-orange-500' : result.bin === 'Pappi' ? 'bg-blue-600' : result.bin === 'Matur' ? 'bg-green-600' : 'bg-gray-600'} shadow-lg ring-4 ring-slate-700`}>
                        {result.bin === 'Almennt' ? <AlertTriangle size={48} className="text-white" /> : <CheckCircle size={48} className="text-white" />}
                    </div>
                    <h3 className="text-3xl font-black mb-2 uppercase">{result.item}</h3>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="text-slate-400 font-mono text-sm">FLOKKUR:</span>
                        <span className={`text-2xl font-bold ${accentColor}`}>{result.bin}</span>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                         <p className="text-slate-300 text-sm leading-relaxed"><Cpu size={14} className="inline mr-2 opacity-50"/>{result.reason}</p>
                    </div>
                    
                    <button onClick={() => { setResult(null); startCamera(); }} className="mt-8 text-sm text-slate-400 hover:text-white underline decoration-dotted underline-offset-4">
                        Skanna annan hlut
                    </button>
                </div>
            )}
        </div>

        {/* Controls */}
        <div className="w-full max-w-sm mt-8">
            {!result && (
                !active ? (
                    <button onClick={startCamera} className={`w-full py-5 ${bgButton} text-black rounded-xl font-black uppercase tracking-widest transition-all hover:scale-105 shadow-lg flex items-center justify-center gap-3`}>
                        <Camera size={24} /> Virkja Myndavél
                    </button>
                ) : (
                    <button onClick={scan} disabled={scanning} className={`w-full py-5 ${scanning ? 'bg-slate-700 text-slate-400' : bgButton + ' text-black'} rounded-xl font-black uppercase tracking-widest transition-all shadow-lg`}>
                        {scanning ? "Greini Gögn..." : "Greina Núna"}
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