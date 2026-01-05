import React, { useState, useEffect, useCallback } from 'react';
import { Truck, Wind, ArrowRight } from 'lucide-react';
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
  const [containerType, setContainerType] = useState<'normal' | 'heavy' | 'priority'>('normal');
  
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

  const resetRound = useCallback(() => {
      setHasContainer(false);
      setHookLength(0);
      setHookDrift(0);
      setContainerX(Math.random() * 70 + 20); // Keep somewhat central
      setTruckX(10);
      
      // Randomize type
      const rand = Math.random();
      if (rand > 0.8) setContainerType('priority');
      else if (rand > 0.6) setContainerType('heavy');
      else setContainerType('normal');

  }, []);

  const moveTruck = useCallback((dir: number) => {
    if (hookExtending || hasContainer) return; 
    setTruckX(prev => Math.max(0, Math.min(90, prev + dir)));
  }, [hookExtending, hasContainer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') moveTruck(-4);
      if (e.key === 'ArrowRight') moveTruck(4);
      if (e.key === ' ' || e.key === 'Enter') {
        if (!hookExtending && !hasContainer) {
            setHookExtending(true);
            audio.playClick();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveTruck, hookExtending, hasContainer]);

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

        {/* Ground */}
        <div className="absolute bottom-0 w-full h-12 bg-slate-700 border-t-4 border-slate-600"></div>

        {/* Container */}
        {!hasContainer && (
            <div 
                className={`absolute bottom-12 w-16 h-12 ${getContainerColor()} border-2 rounded-sm flex items-center justify-center shadow-lg`}
                style={{ left: `${containerX}%`, transition: 'left 0.5s' }}
            >
                <div className="w-full h-1 bg-white opacity-20 rotate-45"></div>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 border-2 border-gray-400 rounded-full"></div>
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
                 <div className={`absolute -top-10 left-4 w-16 h-12 ${getContainerColor()} border-2 rounded-sm scale-75 shadow-md`}></div>
             )}
        </div>

        {/* Mobile Controls */}
        <div className="absolute bottom-2 left-0 w-full flex justify-center gap-4">
             <button onClick={() => moveTruck(-10)} className="bg-white/80 p-4 rounded-full font-bold shadow-lg active:bg-slate-200">←</button>
             <button onClick={() => !hookExtending && !hasContainer && setHookExtending(true)} className="bg-yellow-400 px-8 py-4 rounded-full font-black shadow-lg border-2 border-black active:scale-95 transition-transform">KRÓKUR</button>
             <button onClick={() => moveTruck(10)} className="bg-white/80 p-4 rounded-full font-bold shadow-lg active:bg-slate-200">→</button>
        </div>
    </div>
  );
};

export default HookGame;