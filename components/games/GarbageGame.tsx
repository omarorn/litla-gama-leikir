import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Recycle, Apple, Box, Ban } from 'lucide-react';

interface GarbageGameProps {
  onScore: (points: number) => void;
  onGameOver: () => void;
}

type BinType = 'plast' | 'pappi' | 'matur' | 'almennt';

interface ItemData {
  name: string;
  type: BinType;
}

interface FallingItem extends ItemData {
  id: number;
  x: number;
  y: number;
  speed: number;
}

interface Mistake {
  item: string;
  wrongBin: BinType;
  correctBin: BinType;
}

const TRASH_ITEMS: ItemData[] = [
    { name: 'G-Mjólk', type: 'pappi' },
    { name: 'Kókómjólk', type: 'pappi' },
    { name: 'Pizzakassi', type: 'pappi' },
    { name: 'Morgunkorn', type: 'pappi' },
    { name: 'Eggjabakki', type: 'pappi' },
    { name: 'SS Pylsur', type: 'plast' },
    { name: 'Skyr dós', type: 'plast' },
    { name: 'Nóa Kropp', type: 'plast' },
    { name: 'Brauðpoki', type: 'plast' },
    { name: 'Hakkbakki', type: 'plast' },
    { name: 'Bananahýði', type: 'matur' },
    { name: 'Epla skrutur', type: 'matur' },
    { name: 'Kaffikorgur', type: 'matur' },
    { name: 'Eggjaskurn', type: 'matur' },
    { name: 'Fiskbein', type: 'matur' },
    { name: 'Bleyja', type: 'almennt' },
    { name: 'Hundaskítur', type: 'almennt' },
    { name: 'Tyggjó', type: 'almennt' },
    { name: 'Ryksugupoki', type: 'almennt' },
    { name: 'Blautklútar', type: 'almennt' },
];

