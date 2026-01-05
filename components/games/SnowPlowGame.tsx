import React, { useState, useEffect } from 'react';
import { Snowflake } from 'lucide-react';

interface SnowPlowGameProps {
  onScore: (points: number) => void;
  onGameOver: () => void;
}

const GRID_SIZE = 10;

const SnowPlowGame: React.FC<SnowPlowGameProps> = ({ onScore, onGameOver }) => {
  const [grid, setGrid] = useState<boolean[]>(Array(GRID_SIZE * GRID_SIZE).fill(true)); // true = snow
  const [playerPos, setPlayerPos] = useState(0);
  const [timeLeft, setTimeLeft] = useState(40);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        let newPos = playerPos;
        if (e.key === 'ArrowUp' && playerPos >= GRID_SIZE) newPos -= GRID_SIZE;
        if (e.key === 'ArrowDown' && playerPos < GRID_SIZE * (GRID_SIZE - 1)) newPos += GRID_SIZE;
        if (e.key === 'ArrowLeft' && playerPos % GRID_SIZE !== 0) newPos -= 1;
        if (e.key === 'ArrowRight' && (playerPos + 1) % GRID_SIZE !== 0) newPos += 1;

        if (newPos !== playerPos) {
            setPlayerPos(newPos);
            if (grid[newPos]) {
                const newGrid = [...grid];
                newGrid[newPos] = false;
                setGrid(newGrid);
                onScore(prev => {
                    const cleared = newGrid.filter(c => !c).length;
                    return cleared * 10;
                });
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerPos, grid, onScore]);

  useEffect(() => {
      // Check win
      if (grid.every(c => !c)) {
          onGameOver();
      }
  }, [grid, onGameOver]);

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
    <div className="relative w-full h-[400px] bg-slate-800 rounded-xl overflow-hidden border-4 border-slate-300 shadow-inner flex flex-col items-center justify-center">
        <div className="absolute top-4 left-4 font-bold text-2xl text-white">Tími: {timeLeft}s</div>
        
        <div className="grid grid-cols-10 gap-0.5 bg-slate-900 border-4 border-slate-600">
            {grid.map((hasSnow, idx) => (
                <div 
                    key={idx} 
                    className={`w-8 h-8 flex items-center justify-center transition-colors duration-300 ${hasSnow ? 'bg-white' : 'bg-slate-700'}`}
                >
                    {idx === playerPos && (
                        <div className="w-6 h-6 bg-yellow-500 rounded-sm shadow-lg border border-black animate-pulse relative">
                             {/* Plow blade */}
                             <div className="absolute -bottom-1 left-0 w-full h-2 bg-black rounded-sm"></div>
                        </div>
                    )}
                    {hasSnow && idx !== playerPos && Math.random() > 0.8 && <Snowflake size={10} className="text-blue-200 opacity-50" />}
                </div>
            ))}
        </div>
        
        <div className="mt-4 text-white text-sm">Notaðu örvatakkana til að moka snjóinn!</div>
        
        {/* D-Pad for mobile */}
        <div className="absolute bottom-4 right-4 grid grid-cols-3 gap-1 md:hidden">
            <div></div>
            <button className="bg-yellow-500 p-2 rounded" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowUp'}))}>↑</button>
            <div></div>
            <button className="bg-yellow-500 p-2 rounded" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowLeft'}))}>←</button>
            <button className="bg-yellow-500 p-2 rounded" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}))}>↓</button>
            <button className="bg-yellow-500 p-2 rounded" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowRight'}))}>→</button>
        </div>
    </div>
  );
};

export default SnowPlowGame;