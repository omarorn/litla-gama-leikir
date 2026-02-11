
import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Trophy, Zap, Download } from 'lucide-react';
import { generateRetroAvatar } from '../services/geminiService';
import { audio } from '../services/audioService';

interface HighScoreCameraProps {
  onComplete: () => void;
  score: number;
}

type Phase = 'INITIALS' | 'CAMERA_PREVIEW' | 'COUNTDOWN' | 'PROCESSING' | 'RESULT';

const HighScoreCamera: React.FC<HighScoreCameraProps> = ({ onComplete, score }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [phase, setPhase] = useState<Phase>('INITIALS');
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const [initials, setInitials] = useState(['A', 'A', 'A']);
  const [activeCharIndex, setActiveCharIndex] = useState(0);
  
  const [countdown, setCountdown] = useState(3);
  const [photo, setPhoto] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  // --- PHASE 1: INITIALS INPUT ---
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (phase !== 'INITIALS') return;

          if (e.key === 'ArrowUp') {
              setInitials(prev => {
                  const newArr = [...prev];
                  const charCode = newArr[activeCharIndex].charCodeAt(0);
                  newArr[activeCharIndex] = charCode === 90 ? 'A' : String.fromCharCode(charCode + 1);
                  return newArr;
              });
              audio.playClick();
          } else if (e.key === 'ArrowDown') {
               setInitials(prev => {
                  const newArr = [...prev];
                  const charCode = newArr[activeCharIndex].charCodeAt(0);
                  newArr[activeCharIndex] = charCode === 65 ? 'Z' : String.fromCharCode(charCode - 1);
                  return newArr;
              });
              audio.playClick();
          } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
              if (activeCharIndex < 2) {
                  setActiveCharIndex(i => i + 1);
                  audio.playClick();
              } else {
                  // Finish Initials
                  setPhase('CAMERA_PREVIEW');
                  startCamera();
                  audio.playSuccess();
              }
          } else if (e.key === 'ArrowLeft') {
              if (activeCharIndex > 0) {
                  setActiveCharIndex(i => i - 1);
                  audio.playClick();
              }
          } else if (/^[a-zA-Z]$/.test(e.key)) {
              // Direct typing
              setInitials(prev => {
                  const newArr = [...prev];
                  newArr[activeCharIndex] = e.key.toUpperCase();
                  return newArr;
              });
              if (activeCharIndex < 2) setActiveCharIndex(i => i + 1);
              audio.playClick();
          }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, activeCharIndex]);

  // --- CAMERA LOGIC ---
  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(s);
    } catch (err) {
      console.error("Camera error:", err);
      // Skip to end if camera fails
      setAvatar("https://placehold.co/400x400/000000/FFFFFF?text=NO+CAM");
      setPhase('RESULT');
    }
  };

  useEffect(() => {
    if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
    }
  }, [stream, phase]);

  useEffect(() => {
      return () => stream?.getTracks().forEach(track => track.stop());
  }, [stream]);

  const startCountdown = () => {
      setPhase('COUNTDOWN');
      setCountdown(3);
  };

  // --- COUNTDOWN TIMER ---
  useEffect(() => {
      if (phase === 'COUNTDOWN') {
          if (countdown > 0) {
              audio.playTone(600, 'square', 0.1, 0.1);
              const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
              return () => clearTimeout(timer);
          } else {
              // SNAP
              captureAndProcess();
          }
      }
  }, [phase, countdown]);

  const captureAndProcess = () => {
      if (videoRef.current && canvasRef.current) {
          audio.playTone(800, 'sawtooth', 0.2, 0.2); // Snap sound
          const ctx = canvasRef.current.getContext('2d');
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          ctx?.drawImage(videoRef.current, 0, 0);
          
          const dataUrl = canvasRef.current.toDataURL('image/jpeg');
          setPhoto(dataUrl);
          
          // Stop stream
          stream?.getTracks().forEach(track => track.stop());
          setStream(null);
          
          setPhase('PROCESSING');
          generateAvatar(dataUrl.split(',')[1]);
      }
  };

  const generateAvatar = async (base64: string) => {
      const result = await generateRetroAvatar(base64);
      if (result) {
          setAvatar(`data:image/jpeg;base64,${result}`);
      } else {
          setAvatar(photo); // Fallback
      }
      setPhase('RESULT');
      audio.playWin();
  };

  // --- RENDER ---

  if (phase === 'INITIALS') {
      return (
          <div className="bg-black border-4 border-yellow-500 p-8 rounded-xl w-full max-w-md text-center shadow-[0_0_50px_rgba(234,179,8,0.5)]">
              <h2 className="text-yellow-400 font-black text-3xl mb-8 tracking-widest uppercase animate-pulse">New High Score!</h2>
              <div className="text-4xl font-mono text-cyan-400 mb-8">{score.toString().padStart(6, '0')}</div>
              
              <div className="flex justify-center gap-4 mb-12">
                  {initials.map((char, idx) => (
                      <div 
                        key={idx}
                        onClick={() => setActiveCharIndex(idx)}
                        className={`w-16 h-20 border-4 flex items-center justify-center text-4xl font-black font-mono cursor-pointer transition-all
                        ${idx === activeCharIndex ? 'border-yellow-400 bg-yellow-900/30 text-white animate-bounce' : 'border-slate-700 text-slate-500'}
                        `}
                      >
                          {char}
                      </div>
                  ))}
              </div>
              
              <div className="text-slate-500 text-xs uppercase font-bold tracking-widest mb-4">
                  Use Arrow Keys or Click
              </div>
              
              <button 
                onClick={() => { setPhase('CAMERA_PREVIEW'); startCamera(); }}
                className="w-full bg-yellow-500 text-black font-black uppercase py-4 rounded hover:bg-yellow-400 active:scale-95 transition-transform"
              >
                  Enter Initials
              </button>
          </div>
      );
  }

  if (phase === 'CAMERA_PREVIEW' || phase === 'COUNTDOWN') {
      return (
          <div className="bg-black border-4 border-yellow-500 p-2 rounded-xl w-full max-w-md relative overflow-hidden">
              <div className="relative aspect-[4/5] bg-slate-900 w-full overflow-hidden rounded-lg">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                  
                  {/* Overlay UI */}
                  <div className="absolute inset-0 border-4 border-yellow-500/30 m-4 rounded pointer-events-none"></div>
                  
                  {phase === 'COUNTDOWN' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                          <span className="text-9xl font-black text-yellow-400 animate-ping">{countdown === 0 ? 'SNAP' : countdown}</span>
                      </div>
                  )}
              </div>
              
              {phase === 'CAMERA_PREVIEW' && (
                  <div className="p-4">
                      <p className="text-white text-center text-sm mb-4 font-bold uppercase">Get ready for your Hero Shot!</p>
                      <button 
                        onClick={startCountdown}
                        className="w-full bg-red-600 text-white font-black uppercase py-4 rounded hover:bg-red-500 shadow-[0_4px_0_rgb(153,27,27)] active:shadow-none active:translate-y-1 transition-all"
                      >
                          Take Photo
                      </button>
                  </div>
              )}
              {/* Hidden Canvas for Capture */}
              <canvas ref={canvasRef} className="hidden" />
          </div>
      );
  }

  if (phase === 'PROCESSING') {
      return (
          <div className="bg-black border-4 border-yellow-500 p-12 rounded-xl text-center">
               <RefreshCw size={64} className="text-yellow-400 animate-spin mx-auto mb-6" />
               <h2 className="text-2xl font-black text-white uppercase tracking-widest animate-pulse">Generating Hero...</h2>
               <p className="text-slate-500 font-mono mt-2 text-xs">Gemini 3 Pro Pixelating...</p>
          </div>
      );
  }

  if (phase === 'RESULT') {
      return (
          <div className="bg-slate-900 border-4 border-yellow-500 p-6 rounded-xl w-full max-w-md shadow-2xl animate-scale-in">
              <div className="flex justify-between items-end mb-4 border-b-2 border-slate-700 pb-2">
                  <div className="text-4xl font-black text-yellow-400 font-mono tracking-widest">{initials.join('')}</div>
                  <div className="text-2xl font-bold text-white font-mono">{score}</div>
              </div>
              
              <div className="relative aspect-square bg-black rounded-lg overflow-hidden border-4 border-white mb-6 group">
                  <img src={avatar || ''} className="w-full h-full object-cover rendering-pixelated" style={{ imageRendering: 'pixelated' }} />
                  
                  {/* Retro Scanline Effect */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_4px,3px_100%] pointer-events-none"></div>
                  
                  <div className="absolute bottom-2 right-2 bg-yellow-400 text-black text-[10px] font-bold px-2 py-1 uppercase transform rotate-[-2deg]">
                      Gemini Hero
                  </div>
              </div>
              
              <div className="flex gap-2">
                  <button onClick={onComplete} className="flex-1 bg-green-600 text-white font-black uppercase py-3 rounded hover:bg-green-500 transition-colors">
                      Continue
                  </button>
                  <a href={avatar || '#'} download={`lg-hero-${initials.join('')}.jpg`} className="bg-slate-700 text-white p-3 rounded hover:bg-slate-600">
                      <Download size={24} />
                  </a>
              </div>
          </div>
      );
  }

  return null;
};

export default HighScoreCamera;
