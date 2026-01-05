import React, { useState } from 'react';
import { GameType } from './types';
import Foreman from './components/Foreman';
import GarbageGame from './components/games/GarbageGame';
import HookGame from './components/games/HookGame';
import SnowPlowGame from './components/games/SnowPlowGame';
import SandGame from './components/games/SandGame';
import { Truck, Shovel, Trash2, Snowflake, Play, ArrowLeft } from 'lucide-react';

export default function App() {
  const [activeGame, setActiveGame] = useState<GameType>(GameType.NONE);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');

  const startGame = (type: GameType) => {
    setActiveGame(type);
    setScore(0);
    setGameState('playing');
  };

  const handleGameOver = () => {
    setGameState('gameover');
  };

  const handleBackToMenu = () => {
    setActiveGame(GameType.NONE);
    setGameState('idle');
    setScore(0);
  };

  const renderGame = () => {
    const props = {
      onScore: setScore,
      onGameOver: handleGameOver
    };

    switch (activeGame) {
      case GameType.GARBAGE: return <GarbageGame {...props} />;
      case GameType.HOOK: return <HookGame {...props} />;
      case GameType.SNOW: return <SnowPlowGame {...props} />;
      case GameType.SAND: return <SandGame {...props} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center">
      {/* Header */}
      <header className="w-full bg-yellow-400 p-4 border-b-8 border-black construction-pattern shadow-lg z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="bg-white px-4 py-2 rounded-lg border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
             <h1 className="text-xl md:text-3xl font-extrabold text-black uppercase tracking-tighter leading-none">
               Litla Gamaleigan
               <span className="block text-sm md:text-lg text-yellow-600 font-bold">Leikjasvæði</span>
             </h1>
          </div>
          {activeGame !== GameType.NONE && (
            <div className="bg-black text-yellow-400 px-4 py-2 rounded-full font-mono text-lg md:text-xl font-bold border-2 border-white">
              STIG: {score}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl p-4 md:p-8 flex flex-col items-center justify-center">
        
        {activeGame === GameType.NONE ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full animate-fade-in">
            <GameCard 
              title="Flokkunarleikur" 
              icon={<Trash2 size={48} />} 
              color="bg-green-100 border-green-500"
              onClick={() => startGame(GameType.GARBAGE)} 
              description="Flokkaðu ruslið í réttar tunnur! G-Mjólk í pappi, dósir í plast..."
            />
            <GameCard 
              title="Krókabíll" 
              icon={<Truck size={48} />} 
              color="bg-sky-100 border-sky-500"
              onClick={() => startGame(GameType.HOOK)} 
              description="Keyrðu vörubílinn og náðu í gámana með króknum."
            />
            <GameCard 
              title="Snjómokstur" 
              icon={<Snowflake size={48} />} 
              color="bg-blue-50 border-blue-400"
              onClick={() => startGame(GameType.SNOW)} 
              description="Hreinsaðu göturnar af snjó áður en tíminn rennur út!"
            />
            <GameCard 
              title="Sandmokstur" 
              icon={<Shovel size={48} />} 
              color="bg-amber-100 border-amber-600"
              onClick={() => startGame(GameType.SAND)} 
              description="Stjórnaðu gröfunni og fylltu gáminn af sandi."
            />
          </div>
        ) : (
          <div className="w-full max-w-2xl animate-scale-in">
            <div className="flex justify-between items-center mb-4">
               <button 
                 onClick={handleBackToMenu}
                 className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-bold border-b-4 border-slate-400 active:border-b-0 active:translate-y-1 transition-all"
               >
                 <ArrowLeft size={20} /> Valmynd
               </button>
               <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase hidden md:block">
                   {activeGame === GameType.GARBAGE && "Flokkun"}
                   {activeGame === GameType.HOOK && "Krókabíll"}
                   {activeGame === GameType.SNOW && "Snjómokstur"}
                   {activeGame === GameType.SAND && "Gröfuvinna"}
               </h2>
            </div>
            
            {gameState === 'gameover' ? (
              <div className="bg-white p-8 rounded-xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] text-center">
                <h2 className="text-4xl font-black text-red-500 mb-4">VERKI LOKIÐ!</h2>
                <p className="text-2xl font-bold mb-8">Lokastig: {score}</p>
                <div className="flex flex-col md:flex-row justify-center gap-4">
                  <button onClick={() => startGame(activeGame)} className="px-8 py-3 bg-yellow-400 text-black font-bold text-xl rounded-lg border-4 border-black hover:scale-105 transition-transform flex items-center justify-center gap-2">
                    <Play size={24} fill="black" /> Spila aftur
                  </button>
                  <button onClick={handleBackToMenu} className="px-8 py-3 bg-slate-200 text-slate-700 font-bold text-xl rounded-lg border-4 border-slate-400 hover:bg-slate-300 transition-colors">
                    Aftur í valmynd
                  </button>
                </div>
              </div>
            ) : (
              renderGame()
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full bg-slate-800 text-slate-400 p-4 text-center text-sm">
        <p>© 2024 Litla Gamaleigan Leikjasvæði. Við byggjum framtíðina!</p>
      </footer>

      {/* Foreman AI Helper */}
      <Foreman gameType={activeGame} score={score} gameState={gameState} />
    </div>
  );
}

// Subcomponent for Menu Cards
const GameCard = ({ title, icon, color, onClick, description }: { title: string, icon: React.ReactNode, color: string, onClick: () => void, description: string }) => (
  <button 
    onClick={onClick}
    className={`relative group p-6 rounded-2xl border-4 shadow-md hover:shadow-xl transition-all hover:-translate-y-1 text-left ${color}`}
  >
    <div className="flex justify-between items-start mb-4">
       <div className="p-3 bg-white rounded-xl border-2 border-black/10 group-hover:scale-110 transition-transform duration-300">
         {icon}
       </div>
       <div className="bg-black/10 p-2 rounded-full">
         <Play size={20} className="opacity-50 group-hover:opacity-100" />
       </div>
    </div>
    <h3 className="text-2xl font-extrabold text-slate-800 mb-2">{title}</h3>
    <p className="text-slate-600 font-medium leading-tight">{description}</p>
  </button>
);