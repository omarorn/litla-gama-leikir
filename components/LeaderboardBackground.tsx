
import React, { useEffect, useState } from 'react';
import { GameType } from '../types';

interface LeaderboardBackgroundProps {
    userHighScores: Record<string, number>;
}

interface ScoreEntry {
    rank: number;
    initials: string;
    score: number;
    game: string;
    isUser?: boolean;
}

const LeaderboardBackground: React.FC<LeaderboardBackgroundProps> = ({ userHighScores }) => {
    const [scores, setScores] = useState<ScoreEntry[]>([]);

    useEffect(() => {
        // Mock data representing "The Company" high scores
        const baseScores: ScoreEntry[] = [
            { rank: 1, initials: 'OOM', score: 99999, game: 'HOOK' },
            { rank: 2, initials: 'GUN', score: 85400, game: 'SNOW' },
            { rank: 3, initials: 'EIN', score: 72000, game: 'SAND' },
            { rank: 4, initials: 'OOM', score: 65000, game: 'GARBAGE' },
            { rank: 5, initials: 'JON', score: 54300, game: 'HOOK' },
            { rank: 6, initials: 'SIG', score: 42000, game: 'SNOW' },
            { rank: 7, initials: 'GUD', score: 38000, game: 'GARBAGE' },
            { rank: 8, initials: 'HEL', score: 31000, game: 'SAND' },
        ];

        // Merge user scores
        const userEntries: ScoreEntry[] = Object.entries(userHighScores).map(([gameKey, score]) => ({
            rank: 0, // Calculated later
            initials: 'YOU',
            score: score,
            game: gameKey,
            isUser: true
        }));

        // Combine and Sort
        const allScores = [...baseScores, ...userEntries].sort((a, b) => b.score - a.score);

        // Assign Ranks and take top 20
        const rankedScores = allScores.slice(0, 20).map((entry, index) => ({
            ...entry,
            rank: index + 1
        }));

        setScores(rankedScores);
    }, [userHighScores]);

    return (
        <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
            {/* The Container - Opacity transition handles the "clearer on hover" requirement */}
            {/* Note: pointer-events-auto is added to the container so mouseover works, but text isn't selectable */}
            <div className="w-full max-w-5xl h-[90vh] transform -rotate-2 opacity-10 hover:opacity-100 transition-opacity duration-700 ease-in-out pointer-events-auto p-10 bg-black/80 backdrop-blur-sm rounded-3xl border-4 border-slate-800 hover:border-yellow-500/50 shadow-2xl">
                
                {/* Header */}
                <div className="flex justify-between items-end border-b-4 border-red-600 pb-4 mb-6">
                    <div>
                        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-400 to-red-600 uppercase tracking-widest font-mono filter drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                            High Scores
                        </h1>
                        <p className="text-red-500 font-bold tracking-[1em] text-xs mt-2 uppercase">Litla Gamaleigan Arcade</p>
                    </div>
                    <div className="text-right hidden md:block">
                        <div className="text-yellow-400 font-mono text-xl animate-pulse">1 CREDIT</div>
                        <div className="text-slate-500 font-mono text-sm">FREE PLAY</div>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-4 gap-4 text-xl md:text-2xl font-mono font-bold tracking-wider">
                    {/* Headers */}
                    <div className="text-blue-400 mb-2">RANK</div>
                    <div className="text-blue-400 mb-2">SCORE</div>
                    <div className="text-blue-400 mb-2">NAME</div>
                    <div className="text-blue-400 mb-2 text-right">GAME</div>

                    {/* Rows */}
                    {scores.map((entry) => (
                        <React.Fragment key={`${entry.game}-${entry.rank}`}>
                            <div className={`${entry.isUser ? 'text-green-400 animate-pulse' : 'text-yellow-500/80'} ${entry.rank === 1 ? 'text-purple-400' : ''}`}>
                                {entry.rank < 10 ? ` ${entry.rank}` : entry.rank}
                                {entry.rank === 1 && <span className="ml-2 text-sm">👑</span>}
                            </div>
                            <div className={`${entry.isUser ? 'text-white' : 'text-white/70'}`}>
                                {entry.score.toLocaleString()}
                            </div>
                            <div className={`${entry.isUser ? 'text-green-400' : 'text-cyan-400'}`}>
                                {entry.initials}
                            </div>
                            <div className="text-right text-slate-500 text-sm md:text-lg pt-1">
                                {entry.game.substring(0, 8)}
                            </div>
                        </React.Fragment>
                    ))}
                </div>

                {/* Decorative Bottom */}
                <div className="absolute bottom-6 left-0 w-full text-center">
                     <p className="text-slate-700 font-black text-6xl uppercase opacity-20 tracking-widest">Insert Coin</p>
                </div>
            </div>
        </div>
    );
};

export default LeaderboardBackground;