const GarbageGame: React.FC<GarbageGameProps> = ({ onScore, onGameOver }) => {
  const [items, setItems] = useState<FallingItem[]>([]);
  const [activeBin, setActiveBin] = useState<BinType>('almennt');
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [showReport, setShowReport] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const scoreRef = useRef(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    let lastSpawn = 0;
    
    const animate = (time: number) => {
      // Difficulty ramp up: Spawn faster as time goes on
      const elapsed = Date.now() - startTimeRef.current;
      const spawnRate = Math.max(800, 1500 - (elapsed / 1000) * 30); // Starts at 1.5s, gets faster
      const speedMultiplier = 1 + (elapsed / 30000); // Gets faster over time

      if (time - lastSpawn > spawnRate) {
        spawnItem(speedMultiplier);
        lastSpawn = time;
      }

      setItems(prevItems => {
        return prevItems.map(item => ({
          ...item,
          y: item.y + item.speed
        })).filter(item => {
           // Hit detection
           if (item.y > 85) { 
             if (item.type === activeBin) {
               scoreRef.current += 10;
               onScore(scoreRef.current);
             } else {
               scoreRef.current = Math.max(0, scoreRef.current - 5);
               onScore(scoreRef.current);
               setMistakes(m => [...m, { item: item.name, wrongBin: activeBin, correctBin: item.type }]);
             }
             return false; 
           }
           return true;
        });
      });

      if (!showReport) {
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    if (!showReport) {
        requestRef.current = requestAnimationFrame(animate);
    }

    // Timer
    const timerInterval = setInterval(() => {
      if (showReport) return;
      
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
          handleGameEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      clearInterval(timerInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBin, showReport]); 

  const handleGameEnd = () => {
      setShowReport(true);
  };

  const spawnItem = (speedMult: number) => {
    const data = TRASH_ITEMS[Math.floor(Math.random() * TRASH_ITEMS.length)];
    const id = Date.now() + Math.random();
    // Randomize X position slightly for visual variety, but keep reachable
    const x = 50; 
    setItems(prev => [...prev, { ...data, id, x, y: 0, speed: (0.4 + Math.random() * 0.4) * speedMult }]);
  };

  const getBinIcon = (type: BinType) => {
    switch (type) {
      case 'almennt': return <Trash2 className="text-gray-200 w-8 h-8" />;
      case 'plast': return <Recycle className="text-orange-200 w-8 h-8" />;
      case 'pappi': return <Box className="text-blue-200 w-8 h-8" />;
      case 'matur': return <Apple className="text-green-200 w-8 h-8" />;
    }
  };

  const getBinColor = (type: BinType) => {
      switch (type) {
          case 'almennt': return 'bg-gray-600 border-gray-800';
          case 'plast': return 'bg-orange-500 border-orange-700'; // Using orange for plastic logic usually implies packaging, though generic Recycle symbol often green. Adjusting to distinct colors.
          case 'pappi': return 'bg-blue-600 border-blue-800';
          case 'matur': return 'bg-green-600 border-green-800';
      }
  };
  
  const getBinLabel = (type: BinType) => {
      switch (type) {
          case 'almennt': return 'Almennt';
          case 'plast': return 'Plast';
          case 'pappi': return 'Pappi';
          case 'matur': return 'Matur';
      }
  };

  if (showReport) {
      return (
          <div className="w-full h-[500px] bg-white rounded-xl border-4 border-black p-6 flex flex-col items-center overflow-y-auto">
              <h2 className="text-3xl font-black mb-4 uppercase">Flokkunarskýrsla</h2>
              {mistakes.length === 0 ? (
                  <div className="text-center my-8">
                      <div className="text-6xl mb-4">🌟</div>
                      <p className="text-2xl font-bold text-green-600">Fullkomið! Engin mistök!</p>
                      <p className="text-gray-600">Þú ert flokkunarmeistari.</p>
                  </div>
              ) : (
                  <div className="w-full mb-6">
                      <p className="text-lg font-bold mb-2 text-red-600">Þú gerðir {mistakes.length} mistök. Lærum af þeim:</p>
                      <div className="bg-slate-100 rounded-lg p-2 max-h-60 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-slate-300 text-sm text-slate-500">
                                    <th className="p-2">Hlutur</th>
                                    <th className="p-2">Fór í</th>
                                    <th className="p-2">Átti að fara í</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mistakes.map((m, i) => (
                                    <tr key={i} className="border-b border-slate-200 text-sm">
                                        <td className="p-2 font-bold">{m.item}</td>
                                        <td className="p-2 text-red-500 line-through decoration-2">{getBinLabel(m.wrongBin)}</td>
                                        <td className="p-2 text-green-600 font-bold">{getBinLabel(m.correctBin)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                      </div>
                  </div>
              )}
              <button 
                onClick={onGameOver} 
                className="mt-auto bg-yellow-400 text-black font-bold text-xl px-8 py-3 rounded-full border-4 border-black hover:scale-105 transition-transform"
              >
                  Áfram
              </button>
          </div>
      );
  }

  return (
    <div className="relative w-full h-[500px] bg-slate-100 rounded-xl overflow-hidden border-4 border-slate-300 shadow-inner" ref={containerRef}>
      <div className="absolute top-4 left-4 font-bold text-2xl text-slate-700 z-10">Tími: {timeLeft}s</div>
      
      {/* Falling Items */}
      {items.map(item => (
        <div 
          key={item.id} 
          className="absolute transition-none flex flex-col items-center justify-center pointer-events-none z-0" 
          style={{ 
            left: `${item.x}%`, 
            top: `${item.y}%`, 
            transform: 'translateX(-50%)' 
          }}
        >
          <div className="bg-white px-2 py-1 rounded shadow text-xs font-bold border border-gray-200 whitespace-nowrap mb-1">
              {item.name}
          </div>
          <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center shadow-md text-xl">
             {/* Simple visual fallback based on type if no specific icon */}
             {item.type === 'matur' ? '🍎' : item.type === 'pappi' ? '📦' : item.type === 'plast' ? '🥤' : '🗑️'}
          </div>
        </div>
      ))}

      {/* Catcher / Bins */}
      <div className="absolute bottom-0 w-full h-32 bg-white border-t-4 border-slate-300 grid grid-cols-4 gap-2 px-2 py-2">
        {(['plast', 'pappi', 'matur', 'almennt'] as BinType[]).map(type => (
          <button
            key={type}
            onClick={() => setActiveBin(type)}
            className={`flex flex-col items-center justify-center rounded-xl border-b-8 transition-all active:border-b-0 active:translate-y-2 relative overflow-hidden ${getBinColor(type)} ${
              activeBin === type 
                ? 'ring-4 ring-yellow-400 -translate-y-2 shadow-xl' 
                : 'opacity-90 hover:opacity-100'
            }`}
          >
            {/* Lid effect */}
            <div className="absolute top-0 w-full h-4 bg-black/10"></div>
            
            <div className="mt-2">
                 {getBinIcon(type)}
            </div>
            <span className="uppercase text-[10px] md:text-sm font-black text-white mt-1 tracking-tighter shadow-black drop-shadow-md">
                {getBinLabel(type)}
            </span>
          </button>
        ))}
      </div>
      
      <div className="absolute top-16 w-full text-center text-slate-400 text-sm font-bold pointer-events-none opacity-50">
        Veldu rétta tunnu áður en ruslið lendir!
      </div>
    </div>
  );
};

export default GarbageGame;