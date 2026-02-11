
import React, { useState, useEffect, useCallback } from 'react';
import { Truck, Wind, ArrowRight, ArrowLeft, XCircle, Star } from 'lucide-react';
import { audio } from '../../services/audioService';

interface HookGameProps {
  onScore: React.Dispatch<React.SetStateAction<number>>;
  onGameOver: () => void;
}

const HookGame: React.FC<HookGameProps> = ({ onScore, onGameOver }) => {
  // Game State
  const [level, setLevel] = useState(1);
  const [containersCollected, setContainersCollected] = useState(0);
  const [quota, setQuota] = useState(3);
  
  // Physics State
  const [truckX, setTruckX] = useState(10);
  const [containerX, setContainerX] = useState(80);
  const [containerDir, setContainerDir] = useState(1);
  const [containerType, setContainerType] = useState<'normal' | 'heavy' | 'priority' | 'lg'>('normal');
  
  const [hookExtending, setHookExtending] = useState(false);
  const [hookLength, setHookLength] = useState(0);
  const [hookDrift, setHookDrift] = useState(0); // Wind effect
  
  const [hasContainer, setHasContainer] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);
  const [wind, setWind] = useState(0); // -5 to 5
  
  // Level Setup
  useEffect(() => {
      // Wind increases with level
      const windForce = level > 1 ? (Math.random() * (level * 2)) - level : 0; 
      setWind(windForce);
      setQuota(level * 3);
      setContainersCollected(0);
      setTimeLeft(45 + (level * 10)); // Bonus time for harder levels
  }, [level]);

  // Moving container logic for levels 3+
  useEffect(() => {
      let animId: number;
      if (level >= 3 && !hasContainer) {
          const animateContainer = () => {
              setContainerX(prev => {
                  let next = prev + (0.1 * (level - 2) * containerDir);
                  if (next > 90 || next < 50) {
                      setContainerDir(d => d * -1);
                      return prev;
                  }
                  return next;
              });
              animId = requestAnimationFrame(animateContainer);
          };
          animId = requestAnimationFrame(animateContainer);
      }
      return () => cancelAnimationFrame(animId);
  }, [level, containerDir, hasContainer]);

  const resetRound = useCallback(() => {
      setHasContainer(false);
      setHookLength(0);
      setHookDrift(0);
      setContainerX(Math.random() * 40 + 50); // Random position right side
      setTruckX(10);
      
      // Randomize type
      const rand = Math.random();
      if (rand > 0.95) setContainerType('lg'); // 5% chance for LG Powerup
      else if (rand > 0.8) setContainerType('priority');
      else if (rand > 0.6) setContainerType('heavy');
      else setContainerType('normal');

  }, []);

  const moveTruck = useCallback((dir: number) => {
    if (hookExtending || hasContainer) return; 
    setTruckX(prev => Math.max(0, Math.min(90, prev + dir)));
  }, [hookExtending, hasContainer]);

  const releaseHook = useCallback(() => {
    if (hookExtending) {
        setHookExtending(false);
        audio.playClick();
    }
  }, [hookExtending]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') moveTruck(-4);
      if (e.key === 'ArrowRight') moveTruck(4);
      if (e.key === ' ' || e.key === 'Enter') {
        if (hookExtending) {
            releaseHook();
        } else if (!hasContainer) {
            setHookExtending(true);
            audio.playClick();
        }
      }
      if (e.key === 'Escape' || e.key === 'r' || e.key === 'R') {
          releaseHook();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveTruck, hookExtending, hasContainer, releaseHook]);

  // Hook Logic Loop
  useEffect(() => {
    let animId: number;
    if (hookExtending) {
      const animateHook = () => {
        setHookLength(prev => {
          // Apply wind drift while extending
          if (wind !== 0) {
              setHookDrift(d => d + (wind * 0.1));
          }

          if (prev >= 35) { // Max reach
            setHookExtending(false);
            
            // Collision Detection
            const hookTipX = truckX + 15 + hookDrift; 
            // 15 is arm offset, hookDrift is wind
            
            if (Math.abs(hookTipX - containerX) < 8) {
              // HIT!
              setHasContainer(true);
              audio.playSuccess();
              
              let points = 100;
              if (containerType === 'heavy') points = 150;
              if (containerType === 'priority') points = 300;
              if (containerType === 'lg') points = 500;
              
              onScore(s => s + points);
              setContainersCollected(c => {
                  const newVal = c + 1;
                  if (newVal >= quota) {
                      // Level Up Logic handled in effect
                  }
                  return newVal;
              });

              setTimeout(resetRound, 1000);
              return 35;
            } else {
                audio.playError();
            }
            return 0; // Missed, snap back
          }
          return prev + 1.5; // Extension speed
        });
        if (hookLength < 35) animId = requestAnimationFrame(animateHook);
      };
      animId = requestAnimationFrame(animateHook);
    } else if (!hasContainer && hookLength > 0) {
        // Retract
        setHookLength(prev => Math.max(0, prev - 3));
        setHookDrift(prev => prev * 0.8); // Reduce drift as it retracts
    }
    return () => cancelAnimationFrame(animId);
  }, [hookExtending, truckX, containerX, hasContainer, hookLength, wind, hookDrift, onScore, containerType, quota, resetRound]);

  // Level Progression Check
  useEffect(() => {
      if (containersCollected >= quota) {
          audio.playWin();
          setLevel(l => l + 1);
      }
  }, [containersCollected, quota]);

  // Timer
  useEffect(() => {
     const timer = setInterval(() => {
         setTimeLeft(t => {
             if (t <= 1) {
                 clearInterval(timer);
                 onGameOver();
                 return 0;
             }
             return t - 1;
         });
     }, 1000);
     return () => clearInterval(timer);
  }, [onGameOver]);

  const getContainerColor = () => {
      switch(containerType) {
          case 'heavy': return 'bg-slate-700 border-slate-900';
          case 'priority': return 'bg-red-600 border-red-800 animate-pulse';
          case 'lg': return 'bg-yellow-400 border-yellow-600 animate-pulse shadow-[0_0_15px_rgba(234,179,8,0.8)]';
          default: return 'bg-green-600 border-green-800';
      }
  };

  return (
    <div className="relative w-full h-[400px] bg-sky-200 rounded-xl overflow-hidden border-4 border-slate-300 shadow-inner">
        {/* HUD */}
        <div className="absolute top-4 left-4 right-4 flex justify-between font-bold text-slate-700 z-10">
            <div className="bg-white/50 px-3 py-1 rounded">Tími: {timeLeft}s</div>
            <div className="bg-white/50 px-3 py-1 rounded flex items-center gap-2">
                <Truck size={16} /> {containersCollected} / {quota} <span className="text-xs text-slate-500">(Lvl {level})</span>
            </div>
            {wind !== 0 && (
                 <div className="bg-white/50 px-3 py-1 rounded flex items-center gap-1 text-blue-600">
                     <Wind size={16} /> 
                     <ArrowRight size={14} style={{ transform: `rotate(${wind > 0 ? 0 : 180}deg)` }} />
                     <span className="text-xs">{Math.abs(Math.round(wind))}</span>
                 </div>
            )}
        </div>

        {/* Clouds */}
        <div className="absolute top-10 left-10 text-white/40 animate-pulse"><Wind size={64} /></div>
        <div className="absolute top-20 right-20 text-white/30"><Wind size={48} /></div>

        {/* Release Button (Strategic) */}
        <button 
            onClick={releaseHook}
            disabled={!hookExtending}
            className={`absolute top-16 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider border-2 shadow-md transition-all
            ${hookExtending 
                ? 'bg-red-500 text-white border-red-700 hover:bg-red-600 cursor-pointer animate-pulse' 
                : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'}`}
        >
            <XCircle size={14} /> Losa Krók (R)
        </button>

        {/* Ground */}
        <div className="absolute bottom-0 w-full h-12 bg-slate-700 border-t-4 border-slate-600"></div>

        {/* Container */}
        {!hasContainer && (
            <div 
                className={`absolute bottom-12 w-16 h-12 ${getContainerColor()} border-2 rounded-sm flex items-center justify-center shadow-lg transition-transform`}
                style={{ left: `${containerX}%` }}
            >
                <div className="w-full h-1 bg-white opacity-20 rotate-45"></div>
                {containerType === 'lg' ? (
                     <span className="text-black font-black text-lg">LG</span>
                ) : (
                     <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 border-2 border-gray-400 rounded-full"></div>
                )}
            </div>
        )}

        {/* Truck */}
        <div 
            className="absolute bottom-12 transition-all duration-200 ease-linear z-20"
            style={{ left: `${truckX}%` }}
        >
             {/* The Arm Base */}
             <div className="absolute bottom-8 left-8 w-2 h-8 bg-black"></div>

             {/* The Extending Arm */}
             <div 
                className="absolute bottom-16 left-8 w-1 bg-slate-800 origin-bottom transition-none"
                style={{ 
                    height: `${hookLength * 3}px`, 
                    // This rotation simulates the arm bending towards the wind/drift
                    transform: `rotate(${hookExtending ? 45 + (hookDrift * 2) : 0}deg)` 
                }}
             >
                 {/* Hook End */}
                 <div className="absolute -top-2 -left-2 w-5 h-5 border-r-4 border-b-4 border-black rounded-br-lg rotate-45"></div>
             </div>

             <Truck className="w-24 h-16 text-yellow-500 transform scale-x-[-1] filter drop-shadow-lg" />
             
             {hasContainer && (
                 <div className={`absolute -top-10 left-4 w-16 h-12 ${getContainerColor()} border-2 rounded-sm scale-75 shadow-md flex items-center justify-center`}>
                     {containerType === 'lg' && <span className="text-black font-black text-lg">LG</span>}
                 </div>
             )}
        </div>

        {/* Instructions */}
        <div className="absolute bottom-2 left-0 w-full flex justify-center gap-4 items-end pb-2 pointer-events-none z-30">
            <div className="bg-white/80 backdrop-blur rounded-xl px-4 py-2 flex items-center gap-4 text-slate-800 shadow-lg border border-slate-200">
                <div className="flex items-center gap-2">
                    <span className="bg-slate-200 border border-slate-400 rounded px-1.5 py-0.5"><ArrowLeft size={16}/></span>
                    <span className="bg-slate-200 border border-slate-400 rounded px-1.5 py-0.5"><ArrowRight size={16}/></span>
                    <span className="text-xs font-bold uppercase">Keyra</span>
                </div>
                <div className="w-px h-6 bg-slate-300"></div>
                <div className="flex items-center gap-2">
                    <span className="bg-slate-200 border border-slate-400 rounded px-3 py-0.5 text-xs font-black min-w-[50px] text-center">SPACE</span>
                    <span className="text-xs font-bold uppercase">Krókur</span>
                </div>
            </div>
        </div>

        {/* Mobile Controls Overlay (Interactive) */}
        <div className="absolute bottom-0 left-0 w-full h-24 z-40 md:hidden flex justify-between items-center px-4">
             <button onTouchStart={() => moveTruck(-4)} onClick={() => moveTruck(-4)} className="bg-white/50 w-16 h-16 rounded-full flex items-center justify-center text-3xl opacity-0">L</button>
             <button onClick={() => !hookExtending && !hasContainer ? setHookExtending(true) : releaseHook()} className="bg-white/50 w-24 h-24 rounded-full opacity-0">ACT</button>
             <button onTouchStart={() => moveTruck(4)} onClick={() => moveTruck(4)} className="bg-white/50 w-16 h-16 rounded-full flex items-center justify-center text-3xl opacity-0">R</button>
        </div>

        {/* Mobile Controls Visuals */}
        <div className="absolute bottom-2 left-0 w-full flex justify-center gap-4 items-end pb-2 md:hidden pointer-events-auto">
             <button onClick={() => moveTruck(-10)} className="bg-white/80 p-4 rounded-full font-bold shadow-lg active:bg-slate-200"><ArrowLeft /></button>
             
             <div className="relative">
                 <button onClick={() => !hookExtending && !hasContainer && setHookExtending(true)} className="bg-yellow-400 px-8 py-4 rounded-full font-black shadow-lg border-2 border-black active:scale-95 transition-transform">KRÓKUR</button>
                 {hookExtending && (
                    <button 
                        onClick={releaseHook}
                        className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full font-bold text-xs shadow-lg border-2 border-white animate-bounce"
                    >
                        LOSA
                    </button>
                 )}
             </div>

             <button onClick={() => moveTruck(10)} className="bg-white/80 p-4 rounded-full font-bold shadow-lg active:bg-slate-200"><ArrowRight /></button>
        </div>
    </div>
  );
};

export default HookGame;
