
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Snowflake, Car, AlertOctagon, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Lightbulb, Search, Wind, Crown } from 'lucide-react';
import { audio } from '../../services/audioService';

interface SnowPlowGameProps {
  onScore: React.Dispatch<React.SetStateAction<number>>;
  onGameOver: () => void;
}

const GRID_W = 12;
const GRID_H = 10;
const TOTAL_CELLS = GRID_W * GRID_H;

type TerrainType = 'asphalt' | 'ice' | 'gravel';
type HiddenItemType = 'none' | 'mitten' | 'fish' | 'phone' | 'keys' | 'trash' | 'lg_beanie';

interface Cell {
  id: number;
  hasSnow: boolean;
  snowDepth: number; // 1 = light, 2 = heavy (brekka/skafl)
  terrain: TerrainType;
  obstacle: boolean;
  hiddenItem: HiddenItemType;
}

const ITEMS_CONFIG: Record<HiddenItemType, { icon: string, points: number, label: string }> = {
    'none': { icon: '', points: 0, label: '' },
    'mitten': { icon: '🧤', points: 50, label: 'Týndur Vettlingur!' },
    'fish': { icon: '🐟', points: 100, label: 'Frosinn Harðfiskur!' },
    'phone': { icon: '📱', points: 150, label: 'GSM Sími!' },
    'keys': { icon: '🔑', points: 200, label: 'Bíllyklar!' },
    'trash': { icon: '💩', points: 10, label: 'Hundaskítur...' },
    'lg_beanie': { icon: '👑', points: 500, label: 'Litla Gamaleigan Húfa!' }
};

