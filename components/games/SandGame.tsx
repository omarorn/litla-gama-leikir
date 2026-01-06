
import React, { useState, useEffect, useRef } from 'react';
import { Wind, Trophy, CornerDownLeft, ArrowRight, ArrowLeft, ArrowUp, ArrowDown } from 'lucide-react';
import { audio } from '../../services/audioService';

interface SandGameProps {
  onScore: React.Dispatch<React.SetStateAction<number>>;
  onGameOver: () => void;
}

const LEVELS = [
    { id: 1, name: "Nýliði", wind: 0, moving: false, quota: 200, speed: 0 },
    { id: 2, name: "Vanur", wind: 0, moving: true, quota: 400, speed: 0.2 },
    { id: 3, name: "Fagmaður", wind: 1, moving: true, quota: 600, speed: 0.5 },
    { id: 4, name: "Meistari", wind: 3, moving: true, quota: 1000, speed: 0.8 }
];

const SandGame: React.FC<SandGameProps> = ({ onScore, onGameOver }) => {
  const [levelIdx, setLevelIdx] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);
  
  const [rotation, setRotation] = useState(0); // 0 = Left (Sand), 180 = Right (Bin)
  const [hasSand, setHasSand] = useState(false);
  const [armHeight, setArmHeight] = useState(50); // 0 = up, 100 = down
  const [timeLeft, setTimeLeft] = useState(60);
  
  const [containerPos, setContainerPos] = useState(10); // Right side offset
  const [containerDir, setContainerDir] = useState(1);
  
  const [particles, setParticles] = useState<{id: number, x: number, y: number, color: string}[]>([]);
  
  const level = LEVELS[levelIdx];
  const keysPressed = useRef<Record<string, boolean>>({});
  const requestRef = useRef<number>(0);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.key] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key] = false; };
    
    // Space action
    const handleAction = (e: KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'Enter') {
             if (rotation < 30 && armHeight > 70 && !hasSand) {
                  // DIG
                  setHasSand(true);
                  audio.playClick();
                  spawnParticles(20, 100, 'bg-yellow-700'); // Dirt
             } else if (rotation > 150 && armHeight > 20 && hasSand) {
                  // DUMP CHECK
                  // Calculate tip position
                  // Simple check: is rotation near 180?
                  // And is container near the drop zone?
                  
                  // Container is at `right: containerPos`. 
                  // Visual right side is ~80-90% of screen width.
                  // Let's approximate: 
                  // 180deg is fully right.
                  
                  // We need to match rotation to container position? 
                  // Actually, container moves left/right in the "Bin Zone".
                  // Let's just say if rotated fully right (>160) and dump, we check if container is currently reachable?
                  // For simplicity: If rotation > 160, we are "over the zone". 
                  // The container moves physically.
                  // Let's simplify: If moving, the user must time it so the bucket is "over" the container.
                  // But the view is 2D side/perspective. 
                  // Let's assume the container is always "at the destination" but moves slightly for visual difficulty?
                  // Or actually implement collision:
                  
                  // In this 2.5D view, rotation maps to X. 
                  // Container is at X = ScreenWidth - ContainerPos - Width.
                  // Let's keep it simple: If rotation > 160, you hit the "Drop Zone".
                  
                  setHasSand(false); // Dump
                  spawnParticles(15, 60, 'bg-yellow-500'); // Sand
                  
                  // Score calculation
                  onScore(s => {
                      const newScore = s + 50 + (level.id * 10);
                      setCurrentScore(cs => cs + 50 + (level.id * 10));
                      return newScore;
                  });
                  audio.playSuccess();
             } else if (hasSand) {
                 // Wasted sand
                 setHasSand(false);
                 spawnParticles(10, 60, 'bg-yellow-500');
                 audio.playError();
             }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('keydown', handleAction);
    
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('keydown', handleAction);
    };
  }, [rotation, armHeight, hasSand, level, onScore]);

  // Game Loop
  useEffect(() => {
      const animate = () => {
          // Movement
          if (keysPressed.current['ArrowLeft']) setRotation(r => Math.max(0, r - 2));
          if (keysPressed.current['ArrowRight']) setRotation(r => Math.min(180, r + 2));
          if (keysPressed.current['ArrowUp']) setArmHeight(h => Math.max(0, h - 2));
          if (keysPressed.current['ArrowDown']) setArmHeight(h => Math.min(100, h + 2));
          
          // Wind Effect
          if (level.wind > 0 && hasSand) {
              setRotation(r => Math.min(180, Math.max(0, r + (Math.random() - 0.5) * level.wind)));
          }

          // Container Movement
          if (level.moving) {
              setContainerPos(prev => {
                  let next = prev + (level.speed * containerDir);
                  if (next > 40 || next < 0) {
                      setContainerDir(d => d * -1);
                      next = prev;
                  }
                  return next;
              });
          } else {
              setContainerPos(10);
          }
          
          requestRef.current = requestAnimationFrame(animate);
      };
      requestRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(requestRef.current);
  }, [level, containerDir, hasSand]);

  // Particles
  const spawnParticles = (count: number, xStart: number, colorClass: string) => {
      const newParts = [];
      for(let i=0; i<count; i++) {
          newParts.push({
              id: Math.random(),
              x: Math.random() * 40 + (rotation > 90 ? 250 : 50), // Rough visual mapping
              y: 200,
              color: colorClass
          });
      }
      setParticles(p => [...p, ...newParts]);
      setTimeout(() => setParticles([]), 1000); // Cleanup
  };

  // Timer & Level Up
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

  useEffect(() => {
      if (currentScore >= level.quota && levelIdx < LEVELS.length - 1) {
          audio.playWin();
          setLevelIdx(l => l + 1);
          setCurrentScore(0);
          setTimeLeft(prev => prev + 30); // Bonus time
      }
  }, [currentScore, level.quota, levelIdx]);

  return (
    <div className="relative w-full h-[400px] bg-amber-50 rounded-xl overflow-hidden border-4 border-slate-300 shadow-inner select-none">
       {/* UI / HUD */}
       <div className="absolute top-4 left-4 right-4 flex justify-between z-30">
           <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-lg shadow border border-amber-200">
               <div className="text-xs font-bold text-amber-600 uppercase">Verkefni</div>
               <div className="text-xl font-black text-slate-800">{level.name}</div>
               <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1">
                 <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (currentScore/level.quota)*100)}%` }}></div>
               </div>
           </div>
           <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-lg shadow font-mono font-bold text-2xl text-slate-700 border border-slate-200">
               {timeLeft}s
           </div>
       </div>
       
       {/* Wind Indicator */}
       {level.wind > 0 && (
           <div className="absolute top-20 right-4 text-blue-400 animate-pulse flex items-center gap-2 font-bold z-20">
               <Wind size={24} /> <span className="text-sm">Hvasst!</span>
           </div>
       )}

       {/* Environment */}
       <div className="absolute bottom-0 left-0 w-48 h-32 bg-yellow-600/20 rounded-tr-full z-0"></div>
       <div className="absolute bottom-0 left-0 w-32 h-24 bg-yellow-600 rounded-tr-full z-0 border-t-4 border-yellow-700 shadow-inner"></div>
       
       {/* Particles */}
       {particles.map(p => (
           <div 
            key={p.id} 
            className={`absolute w-2 h-2 rounded-full ${p.color} animate-fall`}
            style={{ left: p.x, top: p.y }}
           ></div>
       ))}

       {/* Container (Right) */}
       <div 
            className="absolute bottom-0 h-24 bg-red-700 border-l-4 border-r-4 border-red-900 flex items-center justify-center transition-transform z-10 shadow-lg"
            style={{ 
                right: `${containerPos}%`, 
                width: '120px' 
            }}
       >
           <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#00000020_10px,#00000020_20px)]"></div>
           <div className="absolute top-2 text-white/50 font-black uppercase text-xl">Gámur</div>
       </div>

       {/* Excavator Base */}
       <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-24 h-14 bg-slate-900 rounded-t-xl z-20 shadow-2xl border-t border-slate-700">
          <div className="w-full h-3 bg-yellow-500 mt-2 border-y border-black"></div>
          {/* Tracks */}
          <div className="absolute -bottom-4 left-0 w-full h-6 bg-slate-800 rounded-full border-2 border-black flex gap-1 overflow-hidden px-1">
              {[...Array(6)].map((_,i) => <div key={i} className="flex-1 bg-slate-600 rounded-sm"></div>)}
          </div>
       </div>

       {/* Rotating Cab & Arm */}
       <div 
         className="absolute bottom-16 left-1/2 w-0 h-0 transition-transform duration-75 ease-linear z-30"
         style={{ transform: `rotate(${rotation - 90}deg)` }}
       >
           {/* Cab */}
           <div className="absolute -top-10 -left-10 w-20 h-20 bg-yellow-400 border-2 border-black rounded-xl shadow-xl flex items-center justify-center">
               <div className="w-16 h-14 bg-sky-200 border border-black/20 rounded-lg opacity-80"></div>
           </div>
           
           {/* Main Boom */}
           <div className="absolute top-0 left-0 w-40 h-6 bg-yellow-500 border-2 border-black origin-left transform -rotate-45 rounded-r-lg shadow-lg">
                {/* Hydraulic Piston */}
                <div className="absolute -top-4 left-10 w-20 h-2 bg-slate-300 border border-slate-500"></div>

                {/* Stick (The part that moves up/down relative to boom) */}
                <div 
                    className="absolute right-0 top-0 w-32 h-5 bg-yellow-500 border-2 border-black origin-right transition-transform duration-75 ease-out"
                    style={{ transform: `rotate(${armHeight}deg)` }}
                >
                    {/* Bucket */}
                    <div className={`absolute left-0 -bottom-4 w-12 h-10 border-4 border-black rounded-bl-3xl rounded-br-md origin-top-left transform rotate-12 ${hasSand ? 'bg-yellow-600' : 'bg-slate-800'}`}>
                        {hasSand && <div className="absolute -top-2 left-0 w-full h-4 bg-yellow-600 rounded-full"></div>}
                    </div>
                </div>
           </div>
       </div>

       {/* Instructions Overlay */}
       <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur rounded-xl p-2 flex justify-center items-center gap-6 shadow-lg border border-slate-200 z-40 text-slate-800">
            <div className="flex items-center gap-2">
                <div className="flex gap-1">
                    <span className="bg-slate-200 border border-slate-400 rounded px-1.5 py-0.5"><ArrowLeft size={16}/></span>
                    <span className="bg-slate-200 border border-slate-400 rounded px-1.5 py-0.5"><ArrowRight size={16}/></span>
                </div>
                <span className="text-xs font-bold uppercase">Snúa</span>
            </div>
            <div className="w-px h-6 bg-slate-300"></div>
            <div className="flex items-center gap-2">
                <div className="flex gap-1">
                    <span className="bg-slate-200 border border-slate-400 rounded px-1.5 py-0.5"><ArrowUp size={16}/></span>
                    <span className="bg-slate-200 border border-slate-400 rounded px-1.5 py-0.5"><ArrowDown size={16}/></span>
                </div>
                <span className="text-xs font-bold uppercase">Armur</span>
            </div>
            <div className="w-px h-6 bg-slate-300"></div>
            <div className="flex items-center gap-2">
                <span className="bg-slate-200 border border-slate-400 rounded px-3 py-0.5 text-xs font-black min-w-[50px] text-center">SPACE</span>
                <span className="text-xs font-bold uppercase">Grafa / Losa</span>
            </div>
       </div>
    </div>
  );
};

export default SandGame;
