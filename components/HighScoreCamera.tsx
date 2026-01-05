import React, { useRef, useState } from 'react';
import { Camera, RefreshCw, Banana } from 'lucide-react';
import { generateBananaReward } from '../services/geminiService';

interface HighScoreCameraProps {
  onComplete: () => void;
}

const HighScoreCamera: React.FC<HighScoreCameraProps> = ({ onComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [bananaPhoto, setBananaPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Gat ekki opnað myndavél. Vinsamlegast leyfðu aðgang.");
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setPhoto(dataUrl);
        
        // Stop stream
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
        setStreamActive(false);

        // Process Banana
        processBanana(dataUrl.split(',')[1]);
      }
    }
  };

  const processBanana = async (base64: string) => {
      setLoading(true);
      const result = await generateBananaReward(base64);
      if (result) {
          setBananaPhoto(`data:image/jpeg;base64,${result}`);
      }
      setLoading(false);
  };

  return (
    <div className="bg-white p-4 rounded-xl border-4 border-black text-center w-full max-w-md">
       <h3 className="text-2xl font-black text-yellow-500 uppercase mb-4 drop-shadow-md">Nýtt Met! 🏆</h3>
       
       {!photo ? (
         <div className="flex flex-col items-center">
             <div className="relative w-full h-64 bg-slate-200 rounded-lg overflow-hidden border-2 border-slate-400 mb-4 flex items-center justify-center">
                {streamActive ? (
                    <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" />
                ) : (
                    <button onClick={startCamera} className="flex flex-col items-center text-slate-500 hover:text-slate-700">
                        <Camera size={48} />
                        <span className="font-bold mt-2">Opna Myndavél</span>
                    </button>
                )}
             </div>
             {streamActive && (
                 <button onClick={takePhoto} className="bg-yellow-400 text-black font-bold py-3 px-8 rounded-full border-4 border-black hover:scale-105 transition-transform flex items-center gap-2">
                     <Camera size={20} /> Taka Mynd
                 </button>
             )}
         </div>
       ) : (
         <div className="flex flex-col items-center animate-fade-in">
             <div className="w-full aspect-square bg-yellow-100 rounded-lg border-4 border-yellow-400 p-2 mb-4 relative">
                 {loading ? (
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-yellow-600">
                         <RefreshCw className="animate-spin mb-2" size={40} />
                         <span className="font-bold animate-pulse">Bý til banana...</span>
                     </div>
                 ) : (
                     <img src={bananaPhoto || photo} alt="Banana Result" className="w-full h-full object-cover rounded shadow-lg" />
                 )}
             </div>
             {!loading && (
                 <>
                    <p className="text-lg font-bold text-slate-700 mb-4">Glæsilegur Banani!</p>
                    <button onClick={onComplete} className="bg-green-500 text-white font-bold py-3 px-8 rounded-full border-4 border-green-700 hover:scale-105 transition-transform">
                        Áfram
                    </button>
                 </>
             )}
         </div>
       )}
       
       <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default HighScoreCamera;