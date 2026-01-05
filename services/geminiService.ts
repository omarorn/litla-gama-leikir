import { GoogleGenAI, Type } from "@google/genai";
import { GameType, ForemanResponse } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const getForemanCommentary = async (
  gameType: GameType,
  score: number,
  event: 'start' | 'end' | 'milestone'
): Promise<ForemanResponse> => {
  if (!apiKey) {
    return {
      message: "Tilbúinn í slaginn! (Vantar API lykil)",
      mood: 'neutral'
    };
  }

  const modelId = "gemini-3-flash-preview";
  
  const systemInstruction = `Þú ert vingjarnlegur, hress og gamansamur verkstjóri hjá 'Litlu Gamaleigunni'. 
  Þú talar eingöngu íslensku. Þú ert að tala við barn eða ungling sem er að spila smáleiki tengda vinnuvélum og umhverfi.
  Haltu svörum stuttum (undir 20 orð). Vertu hvetjandi og notaðu íslenska frasa (t.d. 'Jæja', 'Glæsilegt', 'Áfram gakk').
  
  Leikirnir eru:
  - GARBAGE (Flokkun): Flokka rusl í réttar tunnur (Plast, Pappi, Matur, Almennt). Mikilvægt að flokka rétt!
  - HOOK (Krókabíll): Keyra vörubíl og ná í gáma.
  - SNOW (Snjómokstur): Moka götur.
  - SAND (Sandmokstur): Moka sandi á gröfu.
  `;

  let prompt = "";
  if (event === 'start') {
    prompt = `Leikmaðurinn er að byrja í leiknum: ${gameType}. Óskaðu góðs gengis.`;
  } else if (event === 'end') {
    prompt = `Leikmaðurinn kláraði ${gameType} með stigið ${score}. Gefðu stutta umsögn.`;
  } else {
    prompt = `Leikmaðurinn var að standa sig vel í ${gameType}! Hrósaðu honum.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING },
            mood: { type: Type.STRING, enum: ['happy', 'neutral', 'excited'] }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as ForemanResponse;

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      message: "Vel gert! Haltu áfram að standa þig!",
      mood: 'happy'
    };
  }
};