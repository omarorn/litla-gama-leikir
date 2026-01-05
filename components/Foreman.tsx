import React, { useEffect, useState } from 'react';
import { GameType } from '../types';
import { getForemanCommentary } from '../services/geminiService';
import { HardHat } from 'lucide-react';

interface ForemanProps {
  gameType: GameType;
  score: number;
  gameState: 'idle' | 'playing' | 'gameover';
}

const Foreman: React.FC<ForemanProps> = ({ gameType, score, gameState }) => {
  const [message, setMessage] = useState<string>("Velkomin! Veldu verkefni til að byrja.");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const fetchCommentary = async () => {
      if (gameType === GameType.NONE) {
        setMessage("Velkomin! Veldu verkefni af töflunni.");
        return;
      }

      setLoading(true);
      const event = gameState === 'playing' && score === 0 ? 'start' : gameState === 'gameover' ? 'end' : 'milestone';
      
      // Only fetch on start, gameover, or significant milestones
      if (event === 'milestone' && score % 100 !== 0) {
          setLoading(false);
          return;
      }

      const response = await getForemanCommentary(gameType, score, event);
      if (isMounted) {
        setMessage(response.message);
        setLoading(false);
      }
    };

    fetchCommentary();

    return () => { isMounted = false; };
  }, [gameType, gameState, score]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-end max-w-xs animate-slide-in pointer-events-none">
      <div className={`bg-white border-4 border-yellow-500 rounded-2xl p-4 mr-4 shadow-xl relative mb-4 transition-opacity duration-300 ${loading ? 'opacity-80' : 'opacity-100'}`}>
        <p className="text-gray-800 font-bold text-sm md:text-base">
          {loading ? "Hmm..." : message}
        </p>
        <div className="absolute -right-2 bottom-4 w-4 h-4 bg-white border-r-4 border-b-4 border-yellow-500 transform rotate-45"></div>
      </div>
      <div className="bg-yellow-400 p-3 rounded-full border-4 border-black shadow-lg animate-bounce-slight">
        <HardHat size={40} className="text-black" />
      </div>
    </div>
  );
};

export default Foreman;