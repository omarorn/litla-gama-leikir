
import React, { useState, useEffect, useRef } from 'react';
import { Wind, Trophy, CornerDownLeft, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Bird, Loader2, BrainCircuit, Sparkles } from 'lucide-react';
import { audio } from '../../services/audioService';
import { generateSandLevel } from '../../services/geminiService';

interface SandGameProps {
  onScore: React.Dispatch<React.SetStateAction<number>>;
  onGameOver: () => void;
}

interface LevelData {
    name: string;
    wind: number;
    speed: number;
    quota: number;
    enemyCount: number;
}

interface Enemy {
    id: number;
    x: number;
    y: number;
    speed: number;
    dir: number;
}

const SandGame: React.FC<SandGameProps> = ({ onScore, onGameOver }) => {
  const [levelIdx, setLevelIdx] = useState(1);
  const [levelData, setLevelData] = useState<LevelData | null>(null);
  const [loadingLevel, setLoadingLevel] = useState(true);
  
  const [currentScore, setCurrentScore] = useState(0);
  
  const [rotation, setRotation] = useState(0); // 0 = Left (Sand), 180 = Right (Bin)
  const [hasSand, setHasSand] = useState(false);
  const [hasTreasure, setHasTreasure] = useState(false); // New: LG Treasure state
  const [armHeight, setArmHeight] = useState(50); // 0 = up, 100 = down
  const [timeLeft, setTimeLeft] = useState(60);
  
  const [containerPos, setContainerPos] = useState(10); // Right side offset
  const [containerDir, setContainerDir] = useState(1);
  
  const [particles, setParticles] = useState<{id: number, x: number, y: number, color: string}[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  
  const keysPressed = useRef<Record<string, boolean>>({});
  const requestRef = useRef<number>(0);

  // Load Level
  useEffect(() => {
      const loadLevel = async () => {
          setLoadingLevel(true);
          const data = await generateSandLevel(levelIdx);
          setLevelData(data);
          
          // Spawn Enemies
          const newEnemies: Enemy[] = [];
          for(let i=0; i<data.enemyCount; i++) {
              newEnemies.push({
                  id: Math.random(),
                  x: Math.random() * 300,
                  y: 50 + Math.random() * 100,
                  speed: 0.5 + (Math.random() * 0.5) + (levelIdx * 0.1),
                  dir: Math.random() > 0.5 ? 1 : -1
              });
          }
          setEnemies(newEnemies);
          setTimeLeft(60 + (levelIdx * 5));
          setCurrentScore(0);
          setLoadingLevel(false);
          setHasTreasure(false);
      };
      loadLevel();
  }, [levelIdx]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.key] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key] = false; };
    
    const handleAction = (e: KeyboardEvent) => {
        if (!levelData || loadingLevel) return;

        if (e.key === ' ' || e.key === 'Enter') {
             if (rotation < 30 && armHeight > 70 && !hasSand) {
                  // DIG
                  setHasSand(true);
                  // Chance for LG Treasure
                  if (Math.random() < 0.1) setHasTreasure(true);
                  
                  audio.playClick();
                  spawnParticles(20, 100, 'bg-yellow-700'); // Dirt
             } else if (rotation > 150 && armHeight > 20 && hasSand) {
                  // DUMP
                  setHasSand(false);
                  
                  if (hasTreasure) {
                      setHasTreasure(false);
                      spawnParticles(20, 60, 'bg-yellow-400'); // Gold
                      onScore(s => s + 300); // Big Bonus
                      audio.playWin();
                  } else {
                      spawnParticles(15, 60, 'bg-yellow-500'); // Sand
                      // Score calculation
                      onScore(s => {
                          const points = 50 + (levelIdx * 10);
                          const newScore = s + points;
                          setCurrentScore(cs => cs + points);
                          return newScore;
                      });
                      audio.playSuccess();
                  }
             } else if (hasSand) {
                 // Wasted
                 setHasSand(false);
                 setHasTreasure(false);
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
  }, [rotation, armHeight, hasSand, hasTreasure, levelData, loadingLevel, onScore, levelIdx]);

  // Game Loop
  useEffect(() => {
      const animate = () => {
          if (!levelData || loadingLevel) {
              requestRef.current = requestAnimationFrame(animate);
              return;
          }

          // Player Movement
          if (keysPressed.current['ArrowLeft']) setRotation(r => Math.max(0, r - 2));
          if (keysPressed.current['ArrowRight']) setRotation(r => Math.min(180, r + 2));
          if (keysPressed.current['ArrowUp']) setArmHeight(h => Math.max(0, h - 2));
          if (keysPressed.current['ArrowDown']) setArmHeight(h => Math.min(100, h + 2));
          
          // Wind Effect
          if (levelData.wind > 0 && hasSand) {
              setRotation(r => Math.min(180, Math.max(0, r + (Math.random() - 0.5) * levelData.wind)));
          }

          // Container Movement
          if (levelData.speed > 0) {
              setContainerPos(prev => {
                  let next = prev + (levelData.speed * containerDir);
                  if (next > 40 || next < 0) {
                      setContainerDir(d => d * -1);
                      next = prev;
                  }
                  return next;
              });
          }

          // Enemy Logic
          setEnemies(prev => prev.map(e => {
              let nextX = e.x + (e.speed * e.dir);
              if (nextX > 400 || nextX < 0) {
                  e.dir *= -1;
              }
              
              // Simple Collision Check
              // Map rotation (0-180) roughly to X (0-400)
              // 0 deg = left (50px), 180 deg = right (350px)
              // Arm height affects Y (0 = high, 100 = low)
              const bucketX = 50 + (rotation / 180) * 300;
              const bucketY = 100 + (armHeight / 100) * 100;
              
              const dist = Math.sqrt(Math.pow(nextX - bucketX, 2) + Math.pow(e.y - bucketY, 2));
              
              if (dist < 30) {
                  // HIT
                  audio.playError();
                  onScore(s => Math.max(0, s - 5));
                  // Teleport bird away
                  nextX = Math.random() > 0.5 ? 0 : 400;
              }

              return { ...e, x: nextX, dir: e.dir };
          }));
          
          requestRef.current = requestAnimationFrame(animate);
      };
      requestRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(requestRef.current);
  }, [levelData, containerDir, hasSand, loadingLevel, rotation, armHeight, onScore]);

  // Particles
  const spawnParticles = (count: number, xStart: number, colorClass: string) => {
      const newParts = [];
      for(let i=0; i<count; i++) {
          newParts.push({
              id: Math.random(),
              x: Math.random() * 40 + (rotation > 90 ? 250 : 50),
              y: 200,
              color: colorClass
          });
      }
      setParticles(p => [...p, ...newParts]);
      setTimeout(() => setParticles([]), 1000);
  };

  // Timer & Level Up
  useEffect(() => {
      if (loadingLevel) return;
      
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
  }, [onGameOver, loadingLevel]);

  useEffect(() => {
      if (levelData && currentScore >= levelData.quota) {
          audio.playWin();
          setLevelIdx(l => l + 1);
      }
  }, [currentScore, levelData]);

  if (loadingLevel) {
      return (
          <div className="w-full h-[400px] bg-amber-900/90 rounded-xl flex flex-col items-center justify-center text-white border-4 border-amber-600">
              <BrainCircuit className="animate-pulse text-yellow-400 mb-4" size={64} />
              <h2 className="text-2xl font-black uppercase tracking-widest mb-2">Hanna nýtt svæði...</h2>
              <p className="text-amber-200 font-mono animate-pulse">Gemini 3 Pro er að reikna vindhraða...</p>
          </div>
      );
  }

  if (!levelData) return null;

  return (
    <div className="relative w-full h-[400px] bg-slate-900 rounded-xl overflow-hidden border-4 border-slate-300 shadow-inner select-none">
       {/* Background Image */}
       <div className="absolute inset-0 z-0">
           <img 
               src="https://photos.app.goo.gl/q64akRVh566bQ6EUA" 
               className="w-full h-full object-cover opacity-60"
               onError={(e) => {
                   e.currentTarget.style.display = 'none';
               }}
               alt="Background"
           />
           <div className="absolute inset-0 bg-slate-900/40"></div>
       </div>

       {/* UI / HUD */}
       <div className="absolute top-4 left-4 right-4 flex justify-between z-30">
           <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-lg shadow border border-amber-200">
               <div className="text-xs font-bold text-amber-600 uppercase">Borð {levelIdx}</div>
               <div className="text-xl font-black text-slate-800">{levelData.name}</div>
               <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1">
                 <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (currentScore/levelData.quota)*100)}%` }}></div>
               </div>
           </div>
           <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-lg shadow font-mono font-bold text-2xl text-slate-700 border border-slate-200">
               {timeLeft}s
           </div>
       </div>
       
       {/* Wind Indicator */}
       {levelData.wind > 0 && (
           <div className="absolute top-20 right-4 text-blue-400 animate-pulse flex items-center gap-2 font-bold z-20">
               <Wind size={24} /> <span className="text-sm">Vindur: {levelData.wind}</span>
           </div>
       )}

       {/* Environment (Ground Piles) */}
       <div className="absolute bottom-0 left-0 w-48 h-32 bg-yellow-600/40 rounded-tr-full z-0 backdrop-blur-sm border-t-2 border-yellow-500/50"></div>
       <div className="absolute bottom-0 left-0 w-32 h-24 bg-yellow-600/60 rounded-tr-full z-0 border-t-4 border-yellow-700/50 shadow-inner backdrop-blur-sm"></div>
       
       {/* Enemies */}
       {enemies.map(e => (
           <div key={e.id} className="absolute transition-none z-10 text-white drop-shadow-lg" style={{ left: e.x, top: e.y, transform: `scaleX(${e.dir * -1})` }}>
               <Bird className="animate-bounce" size={24} />
           </div>
       ))}

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
                        {/* TREASURE VISUAL */}
                        {hasTreasure && (
                            <div className="absolute top-0 left-2 w-6 h-6 bg-yellow-400 border border-black animate-pulse rounded-full flex items-center justify-center z-50">
                                <span className="text-[8px] font-black text-black">LG</span>
                            </div>
                        )}
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
