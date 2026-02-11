import React, { useState, useRef, useEffect } from 'react';
import { GameType } from '../types';
import { audio } from '../services/audioService';
import { Play } from 'lucide-react';

interface GameWheelProps {
    onGameSelected: (game: GameType) => void;
    isWinter?: boolean;
}

interface Slice {
    label: string;
    game: GameType;
    color: string;
    textColor: string;
}

const SLICES: Slice[] = [
    { label: "Flokkun", game: GameType.GARBAGE, color: "#16a34a", textColor: "#ffffff" },
    { label: "My Little Pony", game: GameType.NONE, color: "#ec4899", textColor: "#ffffff" }, // The Trap
    { label: "Krókabíll", game: GameType.HOOK, color: "#0284c7", textColor: "#ffffff" },
    { label: "Snjómokstur", game: GameType.SNOW, color: "#2563eb", textColor: "#ffffff" },
    { label: "Gröfuvinna", game: GameType.SAND, color: "#d97706", textColor: "#ffffff" },
];

const GameWheel: React.FC<GameWheelProps> = ({ onGameSelected, isWinter }) => {
    const [rotation, setRotation] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const velocityRef = useRef(0);
    const rotationRef = useRef(0);
    const animationFrameRef = useRef<number>(0);
    
    // Config
    const friction = 0.985;
    
    const borderColor = isWinter ? 'border-cyan-500' : 'border-yellow-500';
    const indicatorColor = isWinter ? 'text-cyan-400' : 'text-yellow-500';

    const spin = () => {
        if (isSpinning) return;
        setIsSpinning(true);
        // Initial kick
        velocityRef.current = Math.random() * 20 + 30; // High speed
        audio.playClick();
        gameLoop();
    };

    const gameLoop = () => {
        velocityRef.current *= friction; // Slow down
        rotationRef.current += velocityRef.current;
        setRotation(rotationRef.current);

        // Click sound on segment change
        if (velocityRef.current > 0.5) {
             const segmentAngle = 360 / SLICES.length;
             const currentSeg = Math.floor(rotationRef.current / segmentAngle);
             const prevSeg = Math.floor((rotationRef.current - velocityRef.current) / segmentAngle);
             if (currentSeg !== prevSeg) {
                 audio.playTone(200, 'square', 0.05, 0.02);
             }
        }

        if (velocityRef.current < 0.1) {
            // Stopped
            finishSpin();
        } else {
            animationFrameRef.current = requestAnimationFrame(gameLoop);
        }
    };

    const finishSpin = () => {
        setIsSpinning(false);
        const finalAngle = rotationRef.current % 360;
        const sliceAngle = 360 / SLICES.length;
        // Calculate index. Since 0 is at 3 o'clock in standard math but pointer is at top (270 deg) or right (0),
        // let's assume pointer is at Top (270 degrees relative to circle center, or -90).
        // Actually, let's keep it simple. Pointer is at the top.
        // Rotation moves CLOCKWISE. So the slice at the TOP is:
        // Index = floor( ( (360 - (finalAngle % 360)) + Offset ) / sliceAngle ) % Count
        
        // CSS rotation 0 puts index 0 at 3 o'clock. 
        // We want pointer at 12 o'clock (90deg counter-clockwise from 0).
        // Let's rely on logic check after stop.
        
        // Normalize angle to 0-360
        const normalized = rotationRef.current % 360;
        
        // Which slice is at 270 degrees (Top)?
        // If rotation is 0, Slice 0 is at 0 deg (Right). Slice at Top is roughly index 3 or 4 depending on count.
        // Let's do it rigorously: 
        // Slice N spans from N*deg to (N+1)*deg.
        // The pointer is static at -90deg (Top).
        // effectively, the slice hit is the one where (Start + Rotation) <= -90 <= (End + Rotation).
        
        // Easier Rigging Method:
        // Calculate winning slice. If it's Pony, nudge it.
        // Actually, to RIG IT during spin:
        // We checked where it *would* stop? No, easier to check after stop and nudge visually if needed?
        // No, that looks glitchy.
        
        // "Nudge" logic: if it stopped on Pony, rotate it a bit more to the next one.
        
        const degPerSlice = 360 / SLICES.length;
        // Pointer is at -90 (Top).
        // Determine current slice under pointer:
        // (Index * degPerSlice + rotation) % 360 should overlap 270 (-90).
        
        // Let's just calculate which index is "winning".
        // The wheel rotated 'rotationRef.current'.
        // The pointer is at 270deg (Top).
        // So we want the slice where (StartAngle + Rotation) contains 270.
        // StartAngle = Index * degPerSlice.
        // (Index * degPerSlice + Rotation) % 360 = 270.
        // Index * degPerSlice = 270 - Rotation.
        // Index = (270 - Rotation) / degPerSlice.
        
        let rawIndex = Math.floor(((270 - (normalized)) % 360) / degPerSlice);
        if (rawIndex < 0) rawIndex += SLICES.length;
        
        const winningSlice = SLICES[rawIndex];
        
        if (winningSlice.label === "My Little Pony") {
            // RIGGED! Push to next one.
            const extra = degPerSlice; // Push one full slice
            rotationRef.current += extra;
            setRotation(rotationRef.current);
            
            // Recalculate winner (it will be the next one in list, e.g. Krókabíll)
            let newIndex = (rawIndex + 1) % SLICES.length; // Moving clockwise means previous index actually?
            // If we add rotation, the wheel moves CW. The pointer (static) moves CCW relative to wheel.
            // So index decreases? Let's just re-run the selection logic or force pass the next game.
            
            // To be safe, just pick the next game in the array blindly.
            const nextGame = SLICES[(rawIndex === 0 ? SLICES.length - 1 : rawIndex - 1)].game; 
            // Wait a split second for the "nudge" visual
            setTimeout(() => {
                onGameSelected(nextGame);
            }, 500);
        } else {
             setTimeout(() => {
                onGameSelected(winningSlice.game);
            }, 500);
        }
    };

    return (
        <div className="flex flex-col items-center">
             <div className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px]">
                 
                 {/* Pointer */}
                 <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 w-8 h-12">
                     <div className={`w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[32px] ${borderColor} filter drop-shadow-lg`}></div>
                 </div>

                 {/* The Wheel */}
                 <div 
                    className={`w-full h-full rounded-full border-8 ${borderColor} bg-slate-800 overflow-hidden shadow-2xl relative transition-transform duration-100 ease-out`}
                    style={{ transform: `rotate(${rotation}deg)` }}
                 >
                     {SLICES.map((slice, i) => {
                         const rotate = (360 / SLICES.length) * i;
                         const skew = 90 - (360 / SLICES.length);
                         return (
                             <div 
                                key={i}
                                className="absolute top-0 right-0 w-1/2 h-1/2 origin-bottom-left border-l border-b border-black/20 flex items-end justify-start"
                                style={{ 
                                    transform: `rotate(${rotate}deg) skewY(-${skew}deg)`,
                                    background: slice.color
                                }}
                             >
                                 <div 
                                    className="absolute left-8 bottom-8 text-left font-black uppercase text-sm md:text-base tracking-widest shadow-black drop-shadow-md w-32"
                                    style={{ 
                                        color: slice.textColor,
                                        transform: `skewY(${skew}deg) rotate(15deg) translate(20px, 40px)`, // Adjust text alignment based on slice size
                                    }}
                                 >
                                     {slice.label}
                                 </div>
                             </div>
                         );
                     })}
                 </div>
                 
                 {/* Center Cap */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-slate-900 rounded-full border-4 border-slate-600 shadow-xl flex items-center justify-center z-10">
                    <button 
                        onClick={spin}
                        disabled={isSpinning}
                        className={`w-12 h-12 rounded-full ${isSpinning ? 'bg-slate-700' : 'bg-red-600 hover:bg-red-500'} flex items-center justify-center transition-colors`}
                    >
                        {isSpinning ? (
                            <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full"></div>
                        ) : (
                            <Play fill="white" className="ml-1 text-white" size={20} />
                        )}
                    </button>
                 </div>
             </div>
             
             {!isSpinning && (
                <div className={`mt-8 text-center animate-pulse ${indicatorColor} font-mono text-sm`}>
                    Ýttu á play til að snúa
                </div>
             )}
        </div>
    );
};

export default GameWheel;