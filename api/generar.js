import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { nombre, edad, estatura, genero, objetivo, dias, nivel, lesiones, equipo, duracion } = req.body || {};
  const numDias = parseInt(dias) || 4;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Falta configurar GEMINI_API_KEY en Vercel' });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];

  const prompt = `Actúa como un entrenador personal certificado de alto nivel.
Crea una rutina estructurada de ${numDias} días para el usuario:
- Nombre: ${nombre || 'Atleta'}
- Género: ${genero || 'No especificado'} ${genero === 'Mujer' ? '(Enfocar mayor volumen relativo en tren inferior/glúteos/piernas)' : ''}
- Objetivo: ${objetivo || 'Acondicionamiento'}
- Nivel: ${nivel || 'Intermedio'}
- Duración por sesión: ${duracion || 60} minutos
- Equipo disponible: ${equipo || 'Gimnasio completo'}
- Lesiones / Limitaciones: ${lesiones || 'Ninguna'} (IMPORTANTE: Evitar completamente ejercicios que estresen esta zona)

Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura estricta (sin bloques de código markdown extra):
{
  "calentamiento": ["Movilidad articular 5 min", "Cardio suave 5 min"],
  "dias": [
    {
      "nombre": "Día 1: Torso / Fuerza",
      "ejercicios": [
        {
          "id": "ex_1",
          "nombre": "Press de Banca con Barra",
          "musculo": "Pecho / Tríceps",
          "series": 4,
          "reps": "8-10",
          "descansoSeg": 90,
          "pasos": "Acuéstate en el banco, baja la barra al esternón controladamente y empuja con fuerza.",
          "errores": "Rebotar la barra en el pecho o despegar la cadera.",
          "img": "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500&auto=format&fit=crop&q=60"
        }
      ]
    }
  ],
  "estiramiento": ["Estiramiento de pectorales 30s", "Estiramiento de dorsales 30s"]
}`;

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { responseMimeType: "application/json" }
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = JSON.parse(text);
      if (parsed) return res.status(200).json(parsed);
    } catch (e) {
      console.error(`Error con ${modelName}:`, e.message);
    }
  }

  // Fallback estructurado en caso de límite de cuota
  return res.status(200).json({
    calentamiento: ["5 min Cardio suave", "Movilidad articular general"],
    dias: Array.from({ length: numDias }, (_, i) => ({
      nombre: `Día ${i + 1}: Sesión Personalizada`,
      ejercicios: [
        {
          id: `fallback_${i}_1`,
          nombre: genero === 'Mujer' ? "Sentadilla Búlgara" : "Press de Banca con Mancuernas",
          musculo: genero === 'Mujer' ? "Glúteos y Cuádriceps" : "Pecho",
          series: 4,
          reps: "10-12",
          descansoSeg: 60,
          pasos: "Mantén el torso estable y controla la fase descendente.",
          errores: "Perder la postura o acelerar demasiado.",
          img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&auto=format&fit=crop&q=60"
        },
        {
          id: `fallback_${i}_2`,
          nombre: "Remo con Mancuerna",
          musculo: "Espalda",
          series: 4,
          reps: "10-12",
          descansoSeg: 60,
          pasos: "Tracciona llevando el codo hacia la cadera manteniendo la espalda recta.",
          errores: "Rotar en exceso el torso.",
          img: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500&auto=format&fit=crop&q=60"
        }
      ]
    })),
    estiramiento: ["Estiramiento general de piernas", "Movilidad de hombros y espalda"]
  });
}
