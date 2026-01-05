import React, { useState, useEffect, useCallback } from 'react';
import { Snowflake, Car, AlertOctagon } from 'lucide-react';
import { audio } from '../../services/audioService';

interface SnowPlowGameProps {
  onScore: React.Dispatch<React.SetStateAction<number>>;
  onGameOver: () => void;
}

const GRID_SIZE = 10;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

// Level Definitions
const LEVELS = [
  {
    id: 1,
    name: "Heimaplaanið",
    time: 40,
    obstacles: [],
    ice: [12, 13, 14, 22, 23, 33] // Indices of ice patches
  },
  {
    id: 2,
    name: "Bónus Planið",
    time: 50,
    obstacles: [22, 27, 72, 77], // Parked cars
    ice: [44, 45, 54, 55]
  },
  {
    id: 3,
    name: "Þrönga Gatan",
    time: 60,
    obstacles: [11, 31, 51, 71, 91, 18, 38, 58, 78, 98], // Street parking
    ice: [4, 5, 14, 15, 24, 25, 34, 35, 44, 45, 54, 55, 64, 65, 74, 75, 84, 85, 94, 95] // Icy road center
  }
];

const SnowPlowGame: React.FC<SnowPlowGameProps> = ({ onScore, onGameOver }) => {
  const [levelIndex, setLevelIndex] = useState(0);
  const [grid, setGrid] = useState<boolean[]>([]); // true = snow
  const [playerPos, setPlayerPos] = useState(0);
  const [timeLeft, setTimeLeft] = useState(LEVELS[0].time);
  const [isSliding, setIsSliding] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(true);
  const [snowCleared, setSnowCleared] = useState(0);

  // Initialize Level
  const initLevel = useCallback((idx: number) => {
    const lvl = LEVELS[idx];
    const newGrid = Array(TOTAL_CELLS).fill(true);
    
    // Clear snow where obstacles are
    lvl.obstacles.forEach(obs => newGrid[obs] = false);
    
    setGrid(newGrid);
    setPlayerPos(0);
    setTimeLeft(lvl.time);
    setSnowCleared(0);
    setIsSliding(false);
  }, []);

  useEffect(() => {
    initLevel(0);
  }, [initLevel]);

  const handleLevelComplete = () => {
    if (levelIndex < LEVELS.length - 1) {
      audio.playWin();
      setLevelIndex(prev => {
        const next = prev + 1;
        initLevel(next);
        setShowLevelUp(true);
        return next;
      });
    } else {
      onGameOver();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (isSliding || showLevelUp) return;

        let moveDir = 0; // -1 left, 1 right, -10 up, 10 down
        
        if (e.key === 'ArrowUp') moveDir = -GRID_SIZE;
        if (e.key === 'ArrowDown') moveDir = GRID_SIZE;
        if (e.key === 'ArrowLeft') moveDir = -1;
        if (e.key === 'ArrowRight') moveDir = 1;

        if (moveDir !== 0) {
            movePlayer(moveDir);
        }
    };

    const movePlayer = (dir: number) => {
        setPlayerPos(current => {
            const next = current + dir;
            
            // Boundary checks
            if (dir === 1 && (current + 1) % GRID_SIZE === 0) return current; // Right edge
            if (dir === -1 && current % GRID_SIZE === 0) return current; // Left edge
            if (next < 0 || next >= TOTAL_CELLS) return current; // Top/Bottom edge

            // Obstacle check
            if (LEVELS[levelIndex].obstacles.includes(next)) {
                audio.playError(); // Crash sound
                onScore(s => Math.max(0, s - 50)); // Penalty
                return current;
            }

            // Valid Move
            processTile(next);

            // Ice Physics
            if (LEVELS[levelIndex].ice.includes(next)) {
                setIsSliding(true);
                setTimeout(() => {
                   setIsSliding(false);
                   movePlayer(dir); // Recurse to slide again
                }, 150);
            }

            return next;
        });
    };

    const processTile = (idx: number) => {
        setGrid(prev => {
            if (prev[idx]) {
                const newGrid = [...prev];
                newGrid[idx] = false;
                setSnowCleared(s => s + 1);
                onScore(s => s + 10);
                return newGrid;
            }
            return prev;
        });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerPos, grid, onScore, isSliding, levelIndex, showLevelUp]);

  // Check Win Condition (90% cleared)
  useEffect(() => {
      const totalSnow = TOTAL_CELLS - LEVELS[levelIndex].obstacles.length;
      if (snowCleared >= totalSnow * 0.9 && !showLevelUp) {
          handleLevelComplete();
      }
  }, [snowCleared, levelIndex, showLevelUp]);

  useEffect(() => {
      if (showLevelUp) return;
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
  }, [onGameOver, showLevelUp]);

  const currentLevelData = LEVELS[levelIndex];

  if (showLevelUp) {
      return (
          <div className="w-full h-[400px] bg-slate-800 rounded-xl flex flex-col items-center justify-center text-white border-4 border-slate-300">
              <h2 className="text-3xl font-black text-yellow-400 mb-2">{currentLevelData.name}</h2>
              <p className="text-xl mb-6">Borð {levelIndex + 1} / {LEVELS.length}</p>
              <div className="flex gap-4 text-sm text-slate-300 mb-8">
                  <div className="flex items-center gap-1"><Car size={16} /> {currentLevelData.obstacles.length} Bílar</div>
                  <div className="flex items-center gap-1"><AlertOctagon size={16} /> {currentLevelData.ice.length} Hálkublettir</div>
              </div>
              <button 
                onClick={() => setShowLevelUp(false)}
                className="bg-green-500 text-white px-8 py-3 rounded-full font-bold text-xl hover:scale-105 transition-transform"
              >
                  Byrja Moka
              </button>
          </div>
      );
  }

  return (
    <div className="relative w-full h-[400px] bg-slate-800 rounded-xl overflow-hidden border-4 border-slate-300 shadow-inner flex flex-col items-center justify-center select-none">
        <div className="absolute top-4 left-4 font-bold text-2xl text-white z-10 drop-shadow-md">⏱ {timeLeft}s</div>
        <div className="absolute top-4 right-4 font-bold text-xl text-yellow-400 z-10 drop-shadow-md">
             {Math.floor((snowCleared / (TOTAL_CELLS - currentLevelData.obstacles.length)) * 100)}%
        </div>
        
        <div className="grid grid-cols-10 gap-0.5 bg-slate-900 border-4 border-slate-600 relative">
            {Array.from({ length: TOTAL_CELLS }).map((_, idx) => {
                const isObstacle = currentLevelData.obstacles.includes(idx);
                const isIce = currentLevelData.ice.includes(idx);
                const hasSnow = grid[idx];
                const isPlayer = idx === playerPos;

                return (
                    <div 
                        key={idx} 
                        className={`w-8 h-8 flex items-center justify-center transition-colors duration-200 relative
                            ${isIce ? 'bg-cyan-900/50' : ''}
                            ${hasSnow ? 'bg-white' : 'bg-slate-700/50'}
                        `}
                    >
                        {/* Floor Texture */}
                        {isIce && !hasSnow && <div className="absolute inset-0 bg-cyan-400/20 animate-pulse"></div>}

                        {/* Static Elements */}
                        {isObstacle && (
                            <Car size={20} className={`${idx % 2 === 0 ? 'text-red-500' : 'text-blue-500'} fill-current`} />
                        )}

                        {/* Snow Effect */}
                        {hasSnow && !isObstacle && Math.random() > 0.85 && (
                            <Snowflake size={10} className="text-blue-200 opacity-50 absolute" />
                        )}

                        {/* Player */}
                        {isPlayer && (
                            <div className={`w-7 h-7 bg-yellow-500 rounded-sm shadow-lg border border-black relative z-10 ${isSliding ? 'transition-all duration-150' : ''}`}>
                                 {/* Plow blade */}
                                 <div className="absolute -bottom-1 left-0 w-full h-2 bg-black rounded-sm"></div>
                                 {/* Lights */}
                                 <div className="absolute top-0 left-1 w-1 h-1 bg-white rounded-full animate-ping"></div>
                                 <div className="absolute top-0 right-1 w-1 h-1 bg-white rounded-full animate-ping"></div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
        
        <div className="mt-4 text-white text-sm font-bold opacity-75">
            Varastu bíla! Hálka rennur hratt.
        </div>
        
        {/* D-Pad for mobile */}
        <div className="absolute bottom-4 right-4 grid grid-cols-3 gap-1 md:hidden opacity-80 z-20">
            <div></div>
            <button className="bg-yellow-500 p-3 rounded active:bg-yellow-600" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowUp'}))}>↑</button>
            <div></div>
            <button className="bg-yellow-500 p-3 rounded active:bg-yellow-600" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowLeft'}))}>←</button>
            <button className="bg-yellow-500 p-3 rounded active:bg-yellow-600" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}))}>↓</button>
            <button className="bg-yellow-500 p-3 rounded active:bg-yellow-600" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowRight'}))}>→</button>
        </div>
    </div>
  );
};

export default SnowPlowGame;