const SnowPlowGame: React.FC<SnowPlowGameProps> = ({ onScore, onGameOver }) => {
  // Game State
  const [level, setLevel] = useState(1);
  const [grid, setGrid] = useState<Cell[]>([]);
  const [playerPos, setPlayerPos] = useState(0);
  const [direction, setDirection] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('RIGHT');
  const [timeLeft, setTimeLeft] = useState(60);
  const [isSliding, setIsSliding] = useState(false);
  const [snowCleared, setSnowCleared] = useState(0);
  const [totalSnow, setTotalSnow] = useState(0);
  const [foundItem, setFoundItem] = useState<{label: string, icon: string} | null>(null);
  
  // Visual Effects
  const [lightsOn, setLightsOn] = useState(true);
  const [particles, setParticles] = useState<{x: number, y: number, s: number}[]>([]);

  // Init Level
  const initLevel = useCallback((lvl: number) => {
      const newGrid: Cell[] = [];
      let snowCount = 0;

      // Generate Map
      for (let i = 0; i < TOTAL_CELLS; i++) {
          const isObstacle = i !== 0 && Math.random() < 0.08 + (lvl * 0.01); // More cars on higher levels
          const isIce = Math.random() < 0.15;
          const isDeepSnow = Math.random() < 0.2;
          
          let item: HiddenItemType = 'none';
          if (!isObstacle && Math.random() < 0.05) {
              const r = Math.random();
              if (r > 0.98) item = 'lg_beanie'; // Rare LG Item
              else if (r > 0.9) item = 'keys';
              else if (r > 0.7) item = 'phone';
              else if (r > 0.5) item = 'fish';
              else if (r > 0.3) item = 'mitten';
              else item = 'trash';
          }

          newGrid.push({
              id: i,
              hasSnow: !isObstacle,
              snowDepth: isDeepSnow ? 2 : 1,
              terrain: isIce ? 'ice' : 'asphalt',
              obstacle: isObstacle,
              hiddenItem: item
          });

          if (!isObstacle) snowCount++;
      }

      // Ensure start is clearish
      newGrid[0].obstacle = false;
      newGrid[0].snowDepth = 1;
      
      setGrid(newGrid);
      setTotalSnow(snowCount);
      setSnowCleared(0);
      setPlayerPos(0);
      setDirection('RIGHT');
      setTimeLeft(60 - (lvl * 2)); // Less time each level
      setFoundItem(null);
      setIsSliding(false);
  }, []);

  useEffect(() => {
      initLevel(1);
  }, [initLevel]);

  // Snow Particles
  useEffect(() => {
      const interval = setInterval(() => {
          setParticles(prev => {
              const next = prev.map(p => ({ ...p, y: p.y + p.s, x: p.x + Math.sin(p.y/10) }));
              // Remove old, add new
              const filtered = next.filter(p => p.y < 100);
              if (filtered.length < 50) {
                  filtered.push({ x: Math.random() * 100, y: -5, s: 0.5 + Math.random() });
              }
              return filtered;
          });
      }, 50);
      return () => clearInterval(interval);
  }, []);

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

  // Movement Logic
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (isSliding) return;
          
          let nextDir = direction;
          let moveIdx = 0;

          if (e.key === 'ArrowUp') { nextDir = 'UP'; moveIdx = -GRID_W; }
          if (e.key === 'ArrowDown') { nextDir = 'DOWN'; moveIdx = GRID_W; }
          if (e.key === 'ArrowLeft') { nextDir = 'LEFT'; moveIdx = -1; }
          if (e.key === 'ArrowRight') { nextDir = 'RIGHT'; moveIdx = 1; }

          if (moveIdx !== 0) {
              setDirection(nextDir);
              movePlayer(moveIdx, nextDir);
          }
      };

      const movePlayer = (delta: number, dir: string) => {
          setPlayerPos(curr => {
              const next = curr + delta;
              
              // Boundaries
              if (next < 0 || next >= TOTAL_CELLS) return curr;
              if (dir === 'RIGHT' && curr % GRID_W === GRID_W - 1) return curr;
              if (dir === 'LEFT' && curr % GRID_W === 0) return curr;

              // Check Cell
              const cell = grid[next];
              
              if (cell.obstacle) {
                  audio.playError();
                  // Screen shake effect could go here
                  return curr;
              }

              // Process Move
              processCell(next);

              // Ice Physics (Slide)
              if (cell.terrain === 'ice') {
                  setIsSliding(true);
                  setTimeout(() => {
                      // Recursive slide until non-ice or obstacle
                      setIsSliding(false); // Allow re-render
                      movePlayer(delta, dir); 
                  }, 150);
              }

              // Deep Snow (Slower)
              if (cell.hasSnow && cell.snowDepth === 2) {
                  // Could add delay here, but visually we just show it's hard
              }

              return next;
          });
      };

      const processCell = (idx: number) => {
          setGrid(prev => {
              const newGrid = [...prev];
              const cell = newGrid[idx];
              
              if (cell.hasSnow) {
                  // Reveal item
                  if (cell.hiddenItem !== 'none') {
                      const itemData = ITEMS_CONFIG[cell.hiddenItem];
                      setFoundItem({ label: itemData.label, icon: itemData.icon });
                      onScore(s => s + itemData.points);
                      
                      if (cell.hiddenItem === 'lg_beanie') audio.playWin();
                      else audio.playSuccess();
                      
                      setTimeout(() => setFoundItem(null), 2000);
                  } else {
                      onScore(s => s + 10);
                  }

                  // Clear snow
                  cell.hasSnow = false;
                  setSnowCleared(s => s + 1);
              }
              return newGrid;
          });
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [grid, isSliding, direction, onScore]);

  // Win Condition
  useEffect(() => {
      if (snowCleared >= totalSnow && totalSnow > 0) {
          audio.playWin();
          setTimeout(() => {
              setLevel(l => l + 1);
              initLevel(level + 1);
          }, 1500);
      }
  }, [snowCleared, totalSnow, level, initLevel]);

  // Lighting Calculation
  const getLighting = () => {
      // Calculate x,y of player
      const px = (playerPos % GRID_W) * (100 / GRID_W) + (50 / GRID_W);
      const py = Math.floor(playerPos / GRID_W) * (100 / GRID_H) + (50 / GRID_H);
      
      // Determine headlight cone based on direction
      // 15% clear center, 45% falloff into dark
      return `radial-gradient(circle at ${px}% ${py}%, transparent 15%, rgba(15, 23, 42, 0.95) 45%)`;
  };

  const getRotation = () => {
      switch(direction) {
          case 'UP': return 0;
          case 'RIGHT': return 90;
          case 'DOWN': return 180;
          case 'LEFT': return 270;
      }
  };

  return (
    <div className="relative w-full h-[500px] bg-slate-900 rounded-xl overflow-hidden border-4 border-slate-700 shadow-2xl select-none group">
        
        {/* HUD */}
        <div className="absolute top-4 left-4 right-4 flex justify-between z-40 text-white drop-shadow-md">
            <div className="bg-slate-800/80 px-3 py-1 rounded border border-slate-500 flex items-center gap-2">
                <span className="text-yellow-400 font-black text-xl">Borð {level}</span>
                <span className="text-xs text-slate-400">{Math.floor((snowCleared/totalSnow)*100)}%</span>
            </div>
            <div className={`px-3 py-1 rounded font-bold text-xl flex items-center gap-2 ${timeLeft < 10 ? 'bg-red-900/80 text-red-200 animate-pulse' : 'bg-slate-800/80'}`}>
                ⏱ {timeLeft}s
            </div>
        </div>

        {/* Found Item Popup */}
        {foundItem && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-bounce-in">
                <div className="bg-yellow-400 text-black px-6 py-4 rounded-xl border-4 border-white shadow-2xl text-center transform rotate-3">
                    <div className="text-6xl mb-2 animate-bounce">{foundItem.icon}</div>
                    <div className="font-black uppercase tracking-widest text-sm">{foundItem.label}</div>
                    <div className="text-xs font-bold">+STIG</div>
                </div>
            </div>
        )}

        {/* The Grid */}
        <div className="w-full h-full grid relative" style={{ gridTemplateColumns: `repeat(${GRID_W}, 1fr)`, gridTemplateRows: `repeat(${GRID_H}, 1fr)` }}>
            {grid.map((cell) => {
                // Styling based on state
                let bgClass = "bg-slate-800"; // Asphalt
                if (cell.terrain === 'ice') bgClass = "bg-cyan-900"; // Black Ice

                return (
                    <div key={cell.id} className={`relative border border-slate-800/30 ${bgClass} overflow-hidden`}>
                        {/* Terrain Texture */}
                        {cell.terrain === 'ice' && !cell.hasSnow && (
                            <div className="absolute inset-0 bg-cyan-400/10 animate-pulse">
                                <AlertOctagon size={12} className="absolute top-1 left-1 text-cyan-500 opacity-50" />
                            </div>
                        )}

                        {/* Hidden Item Revealed */}
                        {!cell.hasSnow && cell.hiddenItem !== 'none' && (
                             <div className="absolute inset-0 flex items-center justify-center opacity-50 grayscale">
                                 <span className="text-xl">{ITEMS_CONFIG[cell.hiddenItem].icon}</span>
                             </div>
                        )}

                        {/* Snow Layer */}
                        {cell.hasSnow && (
                            <div className={`absolute inset-0 transition-all duration-500 
                                ${cell.snowDepth === 2 ? 'bg-slate-100' : 'bg-slate-200'}
                                flex items-center justify-center
                            `}>
                                {/* Snow Texture */}
                                {cell.snowDepth === 2 && (
                                    <div className="w-full h-full bg-[radial-gradient(#cbd5e1_2px,transparent_2px)] [background-size:8px_8px] opacity-50"></div>
                                )}
                                <Snowflake size={cell.snowDepth === 2 ? 16 : 10} className="text-slate-400 opacity-30" />
                            </div>
                        )}

                        {/* Obstacle (Parked Car) */}
                        {cell.obstacle && (
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                <Car size={24} className="text-red-500 fill-red-900 drop-shadow-lg" />
                                <div className="absolute w-full h-full bg-white/20 rounded-t-lg transform scale-75 translate-y-1"></div> {/* Snow on car */}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* The Player (Absolute positioning on top of grid) */}
            <div 
                className="absolute transition-all duration-150 z-20"
                style={{
                    width: `${100/GRID_W}%`,
                    height: `${100/GRID_H}%`,
                    left: `${(playerPos % GRID_W) * (100/GRID_W)}%`,
                    top: `${Math.floor(playerPos / GRID_W) * (100/GRID_H)}%`,
                }}
            >
                <div className="w-full h-full relative flex items-center justify-center" style={{ transform: `rotate(${getRotation()}deg)` }}>
                    {/* Vehicle Body */}
                    <div className="w-8 h-10 bg-yellow-500 rounded-sm shadow-lg border border-yellow-700 relative z-10">
                         {/* Cab */}
                         <div className="absolute top-3 left-1 right-1 height-3 bg-slate-800 rounded-sm h-3"></div>
                         {/* Lights */}
                         <div className="absolute top-0 left-0 w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]"></div>
                         <div className="absolute top-0 right-0 w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]"></div>
                         {/* Plow Blade */}
                         <div className="absolute -top-2 -left-1 -right-1 h-2 bg-slate-900 rounded-sm flex gap-1 justify-center border-b-2 border-slate-600">
                             <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#000_3px)] opacity-30"></div>
                         </div>
                    </div>
                    {/* Tire Tracks */}
                    <div className="absolute top-full left-2 w-1 h-full bg-black/10"></div>
                    <div className="absolute top-full right-2 w-1 h-full bg-black/10"></div>
                </div>
            </div>
        </div>

        {/* Darkness Overlay (Headlights) */}
        <div 
            className="absolute inset-0 pointer-events-none z-30 transition-all duration-300"
            style={{ background: lightsOn ? getLighting() : 'transparent' }}
        ></div>

        {/* Falling Snow Overlay (Particles) */}
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
            {particles.map((p, i) => (
                <div 
                    key={i} 
                    className="absolute bg-white rounded-full opacity-60"
                    style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.s * 4}px`, height: `${p.s * 4}px` }}
                ></div>
            ))}
        </div>

        {/* Controls */}
        <div className="absolute bottom-4 right-4 z-40 flex flex-col items-center gap-1 md:hidden opacity-50 hover:opacity-100">
            <button className="bg-yellow-500 p-4 rounded-full shadow-lg active:scale-95" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowUp'}))}><ArrowUp color="black"/></button>
            <div className="flex gap-4">
                <button className="bg-yellow-500 p-4 rounded-full shadow-lg active:scale-95" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowLeft'}))}><ArrowLeft color="black"/></button>
                <button className="bg-yellow-500 p-4 rounded-full shadow-lg active:scale-95" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}))}><ArrowDown color="black"/></button>
                <button className="bg-yellow-500 p-4 rounded-full shadow-lg active:scale-95" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowRight'}))}><ArrowRight color="black"/></button>
            </div>
        </div>
        
        {/* Toggle Lights Button */}
        <button 
            onClick={() => setLightsOn(!lightsOn)} 
            className="absolute top-4 left-4 z-50 bg-slate-800 text-yellow-400 p-2 rounded-full border border-slate-600 hover:bg-slate-700"
        >
            <Lightbulb size={20} className={lightsOn ? "fill-current" : ""} />
        </button>

    </div>
  );
};

export default SnowPlowGame;
