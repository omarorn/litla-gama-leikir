import React, { useEffect, useState } from 'react';
import { GameType } from '../types';
import { getForemanCommentary, askForemanComplex } from '../services/geminiService';
import { HardHat, BrainCircuit, X, MessageSquareOff, Minimize2 } from 'lucide-react';

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
  const [minimizedBubble, setMinimizedBubble] = useState(false);
  const [question, setQuestion] = useState("");

  useEffect(() => {
    let isMounted = true;
    
    const fetchCommentary = async () => {
      // Reset minimization on new important events
      if (gameState === 'gameover' || (gameState === 'playing' && score === 0)) {
          setMinimizedBubble(false);
      }

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
        <div className="fixed bottom-4 right-4 z-50 flex items-end flex-col md:flex-row md:items-end max-w-[200px] md:max-w-md animate-slide-in pointer-events-none">
            
            {/* The Chat/Message Bubble */}
            {(expanded || (!minimizedBubble && message)) && (
                <div className={`pointer-events-auto bg-white/95 backdrop-blur-md border-2 ${isThinking ? 'border-purple-500' : 'border-yellow-500'} rounded-2xl p-4 mb-16 md:mb-0 md:mr-4 shadow-[0_0_20px_rgba(0,0,0,0.3)] relative transition-all duration-300 ${loading ? 'opacity-80' : 'opacity-100'}`}>
                    {expanded ? (
                        <div className="w-64 pointer-events-auto">
                            <div className="flex justify-between mb-2 border-b border-slate-100 pb-2">
                                <span className="font-bold text-xs uppercase tracking-wider text-slate-500">Öryggisstjóri AI</span>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => { setExpanded(false); setMinimizedBubble(true); }} 
                                        className="hover:bg-slate-100 rounded p-1 text-slate-400 hover:text-red-500"
                                        title="Fela alveg"
                                    >
                                        <Minimize2 size={16}/>
                                    </button>
                                    <button 
                                        onClick={() => setExpanded(false)} 
                                        className="hover:bg-slate-100 rounded p-1 text-slate-600"
                                        title="Loka glugga"
                                    >
                                        <X size={16}/>
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm font-bold text-slate-800 mb-4 max-h-40 overflow-y-auto">{isThinking ? "Er að hugsa..." : message}</p>
                            <div className="flex gap-1">
                                <input className="flex-1 bg-slate-100 border rounded px-2 py-1 text-xs" placeholder="Spyrðu um öryggi..." value={question} onChange={(e) => setQuestion(e.target.value)} />
                                <button onClick={handleComplexQuestion} className="bg-purple-600 text-white p-1 rounded"><BrainCircuit size={16} /></button>
                            </div>
                        </div>
                    ) : (
                        <div className="relative pr-6 pointer-events-auto">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setMinimizedBubble(true); }} 
                                className="absolute -top-4 -right-4 bg-white text-slate-400 hover:text-red-500 p-1.5 rounded-full shadow border border-slate-200"
                                title="Fela skilaboð"
                            >
                                <X size={14} />
                            </button>
                            <p className="text-gray-800 font-bold text-xs md:text-sm cursor-pointer hover:underline" onClick={() => setExpanded(true)}>
                                {loading ? "..." : message}
                            </p>
                        </div>
                    )}
                    
                    {/* Thinking Indicator */}
                    {isThinking && (
                        <div className="absolute -top-3 -right-3 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center animate-spin">
                            <BrainCircuit size={12} className="text-white" />
                        </div>
                    )}
                    
                    {/* Speech Triangle */}
                    <div className={`hidden md:block absolute -right-2 bottom-4 w-4 h-4 bg-white border-r-2 border-b-2 ${isThinking ? 'border-purple-500' : 'border-yellow-500'} transform rotate-45`}></div>
                </div>
            )}
            
            {/* The Main Icon Button */}
            <div className="pointer-events-auto absolute bottom-0 right-0">
                <button 
                    onClick={() => {
                        if (minimizedBubble && !expanded) {
                            setMinimizedBubble(false);
                        } else {
                            setExpanded(!expanded);
                        }
                    }} 
                    className={`${isThinking ? 'bg-purple-600' : 'bg-yellow-400'} p-3 rounded-full border-2 border-black shadow-lg hover:scale-110 transition-transform active:scale-95`}
                >
                    {minimizedBubble && !expanded ? <MessageSquareOff size={24} className="text-black opacity-50"/> : <HardHat size={28} className="text-black" />}
                </button>
            </div>
        </div>
    </>
  );
};

export default Foreman;