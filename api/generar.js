import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { nombre, edad, estatura, genero, objetivo, dias, nivel, notas } = req.body || {};
  const numDias = parseInt(dias) || 5;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Falta GEMINI_API_KEY' });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];

  const prompt = `Crea una rutina de gimnasio personalizada de EXACTAMENTE ${numDias} DÍAS para ${nombre || 'Usuario'}.
- Objetivo: ${objetivo || 'Ganar músculo'}
- Nivel: ${nivel || 'Intermedio'}
- Días a entrenar: ${numDias} días
- Notas/Equipo: ${notas || 'Gimnasio completo'}

Responde en formato Markdown limpio con títulos por día (Ej: ### Día 1: Pecho y Tríceps) y lista de ejercicios con Series, Repeticiones y Descanso.`;

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      if (responseText) return res.status(200).json({ rutina: responseText });
    } catch (e) {
      console.error(`Error con modelo ${modelName}:`, e.message);
    }
  }

  // Fallback Inteligente: Genera exactamente la cantidad de días elegida si la IA está saturada
  let rutinaFallback = `### Plan Personalizado (${numDias} Días)\n*Servidor en alta demanda. Te hemos generado una rutina optimizada automáticamente:*\n\n`;
  
  const plantillasDias = [
    "### Día 1: Pecho y Tríceps\n- Press Banca Plano: 4 series x 10 reps (Descanso 90s)\n- Press Inclinado con Mancuernas: 3 series x 12 reps (Descanso 75s)\n- Fondos en Paralelas / Máquina: 3 series x 10 reps\n- Extensión de Tríceps en Polea: 4 series x 12 reps\n",
    "### Día 2: Espalda y BÍceps\n- Jalón al Pecho: 4 series x 10 reps (Descanso 90s)\n- Remo con Barra o Mancuerna: 4 series x 10 reps\n- Pullover en Polea Alta: 3 series x 12 reps\n- Curl de BÍceps con Barra Z: 4 series x 12 reps\n",
    "### Día 3: Cuádriceps y Abdominales\n- Sentadilla Libre o en Máquina: 4 series x 10 reps (Descanso 120s)\n- Prensa de Piernas: 4 series x 12 reps\n- Extensión de Cuádriceps: 3 series x 15 reps\n- Plancha Abdominal: 4 series x 45 seg\n",
    "### Día 4: Hombros y Trapecio\n- Press Militar con Mancuernas: 4 series x 10 reps\n- Elevaciones Laterales: 4 series x 15 reps\n- Pájaros (Hombro Posterior): 3 series x 12 reps\n- Encogimientos con Mancuernas: 3 series x 15 reps\n",
    "### Día 5: Isquios, Glúteos y Gemelos\n- Peso Muerto Rumano: 4 series x 10 reps\n- Hip Thrust con Barra: 4 series x 12 reps\n- Curl Femoral Tumbado: 3 series x 12 reps\n- Elevación de Talones: 4 series x 15 reps\n",
    "### Día 6: Full Body / Torso Enfoque\n- Dominadas o Jalón Abierto: 4 series x 8 reps\n- Press de Banca Inclinado: 4 series x 10 reps\n- Zancadas con Mancuernas: 3 series x 12 por pierna\n- Elevação Lateral + Core: 3 series al fallo\n"
  ];

  for (let i = 0; i < numDias; i++) {
    rutinaFallback += plantillasDias[i] + "\n";
  }

  return res.status(200).json({ rutina: rutinaFallback });
}
