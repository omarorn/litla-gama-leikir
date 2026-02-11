# Project Overview: litla-gama-leikir (Litlu Gáma Leigu Smá Leikir)

## Purpose
A collection of fun mini-games for "Litla Gamaleigan" (a children's construction equipment rental theme). Includes garbage sorting, snow plowing, hook/crane, and digging/sand games. Features an AI assistant, a game selection wheel, high-score camera, trash scanner, and map operations. Icelandic-language children's game app.

## Tech Stack
- React 19 with TypeScript
- Vite 6 (build tool)
- Google GenAI SDK (`@google/genai`)
- Lucide React (icons)
- Web Audio API (background music, sound effects)
- Camera/microphone access (high score photos, AI assistant)

## Key Files
- `App.tsx` — Main app: game selection, state management, night/winter modes
- `components/games/GarbageGame.tsx` — Garbage/trash sorting game
- `components/games/HookGame.tsx` — Crane/hook game
- `components/games/SnowPlowGame.tsx` — Snow plowing game
- `components/games/SandGame.tsx` — Digging/sand game
- `components/GameWheel.tsx` — Game selection wheel UI
- `components/GearStation.tsx` — Gear/equipment station
- `components/TrashScanner.tsx` — AI-powered trash scanning (camera)
- `components/MapOps.tsx` — Map operations view
- `components/AIAssistant.tsx` — AI-powered assistant (Gemini)
- `components/HighScoreCamera.tsx` — Take photo for high score
- `components/Foreman.tsx` — Foreman character/guide
- `services/audioService.ts` — Music and sound effect management
- `services/geminiService.ts` — Gemini AI integration
- `types.ts` — Game type enums and type definitions

## Build/Run Commands
- `npm install` — Install dependencies
- `npm run dev` — Run development server
- `npm run build` — Build for production
- `npm run preview` — Preview production build
- Requires `GEMINI_API_KEY` in `.env.local`

## Notes
- Google AI Studio exported app
- Icelandic-language children's educational game collection
- Features day/night and summer/winter modes based on real time
- High scores persisted in localStorage
- Background music with mute toggle (respects browser autoplay policy)
- Camera permission for trash scanning and high-score photos
- Microphone permission for AI assistant interaction
