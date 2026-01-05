import React, { useRef, useState } from 'react';
import { Camera, Wand2, RefreshCw } from 'lucide-react';
import { editWorkerImage } from '../services/geminiService';

const GearStation: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [editedPhoto, setEditedPhoto] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamActive, setStreamActive] = useState(false);

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx?.drawImage(videoRef.current, 0, 0);
      setPhoto(canvasRef.current.toDataURL('image/jpeg'));
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
      setStreamActive(false);
    }
  };

  const handleEdit = async () => {
      if (!photo || !prompt) return;
      setLoading(true);
      const result = await editWorkerImage(photo.split(',')[1], prompt);
      if (result) setEditedPhoto(`data:image/jpeg;base64,${result}`);
      setLoading(false);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900 border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl text-white">
        <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between">
            <h2 className="text-xl font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-2">
                <Wand2 size={20} /> Græjustöðin
            </h2>
            <button onClick={onBack} className="text-slate-400">Loka</button>
        </div>

        <div className="p-6">
            {!photo ? (
                <div className="relative bg-black h-64 rounded-lg flex items-center justify-center mb-4 border border-slate-600">
                    {streamActive ? (
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                    ) : (
                        <button onClick={startCamera} className="flex flex-col items-center text-slate-500">
                            <Camera size={48} />
                            <span className="mt-2">Opna Myndavél</span>
                        </button>
                    )}
                    {streamActive && (
                        <button onClick={takePhoto} className="absolute bottom-4 bg-white text-black p-3 rounded-full shadow-lg">
                            <Camera size={24} />
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="relative h-64 bg-black rounded-lg overflow-hidden border-2 border-yellow-500">
                        {loading && (
                            <div className="absolute inset-0 bg-black/80 z-10 flex flex-col items-center justify-center">
                                <RefreshCw className="animate-spin text-yellow-400 mb-2" size={40} />
                                <span className="animate-pulse font-mono text-yellow-400">AI er að teikna...</span>
                            </div>
                        )}
                        <img src={editedPhoto || photo} className="w-full h-full object-cover" alt="Worker" />
                    </div>

                    {!editedPhoto && (
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={prompt} 
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="T.d. 'Gera mig að vélmenni' eða 'Setja snjó'"
                                className="flex-1 bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white focus:outline-none focus:border-yellow-400"
                            />
                            <button onClick={handleEdit} disabled={!prompt || loading} className="bg-yellow-400 text-black font-bold px-4 rounded hover:bg-yellow-300">
                                Breyta
                            </button>
                        </div>
                    )}
                    
                    {editedPhoto && (
                        <button onClick={() => { setPhoto(null); setEditedPhoto(null); setPrompt(""); }} className="w-full py-3 bg-slate-700 rounded font-bold">
                            Byrja Uppá Nýtt
                        </button>
                    )}
                </div>
            )}
            
            <p className="text-xs text-slate-500 mt-4 text-center">
                Knúið af Gemini 2.5 Flash Image Editing.
            </p>
        </div>
        <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default GearStation;