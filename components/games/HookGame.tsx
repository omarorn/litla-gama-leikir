import React, { useState, useEffect, useCallback } from 'react';
import { Truck } from 'lucide-react';

interface HookGameProps {
  onScore: React.Dispatch<React.SetStateAction<number>>;
  onGameOver: () => void;
}

const HookGame: React.FC<HookGameProps> = ({ onScore, onGameOver }) => {
  const [truckX, setTruckX] = useState(10);
  const [containerX, setContainerX] = useState(80);
  const [hookExtending, setHookExtending] = useState(false);
  const [hookLength, setHookLength] = useState(0);
  const [hasContainer, setHasContainer] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);

  const moveTruck = useCallback((dir: number) => {
    if (hookExtending || hasContainer) return; // Can't move while operating
    setTruckX(prev => Math.max(0, Math.min(90, prev + dir)));
  }, [hookExtending, hasContainer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') moveTruck(-5);
      if (e.key === 'ArrowRight') moveTruck(5);
      if (e.key === ' ' || e.key === 'Enter') {
        if (!hookExtending && !hasContainer) setHookExtending(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveTruck, hookExtending, hasContainer]);

  useEffect(() => {
    // Hook Animation Logic
    let animId: number;
    if (hookExtending) {
      const animateHook = () => {
        setHookLength(prev => {
          if (prev >= 30) { // Max reach
            setHookExtending(false);
            // Check collision
            const hookTipX = truckX + 10; // Approx offset
            if (Math.abs(hookTipX - containerX) < 10) {
              setHasContainer(true);
              onScore(s => s + 100);
              // Reset for next round after delay
              setTimeout(() => {
                setHasContainer(false);
                setHookLength(0);
                setContainerX(Math.random() * 80 + 10);
                setTruckX(10);
              }, 1000);
              return 30;
            }
            return 0; // Missed, retract
          }
          return prev + 1;
        });
        if (hookLength < 30) animId = requestAnimationFrame(animateHook);
      };
      animId = requestAnimationFrame(animateHook);
    } else if (!hasContainer && hookLength > 0) {
        // Retract if missed
        setHookLength(prev => Math.max(0, prev - 2));
    }
    return () => cancelAnimationFrame(animId);
  }, [hookExtending, truckX, containerX, hasContainer, hookLength, onScore]);

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

  return (
    <div className="relative w-full h-[400px] bg-sky-200 rounded-xl overflow-hidden border-4 border-slate-300 shadow-inner">
        <div className="absolute top-4 left-4 font-bold text-2xl text-slate-700">Tími: {timeLeft}s</div>

        {/* Ground */}
        <div className="absolute bottom-0 w-full h-12 bg-slate-700"></div>

        {/* Container */}
        {!hasContainer && (
            <div 
                className="absolute bottom-12 w-16 h-12 bg-green-600 border-2 border-green-800 rounded-sm flex items-center justify-center shadow-lg"
                style={{ left: `${containerX}%`, transition: 'left 0.5s' }}
            >
                <div className="w-full h-1 bg-white opacity-20 rotate-45"></div>
                {/* Hook Loop */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 border-2 border-gray-400 rounded-full"></div>
            </div>
        )}

        {/* Truck */}
        <div 
            className="absolute bottom-12 transition-all duration-200 ease-linear"
            style={{ left: `${truckX}%` }}
        >
             {/* The Arm */}
             <div 
                className="absolute bottom-8 left-8 w-2 bg-black origin-bottom transition-none"
                style={{ 
                    height: `${hookLength * 2}px`, 
                    transform: `rotate(${hookExtending ? 45 : 0}deg) height` 
                }}
             >
                 {/* Hook End */}
                 <div className="absolute -top-2 -left-1 w-4 h-4 border-r-2 border-b-2 border-black rotate-45"></div>
             </div>

             <Truck className="w-24 h-16 text-yellow-500 transform scale-x-[-1]" />
             
             {hasContainer && (
                 <div className="absolute -top-10 left-4 w-16 h-12 bg-green-600 border-2 border-green-800 rounded-sm scale-75"></div>
             )}
        </div>

        {/* Controls Overlay for Mobile */}
        <div className="absolute bottom-2 left-0 w-full flex justify-center gap-4">
             <button onClick={() => moveTruck(-10)} className="bg-white/50 p-2 rounded-full font-bold w-16 h-16 flex items-center justify-center text-xl">←</button>
             <button onClick={() => !hookExtending && !hasContainer && setHookExtending(true)} className="bg-yellow-400 px-6 py-2 rounded-full font-bold shadow-lg border-2 border-black">KRÓKUR</button>
             <button onClick={() => moveTruck(10)} className="bg-white/50 p-2 rounded-full font-bold w-16 h-16 flex items-center justify-center text-xl">→</button>
        </div>
    </div>
  );
};

export default HookGame;