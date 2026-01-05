import React, { useState, useEffect } from 'react';
import { GameType } from './types';
import Foreman from './components/Foreman';
import GarbageGame from './components/games/GarbageGame';
import HookGame from './components/games/HookGame';
import SnowPlowGame from './components/games/SnowPlowGame';
import SandGame from './components/games/SandGame';
import GearStation from './components/GearStation';
import TrashScanner from './components/TrashScanner';
import MapOps from './components/MapOps';
import GameWheel from './components/GameWheel';
import { Play, ArrowLeft, Grip, ThermometerSnowflake, Sun, Moon, Zap, Activity, Scan, Map as MapIcon, ExternalLink } from 'lucide-react';
import { audio } from './services/audioService';

export default function App() {
  const [activeGame, setActiveGame] = useState<GameType>(GameType.NONE); 
  const [score, setScore] = useState(0);
  const [highScores, setHighScores] = useState<Record<string, number>>({});
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'highscore'>('idle');
  
  // Seasonal & Time State
  const [isNight, setIsNight] = useState(false);
  const [isWinter, setIsWinter] = useState(false);
  const [timeString, setTimeString] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem('lg-highscores');
    if (saved) setHighScores(JSON.parse(saved));

    // Time/Season Logic
    const updateTime = () => {
      const now = new Date();
      const hour = now.getHours();
      const month = now.getMonth(); // 0-11
      
      setIsNight(hour < 7 || hour >= 20);
      setIsWinter(month >= 9 || month <= 3); // Oct - April
      setTimeString(now.toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit' }));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const startGame = (type: GameType) => {
    if (type === GameType.NONE) return;
    setActiveGame(type);
    setScore(0);
    setGameState('playing');
    audio.playClick();
  };

  const handleGameOver = () => {
    const currentHigh = highScores[activeGame] || 0;
    if (score > currentHigh) {
        const newHighScores = { ...highScores, [activeGame]: score };
        setHighScores(newHighScores);
        localStorage.setItem('lg-highscores', JSON.stringify(newHighScores));
    }
    setGameState('gameover');
  };

  const handleBackToMenu = () => {
    setActiveGame(GameType.NONE); 
    setGameState('idle');
    setScore(0);
    audio.playClick();
  };

  // Dynamic Theme Colors
  const accentColor = isWinter ? 'text-cyan-400' : 'text-yellow-500';
  const borderColor = isWinter ? 'border-cyan-500' : 'border-yellow-500';
  const glowShadow = isWinter ? 'shadow-[0_0_20px_rgba(34,211,238,0.2)]' : 'shadow-[0_0_20px_rgba(234,179,8,0.2)]';
  const bgGradient = isNight 
    ? 'bg-slate-950' 
    : isWinter ? 'bg-slate-900' : 'bg-slate-900';

  return (
    <div className={`min-h-screen ${bgGradient} text-slate-100 flex flex-col items-center font-sans selection:bg-yellow-500 selection:text-black transition-colors duration-1000 overflow-x-hidden`}>
      
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      {/* Header */}
      <header className={`w-full bg-slate-950/80 border-b ${isNight ? 'border-slate-800' : borderColor} p-4 sticky top-0 z-20 shadow-2xl backdrop-blur-md transition-colors duration-500`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          
          <div className="flex items-center gap-3 cursor-pointer group" onClick={handleBackToMenu}>
             <div className={`${isWinter ? 'bg-cyan-600' : 'bg-yellow-500'} p-2 rounded-sm skew-x-[-10deg] group-hover:scale-110 transition-transform`}>
                 <Grip className="text-black skew-x-[10deg]" />
             </div>
             <div>
                 <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest leading-none text-white group-hover:text-slate-300 transition-colors">
                   Litla Gamaleigan
                 </h1>
                 <span className={`text-[10px] md:text-xs ${accentColor} font-mono tracking-[0.3em]`}>
                     {isWinter ? 'VETRARÞJÓNUSTA' : 'LEIKJAVÉL'} // {new Date().getFullYear()}
                 </span>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
              <a 
                href="https://litla.gamaleigan.is" 
                className="hidden md:flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors"
                target="_blank"
                rel="noreferrer"
              >
                  <ExternalLink size={12} /> Hringdu í okkur
              </a>

              <div 
                className={`hidden md:flex items-center gap-2 px-4 py-1 rounded bg-slate-900 border border-slate-700 ${isWinter ? 'hover:border-cyan-500' : 'hover:border-yellow-500'} transition-all`}
              >
                  {isWinter ? <ThermometerSnowflake size={16} className="text-cyan-400" /> : <Sun size={16} className="text-yellow-500" />}
                  <span className="font-mono text-xs text-slate-400">{timeString}</span>
                  {isNight && <Moon size={12} className="text-purple-400 ml-1" />}
              </div>

              {gameState === 'playing' && (
                <div className={`bg-slate-800 px-6 py-2 rounded border ${borderColor} ${glowShadow}`}>
                  <span className={`${accentColor} font-mono text-xl font-bold`}>STIG: {score.toString().padStart(4, '0')}</span>
                </div>
              )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl p-4 md:p-6 flex flex-col items-center justify-center relative z-10">
        
        {/* LANDING: THE WHEEL */}
        {activeGame === GameType.NONE ? (
             <div className="w-full h-full flex flex-col items-center animate-fade-in py-10 relative">
                 
                 <h2 className="text-2xl md:text-4xl font-black text-center mb-8 uppercase tracking-widest text-white drop-shadow-xl">
                    Snúðu hjólinu <br/>
                    <span className={`text-base md:text-xl ${accentColor}`}>til að velja verkefni</span>
                 </h2>

                 <div className="relative mb-12">
                    <GameWheel onGameSelected={startGame} isWinter={isWinter} />
                 </div>

                 {/* Hidden Tools around the 'Room' */}
                 <div className="absolute bottom-0 w-full flex justify-between px-8 text-slate-600">
                      {/* Left: Scanner */}
                      <button 
                        onClick={() => startGame(GameType.SCANNER)} 
                        className="group flex flex-col items-center gap-2 hover:text-white transition-colors"
                        title="Scanner Tool"
                      >
                          <Scan size={24} className="group-hover:text-yellow-400 transition-colors" />
                          <span className="text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity">SKANNI</span>
                      </button>

                      {/* Center: Gear */}
                      <button 
                        onClick={() => startGame(GameType.GEAR)} 
                        className="group flex flex-col items-center gap-2 hover:text-white transition-colors translate-y-4"
                        title="Gear Station"
                      >
                          <Zap size={24} className="group-hover:text-purple-400 transition-colors" />
                          <span className="text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity">GRÆJUR</span>
                      </button>

                      {/* Right: Maps */}
                      <button 
                        onClick={() => startGame(GameType.MAPS)} 
                        className="group flex flex-col items-center gap-2 hover:text-white transition-colors"
                        title="Map Ops"
                      >
                          <MapIcon size={24} className="group-hover:text-blue-400 transition-colors" />
                          <span className="text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity">KORT</span>
                      </button>
                 </div>

             </div>
        ) : (
          <div className="w-full max-w-3xl z-10 animate-scale-in">
             {/* Game Overlay */}
             <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700 rounded-xl p-1 mb-6 shadow-2xl">
                <div className="bg-slate-950 rounded-lg p-4 flex justify-between items-center mb-1">
                     <button onClick={handleBackToMenu} className="flex items-center gap-2 text-slate-400 hover:text-white uppercase font-bold text-xs tracking-widest transition-colors">
                         <ArrowLeft size={16} /> Til baka
                     </button>
                     <span className={`${accentColor} font-mono text-xs animate-pulse`}>
                         <Activity size={12} className="inline mr-1" />
                         VIRKT
                     </span>
                </div>
                
                {activeGame === GameType.GARBAGE && <GarbageGame onScore={setScore} onGameOver={handleGameOver} />}
                {activeGame === GameType.HOOK && <HookGame onScore={setScore} onGameOver={handleGameOver} />}
                {activeGame === GameType.SNOW && <SnowPlowGame onScore={setScore} onGameOver={handleGameOver} />}
                {activeGame === GameType.SAND && <SandGame onScore={setScore} onGameOver={handleGameOver} />}
                
                {/* AI Tools */}
                {activeGame === GameType.SCANNER && <TrashScanner onBack={handleBackToMenu} isWinter={isWinter} />}
                {activeGame === GameType.GEAR && <GearStation onBack={handleBackToMenu} />}
                {activeGame === GameType.MAPS && <MapOps onBack={handleBackToMenu} />}
             </div>

             {gameState === 'gameover' && !['GEAR', 'MAPS', 'SCANNER'].includes(activeGame) && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm z-50 animate-fade-in rounded-xl">
                     <div className={`bg-slate-900 border-2 ${borderColor} p-8 rounded-2xl text-center max-w-sm ${glowShadow}`}>
                        <h2 className="text-4xl font-black text-white italic uppercase mb-2">Verki Lokið</h2>
                        <div className={`${accentColor} font-mono text-3xl font-bold mb-6`}>{score.toString().padStart(4, '0')} PTS</div>
                        <div className="flex gap-4 justify-center">
                            <button onClick={() => startGame(activeGame)} className={`${isWinter ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-yellow-500 hover:bg-yellow-400'} text-black px-6 py-3 rounded font-bold flex items-center gap-2`}>
                                <Play size={20} fill="black" /> Aftur
                            </button>
                            <button onClick={handleBackToMenu} className="bg-slate-700 text-white px-6 py-3 rounded font-bold hover:bg-slate-600">
                                Valmynd
                            </button>
                        </div>
                     </div>
                 </div>
             )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full p-6 text-center z-10">
         <p className="text-slate-600 text-xs font-mono">
             © 2025 Litla Gamaleigan. <a href="https://litla.gamaleigan.is" className="hover:text-white">Heimsæktu okkur.</a>
         </p>
      </footer>

      <Foreman gameType={activeGame} score={score} gameState={gameState} />
    </div>
  );
}