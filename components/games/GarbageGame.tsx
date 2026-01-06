import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Recycle, Apple, Box, Star, MousePointer2 } from 'lucide-react';
import { audio } from '../../services/audioService';

interface GarbageGameProps {
  onScore: React.Dispatch<React.SetStateAction<number>>;
  onGameOver: () => void;
}

type BinType = 'plast' | 'pappi' | 'matur' | 'almennt';

interface ItemData {
  name: string;
  type: BinType;
  image: string;
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

// Using Placehold.co with specific brand colors to simulate real Icelandic products
const TRASH_ITEMS: ItemData[] = [
    // Pappi
    { name: 'G-Mjólk', type: 'pappi', image: 'https://placehold.co/100x100/0054a6/ffffff?text=G-Mjólk' },
    { name: 'Kókómjólk', type: 'pappi', image: 'https://placehold.co/100x100/5e3a18/facc15?text=Kókó' },
    { name: 'Pizzakassi', type: 'pappi', image: 'https://placehold.co/100x100/854d0e/ffffff?text=Pizza' },
    { name: 'Morgunkorn', type: 'pappi', image: 'https://placehold.co/100x100/d97706/ffffff?text=Cheerios' },
    { name: 'Eggjabakki', type: 'pappi', image: 'https://placehold.co/100x100/a8a29e/ffffff?text=Egg' },
    
    // Plast
    { name: 'SS Pylsur', type: 'plast', image: 'https://placehold.co/100x100/1e3a8a/facc15?text=SS+Pylsur' },
    { name: 'Skyr dós', type: 'plast', image: 'https://placehold.co/100x100/0ea5e9/ffffff?text=Skyr' },
    { name: 'Nóa Kropp', type: 'plast', image: 'https://placehold.co/100x100/facc15/713f12?text=Kropp' },
    { name: 'Brauðpoki', type: 'plast', image: 'https://placehold.co/100x100/ef4444/ffffff?text=Bónus' },
    { name: 'Hakkbakki', type: 'plast', image: 'https://placehold.co/100x100/000000/ffffff?text=Kjöt' },
    
    // Matur
    { name: 'Bananahýði', type: 'matur', image: 'https://placehold.co/100x100/fde047/000000?text=Banana' },
    { name: 'Epla skrutur', type: 'matur', image: 'https://placehold.co/100x100/84cc16/ffffff?text=Epli' },
    { name: 'Kaffikorgur', type: 'matur', image: 'https://placehold.co/100x100/451a03/ffffff?text=Kaffi' },
    { name: 'Eggjaskurn', type: 'matur', image: 'https://placehold.co/100x100/fff7ed/000000?text=Skurn' },
    { name: 'Fiskbein', type: 'matur', image: 'https://placehold.co/100x100/94a3b8/ffffff?text=Bein' },
    
    // Almennt
    { name: 'Bleyja', type: 'almennt', image: 'https://placehold.co/100x100/ec4899/ffffff?text=Bleyja' },
    { name: 'Hundaskítur', type: 'almennt', image: 'https://placehold.co/100x100/3f2c22/ffffff?text=💩' },
    { name: 'Tyggjó', type: 'almennt', image: 'https://placehold.co/100x100/f472b6/ffffff?text=Tyggjó' },
    { name: 'Ryksugupoki', type: 'almennt', image: 'https://placehold.co/100x100/64748b/ffffff?text=Ryk' },
    { name: 'Blautklútar', type: 'almennt', image: 'https://placehold.co/100x100/38bdf8/ffffff?text=Klútar' },
];

const SHIFTS = [
    { name: "Morgunvakt", quota: 10, speedMod: 1.0, bg: "bg-sky-100" },
    { name: "Eftirmiðdagur", quota: 15, speedMod: 1.3, bg: "bg-orange-50" },
    { name: "Næturvakt", quota: 25, speedMod: 1.7, bg: "bg-slate-800" },
    { name: "Helgarvakt", quota: 40, speedMod: 2.2, bg: "bg-purple-900" }
];

const GarbageGame: React.FC<GarbageGameProps> = ({ onScore, onGameOver }) => {
  const [items, setItems] = useState<FallingItem[]>([]);
  const [activeBin, setActiveBin] = useState<BinType>('almennt');
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [showReport, setShowReport] = useState(false);
  
  // Progression
  const [level, setLevel] = useState(0);
  const [shiftProgress, setShiftProgress] = useState(0);
  const [combo, setCombo] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const [showLevelMsg, setShowLevelMsg] = useState(false);

  const currentShift = SHIFTS[level] || SHIFTS[SHIFTS.length - 1];

  const handleBinSelect = (type: BinType) => {
    setActiveBin(type);
    audio.playClick();
  };

  const spawnItem = (speedMult: number) => {
    const data = TRASH_ITEMS[Math.floor(Math.random() * TRASH_ITEMS.length)];
    const id = Date.now() + Math.random();
    // Items always spawn center
    setItems(prev => [...prev, { 
        ...data, 
        id, 
        x: 50, 
        y: 0, 
        speed: (0.3 + Math.random() * 0.3) * speedMult 
    }]);
  };

  // Level Up Logic
  useEffect(() => {
      if (shiftProgress >= currentShift.quota) {
          if (level < SHIFTS.length - 1) {
              audio.playWin();
              setLevel(l => l + 1);
              setShiftProgress(0);
              setItems([]); // Clear screen
              setShowLevelMsg(true);
              setTimeout(() => setShowLevelMsg(false), 2000);
          } else {
              // Endless mode on last level
          }
      }
  }, [shiftProgress, currentShift.quota, level]);

  useEffect(() => {
    let lastSpawn = 0;
    
    const animate = (time: number) => {
      const elapsed = Date.now() - startTimeRef.current;
      
      // Spawn Rate logic based on Level
      const baseSpawnRate = Math.max(500, 1500 - (level * 350)); 
      const speedMultiplier = currentShift.speedMod + (elapsed / 60000);

      if (time - lastSpawn > baseSpawnRate) {
        spawnItem(speedMultiplier);
        lastSpawn = time;
      }

      setItems(prevItems => {
        return prevItems.map(item => ({
          ...item,
          y: item.y + item.speed
        })).filter(item => {
           // Hit detection zone
           if (item.y > 82) { 
             if (item.type === activeBin) {
               // SUCCESS
               const points = 10 + (combo * 2);
               scoreRef.current += points;
               onScore(scoreRef.current);
               setShiftProgress(p => p + 1);
               setCombo(c => Math.min(10, c + 1)); // Cap combo
               audio.playTrashCorrect(); // NEW CUSTOM SOUND
             } else {
               // FAIL
               scoreRef.current = Math.max(0, scoreRef.current - 5);
               onScore(scoreRef.current);
               setMistakes(m => [...m, { item: item.name, wrongBin: activeBin, correctBin: item.type }]);
               setCombo(0); // Reset combo
               audio.playTrashWrong(); // NEW CUSTOM SOUND
             }
             return false; 
           }
           return true;
        });
      });

      if (!showReport && !showLevelMsg) {
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    if (!showReport && !showLevelMsg) {
        requestRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [activeBin, showReport, currentShift, level, combo, showLevelMsg, onScore]); 

  // Game Timer (Global)
  useEffect(() => {
      const timeout = setTimeout(() => {
          setShowReport(true);
          audio.playWin();
      }, 60000); // 1 minute fixed game loop
      return () => clearTimeout(timeout);
  }, []);

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
          case 'plast': return 'bg-orange-500 border-orange-700'; 
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
              <h2 className="text-3xl font-black mb-4 uppercase">Vaktaskýrsla</h2>
              {mistakes.length === 0 ? (
                  <div className="text-center my-8">
                      <div className="text-6xl mb-4">🌟</div>
                      <p className="text-2xl font-bold text-green-600">Fullkomið!</p>
                  </div>
              ) : (
                  <div className="w-full mb-6">
                      <p className="text-lg font-bold mb-2 text-red-600">Mistök: {mistakes.length}</p>
                      <div className="bg-slate-100 rounded-lg p-2 max-h-60 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-slate-300 text-sm text-slate-500">
                                    <th className="p-2">Hlutur</th>
                                    <th className="p-2">Fór í</th>
                                    <th className="p-2">Rétt</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mistakes.map((m, i) => (
                                    <tr key={i} className="border-b border-slate-200 text-sm">
                                        <td className="p-2 font-bold">{m.item}</td>
                                        <td className="p-2 text-red-500 line-through">{getBinLabel(m.wrongBin)}</td>
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
                  Loka Vakt
              </button>
          </div>
      );
  }

  return (
    <div className={`relative w-full h-[500px] ${currentShift.bg} transition-colors duration-1000 rounded-xl overflow-hidden border-4 border-slate-300 shadow-inner`} ref={containerRef}>
      
      {/* HUD */}
      <div className="absolute top-4 left-0 w-full px-4 flex justify-between items-start z-20 pointer-events-none">
          <div className="bg-white/80 backdrop-blur rounded-lg p-2 shadow border border-slate-200">
             <div className="text-xs font-bold uppercase text-slate-500">Vaktin</div>
             <div className="text-lg font-black text-slate-800">{currentShift.name}</div>
             <div className="text-xs text-blue-600 font-mono mt-1">
                 Markmið: {shiftProgress}/{currentShift.quota}
             </div>
             <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1">
                 <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (shiftProgress/currentShift.quota)*100)}%` }}></div>
             </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {combo > 1 && (
                <div className="bg-yellow-400 text-black px-3 py-1 rounded-full font-black animate-bounce shadow-lg border-2 border-white">
                    {combo}x COMBO!
                </div>
            )}
          </div>
      </div>
      
      {/* Level Up Flash */}
      {showLevelMsg && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
              <div className="text-center transform scale-125">
                  <Star size={64} className="text-yellow-400 mx-auto animate-spin-slow mb-4" fill="currentColor" />
                  <h2 className="text-4xl font-black text-white uppercase drop-shadow-lg">Næsta Vakt!</h2>
                  <p className="text-yellow-200 font-bold">Hraðinn eykst...</p>
              </div>
          </div>
      )}

      {/* Conveyor Belt Visual */}
      <div className="absolute top-0 bottom-32 left-1/2 -translate-x-1/2 w-32 bg-slate-800/20 border-x-2 border-slate-400/30">
          <div className="w-full h-full bg-[repeating-linear-gradient(0deg,transparent,transparent_19px,#00000010_20px)] animate-scroll"></div>
      </div>
      
      {/* Falling Items - NOW WITH IMAGES */}
      {items.map(item => (
        <div 
          key={item.id} 
          className="absolute transition-none flex flex-col items-center justify-center pointer-events-none z-10" 
          style={{ 
            left: `${item.x}%`, 
            top: `${item.y}%`, 
            transform: 'translateX(-50%)' 
          }}
        >
          <div className="bg-white px-2 py-0.5 rounded shadow-sm text-[9px] font-bold border border-gray-200 whitespace-nowrap mb-1 opacity-80">
              {item.name}
          </div>
          <div className="w-16 h-16 rounded-lg flex items-center justify-center filter drop-shadow-lg transform hover:scale-110 transition-transform">
             <img src={item.image} alt={item.name} className="w-full h-full object-contain rounded-md" />
          </div>
        </div>
      ))}

      {/* Drop Zone Indicator */}
      <div className="absolute bottom-32 w-full h-1 bg-red-500/30 z-0"></div>

      {/* Bins */}
      <div className="absolute bottom-0 w-full h-32 bg-white border-t-4 border-slate-300 grid grid-cols-4 gap-2 px-2 py-2 z-20">
        {(['plast', 'pappi', 'matur', 'almennt'] as BinType[]).map(type => (
          <button
            key={type}
            onClick={() => handleBinSelect(type)}
            className={`flex flex-col items-center justify-center rounded-xl border-b-8 transition-all active:border-b-0 active:translate-y-2 relative overflow-hidden ${getBinColor(type)} ${
              activeBin === type 
                ? 'ring-4 ring-yellow-400 -translate-y-2 shadow-xl brightness-110' 
                : 'opacity-90 hover:opacity-100 grayscale-[0.3] hover:grayscale-0'
            }`}
          >
            <div className="absolute top-0 w-full h-4 bg-black/10"></div>
            <div className="mt-2 scale-110">
                 {getBinIcon(type)}
            </div>
            <span className="uppercase text-[10px] md:text-xs font-black text-white mt-1 tracking-tighter shadow-black drop-shadow-md">
                {getBinLabel(type)}
            </span>
            {activeBin === type && (
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            )}
          </button>
        ))}
      </div>
      
      {/* Instructions Overlay */}
      <div className="absolute top-24 right-4 bg-white/80 backdrop-blur p-2 rounded-lg border border-slate-200 shadow-lg pointer-events-none opacity-50 z-0">
           <div className="flex flex-col items-center text-xs text-slate-500 font-bold uppercase">
               <MousePointer2 size={16} className="mb-1" />
               <span>Smelltu</span>
           </div>
      </div>

    </div>
  );
};

export default GarbageGame;