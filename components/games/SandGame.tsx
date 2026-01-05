import React, { useState, useEffect } from 'react';

interface SandGameProps {
  onScore: (points: number) => void;
  onGameOver: () => void;
}

const SandGame: React.FC<SandGameProps> = ({ onScore, onGameOver }) => {
  const [rotation, setRotation] = useState(0); // 0 = Left (Sand), 180 = Right (Bin)
  const [hasSand, setHasSand] = useState(false);
  const [armHeight, setArmHeight] = useState(50); // 0 = up, 100 = down
  const [timeLeft, setTimeLeft] = useState(45);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setRotation(prev => Math.max(0, prev - 10));
      if (e.key === 'ArrowRight') setRotation(prev => Math.min(180, prev + 10));
      if (e.key === 'ArrowDown') setArmHeight(prev => Math.min(100, prev + 10));
      if (e.key === 'ArrowUp') setArmHeight(prev => Math.max(0, prev - 10));
      
      if (e.key === ' ') {
          // Action logic
          if (rotation < 20 && armHeight > 80 && !hasSand) {
              setHasSand(true); // Dig
          } else if (rotation > 160 && armHeight > 20 && hasSand) {
              setHasSand(false); // Dump
              onScore(s => s + 50);
          }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rotation, armHeight, hasSand, onScore]);

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
    <div className="relative w-full h-[400px] bg-amber-100 rounded-xl overflow-hidden border-4 border-slate-300 shadow-inner">
       <div className="absolute top-4 left-4 font-bold text-2xl text-slate-700">Tími: {timeLeft}s</div>

       {/* Sand Pile (Left) */}
       <div className="absolute bottom-0 left-0 w-32 h-24 bg-yellow-600 rounded-tr-full"></div>
       
       {/* Container (Right) */}
       <div className="absolute bottom-0 right-10 w-32 h-24 bg-red-700 border-l-4 border-r-4 border-red-900 flex items-center justify-center">
           <div className="text-white font-bold opacity-50">Gámur</div>
       </div>

       {/* Excavator Base */}
       <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-20 h-12 bg-black rounded-t-lg z-10">
          <div className="w-full h-2 bg-yellow-500 mt-2"></div>
       </div>

       {/* Rotating Cab & Arm */}
       <div 
         className="absolute bottom-16 left-1/2 w-0 h-0 transition-transform duration-200 z-20"
         style={{ transform: `rotate(${rotation - 90}deg)` }}
       >
           {/* Cab */}
           <div className="absolute -top-8 -left-8 w-16 h-16 bg-yellow-400 border-2 border-black rounded-lg shadow-xl"></div>
           
           {/* Boom */}
           <div className="absolute top-0 left-0 w-32 h-4 bg-yellow-500 border border-black origin-left transform -rotate-45">
                {/* Stick */}
                <div 
                    className="absolute right-0 top-0 w-24 h-3 bg-yellow-500 border border-black origin-right transition-transform"
                    style={{ transform: `rotate(${armHeight}deg)` }}
                >
                    {/* Bucket */}
                    <div className={`absolute left-0 -bottom-2 w-8 h-8 border-4 border-black rounded-bl-xl ${hasSand ? 'bg-yellow-600' : 'bg-transparent'}`}></div>
                </div>
           </div>
       </div>

       <div className="absolute bottom-2 w-full text-center text-slate-500 font-bold text-sm bg-white/50 py-1">
           Örvatakkar til að hreyfa • SPACE til að grafa/losa
       </div>
    </div>
  );
};

export default SandGame;