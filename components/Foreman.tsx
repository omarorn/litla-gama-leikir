import React, { useEffect, useState } from 'react';
import { GameType } from '../types';
import { getForemanCommentary, askForemanComplex } from '../services/geminiService';
import { HardHat, BrainCircuit, X } from 'lucide-react';

interface ForemanProps {
  gameType: GameType;
  score: number;
  gameState: 'idle' | 'playing' | 'gameover' | 'highscore';
}

const Foreman: React.FC<ForemanProps> = ({ gameType, score, gameState }) => {
  const [message, setMessage] = useState<string>("Velkomin! Veldu verkefni á töflunni.");
  const [loading, setLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState("");

  useEffect(() => {
    let isMounted = true;
    
    const fetchCommentary = async () => {
      if (gameType === GameType.NONE && !expanded) {
        setMessage("Velkomin! Veldu verkefni.");
        return;
      }

      setLoading(true);
      const event = gameState === 'playing' && score === 0 ? 'start' : gameState === 'gameover' ? 'end' : 'milestone';
      
      if (event === 'milestone' && score % 100 !== 0) {
          setLoading(false);
          return;
      }

      const response = await getForemanCommentary(gameType, score, event);
      if (isMounted && !expanded) {
        setMessage(response.message);
        setLoading(false);
      }
    };

    fetchCommentary();

    return () => { isMounted = false; };
  }, [gameType, gameState, score]);

  const handleComplexQuestion = async () => {
      if (!question) return;
      setIsThinking(true);
      const answer = await askForemanComplex(question);
      setMessage(answer);
      setIsThinking(false);
      setQuestion("");
  };

  return (
    <>
        <div className="fixed bottom-4 right-4 z-50 flex items-end max-w-xs md:max-w-md animate-slide-in">
        <div className={`bg-white/90 backdrop-blur-md border-4 ${isThinking ? 'border-purple-500' : 'border-yellow-500'} rounded-2xl p-4 mr-4 shadow-[0_0_20px_rgba(0,0,0,0.3)] relative mb-4 transition-all duration-300 ${loading ? 'opacity-80' : 'opacity-100'}`}>
            {expanded ? (
                <div className="w-64">
                    <div className="flex justify-between mb-2">
                        <span className="font-bold text-xs uppercase tracking-wider text-slate-500">Öryggisstjóri AI</span>
                        <button onClick={() => setExpanded(false)}><X size={16}/></button>
                    </div>
                    <p className="text-sm font-bold text-slate-800 mb-4 max-h-40 overflow-y-auto">{isThinking ? "Er að hugsa..." : message}</p>
                    <div className="flex gap-1">
                        <input className="flex-1 bg-slate-100 border rounded px-2 py-1 text-xs" placeholder="Spyrðu um öryggi..." value={question} onChange={(e) => setQuestion(e.target.value)} />
                        <button onClick={handleComplexQuestion} className="bg-purple-600 text-white p-1 rounded"><BrainCircuit size={16} /></button>
                    </div>
                </div>
            ) : (
                <p className="text-gray-800 font-bold text-sm md:text-base cursor-pointer" onClick={() => setExpanded(true)}>
                    {loading ? "..." : message}
                </p>
            )}
            
            {/* Thinking Indicator */}
            {isThinking && (
                <div className="absolute -top-3 -right-3 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center animate-spin">
                    <BrainCircuit size={12} className="text-white" />
                </div>
            )}
            <div className={`absolute -right-2 bottom-4 w-4 h-4 bg-white border-r-4 border-b-4 ${isThinking ? 'border-purple-500' : 'border-yellow-500'} transform rotate-45`}></div>
        </div>
        
        <button onClick={() => setExpanded(!expanded)} className={`${isThinking ? 'bg-purple-600' : 'bg-yellow-400'} p-3 rounded-full border-4 border-black shadow-lg hover:scale-110 transition-transform`}>
            <HardHat size={40} className="text-black" />
        </button>
        </div>
    </>
  );
};

export default Foreman;