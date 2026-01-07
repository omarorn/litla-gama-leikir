
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
import AIAssistant from './components/AIAssistant';
import HighScoreCamera from './components/HighScoreCamera';
import GameWheel from './components/GameWheel';
import { Play, ArrowLeft, Grip, ExternalLink } from 'lucide-react';
import { audio } from './services/audioService';

export enum ExtendedGameType {
    ASSISTANT = 'ASSISTANT'
}

export default function App() {
  const [activeGame, setActiveGame] = useState<GameType | ExtendedGameType>(GameType.NONE); 
  const [score, setScore] = useState(0);
  const [highScores, setHighScores] = useState<Record<string, number>>({});
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'highscore'>('idle');
  
  const [isNight, setIsNight] = useState(false);
  const [isWinter, setIsWinter] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('lg-highscores');
    if (saved) setHighScores(JSON.parse(saved));

    const updateTime = () => {
      const now = new Date();
      setIsNight(now.getHours() < 7 || now.getHours() >= 20);
      setIsWinter(now.getMonth() >= 9 || now.getMonth() <= 3);
    };

    updateTime();
  }, []);

  const startGame = (type: GameType | ExtendedGameType) => {
    setActiveGame(type);
    setScore(0);
    setGameState('playing');
    audio.playClick();
  };

  const handleGameOver = () => {
    if (activeGame in GameType) {
        const currentHigh = highScores[activeGame as string] || 0;
        if (score > currentHigh) {
            const newHighScores = { ...highScores, [activeGame as string]: score };
            setHighScores(newHighScores);
            localStorage.setItem('lg-highscores', JSON.stringify(newHighScores));
            
            // Trigger High Score Camera Flow
            setGameState('highscore');
            audio.playWin();
            return;
        }
    }
    setGameState('gameover');
  };

  const handleHighScoreComplete = () => {
      setGameState('gameover');
  };

  const handleBackToMenu = () => {
    setActiveGame(GameType.NONE); 
    setGameState('idle');
    setScore(0);
    audio.playClick();
  };

  const GAME_LIST = [
      { id: GameType.GARBAGE, name: "Flokkunarvél", icon: "♻️" },
      { id: GameType.HOOK, name: "Krókabíll", icon: "🚛" },
      { id: GameType.SNOW, name: "Snjómokstur", icon: "❄️" },
      { id: GameType.SAND, name: "Gröfuvinna", icon: "🚜" },
      { id: GameType.SCANNER, name: "AI Skanni", icon: "👁️" },
      { id: ExtendedGameType.ASSISTANT, name: "AI Aðstoð", icon: "✨" },
      { id: GameType.MAPS, name: "Kortasjá", icon: "🗺️" },
      { id: GameType.GEAR, name: "Græjustöð", icon: "⚡" },
  ];

  const accentColor = isWinter ? 'text-cyan-400' : 'text-yellow-500';
  const borderColor = isWinter ? 'border-cyan-500' : 'border-yellow-500';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center font-sans overflow-x-hidden">
      <header className={`w-full bg-slate-950/80 border-b ${borderColor} p-4 sticky top-0 z-20 backdrop-blur-md`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 cursor-pointer group" onClick={handleBackToMenu}>
                 <div className={`${isWinter ? 'bg-cyan-600' : 'bg-yellow-500'} p-2 rounded-sm skew-x-[-10deg]`}>
                     <Grip className="text-black skew-x-[10deg]" />
                 </div>
                 <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest hidden md:block">Litla Gamaleigan</h1>
                 <h1 className="text-xl font-black uppercase tracking-widest md:hidden">LG Arcade</h1>
              </div>
              <a href="https://litla.gamaleigan.is" className="flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase text-slate-400 hover:text-white transition-colors bg-slate-800 px-3 py-1 rounded-full border border-slate-700 hover:border-slate-500">
                  <ExternalLink size={12} /> <span className="hidden sm:inline">litla.gamaleigan.is</span><span className="sm:hidden">Vefur</span>
              </a>
          </div>
          <div className="flex items-center gap-4">
              {gameState === 'playing' && (
                <div className={`bg-slate-800 px-6 py-2 rounded border ${borderColor}`}>
                  <span className={`${accentColor} font-mono text-xl font-bold`}>STIG: {score.toString().padStart(4, '0')}</span>
                </div>
              )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl p-6 flex flex-col items-center justify-center z-10">
        {activeGame === GameType.NONE ? (
             <div className="w-full flex flex-col items-center animate-fade-in py-10">
                 
                 {/* GAME WHEEL */}
                 <div className="mb-12 transform scale-75 md:scale-100">
                     <GameWheel onGameSelected={startGame} isWinter={isWinter} />
                 </div>

                 <h2 className="text-3xl font-black text-center mb-12 uppercase tracking-widest">Veldu verkefni dagsins</h2>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl">
                     {GAME_LIST.map((game) => (
                         <button 
                            key={game.id}
                            onClick={() => startGame(game.id as any)}
                            className="bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-slate-500 p-6 rounded-2xl flex flex-col items-center gap-3 transition-all transform hover:-translate-y-1 shadow-xl"
                         >
                             <span className="text-5xl">{game.icon}</span>
                             <span className="text-xs font-black uppercase tracking-widest text-slate-300">{game.name}</span>
                         </button>
                     ))}
                 </div>
             </div>
        ) : (
          <div className="w-full max-w-4xl animate-scale-in">
                <div className="mb-4">
                    <button onClick={handleBackToMenu} className="flex items-center gap-2 text-slate-400 hover:text-white uppercase font-bold text-xs">
                        <ArrowLeft size={16} /> Til baka í valmynd
                    </button>
                </div>
                
                {activeGame === GameType.GARBAGE && <GarbageGame onScore={setScore} onGameOver={handleGameOver} />}
                {activeGame === GameType.HOOK && <HookGame onScore={setScore} onGameOver={handleGameOver} />}
                {activeGame === GameType.SNOW && <SnowPlowGame onScore={setScore} onGameOver={handleGameOver} />}
                {activeGame === GameType.SAND && <SandGame onScore={setScore} onGameOver={handleGameOver} />}
                {activeGame === GameType.SCANNER && <TrashScanner onBack={handleBackToMenu} isWinter={isWinter} />}
                {activeGame === GameType.GEAR && <GearStation onBack={handleBackToMenu} />}
                {activeGame === GameType.MAPS && <MapOps onBack={handleBackToMenu} />}
                {activeGame === ExtendedGameType.ASSISTANT && <AIAssistant onBack={handleBackToMenu} />}

             {gameState === 'highscore' && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md z-50 rounded-xl">
                     <HighScoreCamera onComplete={handleHighScoreComplete} />
                 </div>
             )}

             {gameState === 'gameover' && !['SCANNER', 'GEAR', 'MAPS', 'ASSISTANT'].includes(activeGame as string) && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 rounded-xl">
                     <div className={`bg-slate-900 border-2 ${borderColor} p-10 rounded-2xl text-center shadow-2xl`}>
                        <h2 className="text-4xl font-black text-white uppercase mb-4">Verki lokið</h2>
                        <div className={`${accentColor} font-mono text-4xl font-bold mb-8`}>{score} STIG</div>
                        <div className="flex gap-4">
                            <button onClick={() => startGame(activeGame)} className="bg-yellow-500 text-black px-8 py-4 rounded-xl font-bold flex items-center gap-2">
                                <Play size={20} fill="black" /> Reyna aftur
                            </button>
                            <button onClick={handleBackToMenu} className="bg-slate-700 text-white px-8 py-4 rounded-xl font-bold">Loka</button>
                        </div>
                     </div>
                 </div>
             )}
          </div>
        )}
      </main>
      <Foreman gameType={activeGame as GameType} score={score} gameState={gameState} />
    </div>
  );
}
