import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { nombre, edad, estatura, genero, objetivo, dias, nivel, lesiones, equipo, duracion } = req.body || {};
  const numDias = parseInt(dias) || 5;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Falta configurar GEMINI_API_KEY en Vercel' });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];

  // Prompt entrenado con el estilo exacto de tus rutinas (Volumen alto + Técnicas avanzadas)
  const prompt = `Actúa como un entrenador personal de élite especializado en hipertrofia y acondicionamiento avanzado.
Diseña un plan de entrenamiento completo de ${numDias} días para el usuario:
- Nombre: ${nombre || 'Atleta'}
- Género: ${genero || 'No especificado'} ${genero === 'Mujer' ? '(Énfasis prioritario en Glúteos, Femorales y Cuádriceps)' : ''}
- Objetivo: ${objetivo || 'Ganar músculo y definición'}
- Nivel: ${nivel || 'Avanzado'}
- Duración por sesión: ${duracion || 60} minutos
- Equipo disponible: ${equipo || 'Gimnasio completo'}
- Lesiones / Limitaciones: ${lesiones || 'Ninguna'} (Evitar ejercicios con impacto o dolor directo en esta zona)

REGLAS CRÍTICAS DE ESTRUCTURA Y VOLUMEN DE EJERCICIOS:
1. CANTIDAD: CADA DÍA DEBE TENER ENTRE 5 Y 9 EJERCICIOS COMPLETOS (combinando ejercicios principales, accesorios como Pantorrillas/Abdomen y superseries).
2. TÉCNICAS AVANZADAS: Incluye técnicas de alta intensidad como:
   - Pausas isométricas ("10 seg manteniendo abajo/arriba").
   - Isometría final ("+ Sentadilla estática de 1 min").
   - Series combinadas / Superseries ("Apertura inclinada + flexiones de brazos").
   - Variaciones de tempo ("10 repeticiones negativas/lentas + 10 rápidas").
   - Pirámides descendentes o subiendo peso por serie (ej. "4x 30/20/15 reps").
   - Agarres y ángulos específicos (por ejemplo: "pies derechos + puntas hacia afuera").

Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura estricta (sin markdown ni explicaciones adicionales):
{
  "calentamiento": ["Movilidad articular de cadera y rodillas 5 min", "1 serie de aproximación ligera 30 reps"],
  "dias": [
    {
      "nombre": "Día 1: Cuádriceps / Glúteos / Pantorrilla",
      "ejercicios": [
        {
          "id": "ex_1",
          "nombre": "Extensión de Cuádriceps",
          "musculo": "Cuádriceps",
          "series": 4,
          "reps": "30/20/15/12 (Subiendo peso)",
          "descansoSeg": 60,
          "pasos": "Extiende las piernas controlando el peso. En la última serie realiza una pausa isométrica de 10 seg en la cima.",
          "errores": "Despegar la cadera del sillón.",
          "img": "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=500&auto=format&fit=crop&q=60"
        }
      ]
    }
  ],
  "estiramiento": ["Estiramiento profundo de psoas y cuádriceps 1 min", "Estiramiento de isquiotibiales"]
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

  // Rutina de Respaldo (Fallback) con estructura completa de 6 ejercicios avanzados si la IA falla
  const ejerciciosFallback = [
    {
      id: "ex_fb_1",
      nombre: "Empuje de Cadera con Barra (Hip Thrust)",
      musculo: "Glúteos",
      series: 4,
      reps: "10 + 10 seg sosteniendo arriba + 10 reps",
      descansoSeg: 75,
      pasos: "Apoya la parte alta de la espalda en el banco, empuja con los talones y aprieta los glúteos arriba sosteniendo 10 segundos.",
      errores: "Arquear la zona lumbar en lugar de bascular la pelvis.",
      img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&auto=format&fit=crop&q=60"
    },
    {
      id: "ex_fb_2",
      nombre: "Prensa de Piernas + Isometría",
      musculo: "Cuádriceps / Glúteos",
      series: 4,
      reps: "15 reps + 10 seg manteniendo al medio",
      descansoSeg: 75,
      pasos: "Coloca los pies a la anchura de los hombros. Controla la bajada y en la repetición 15 mantén la rodilla a 90° durante 10 segundos.",
      errores: "Bloquear las rodillas bruscamente en la extensión.",
      img: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=500&auto=format&fit=crop&q=60"
    },
    {
      id: "ex_fb_3",
      nombre: "Camilla de Femoral (Negativas + Rápidas)",
      musculo: "Femorales",
      series: 4,
      reps: "10 negativas (lentas) + 10 rápidas",
      descansoSeg: 60,
      pasos: "Flexiona las piernas bajando en 3-4 segundos de forma controlada y luego ejecuta 10 repeticiones a ritmo continuo.",
      errores: "Levantar la cadera de la camilla.",
      img: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500&auto=format&fit=crop&q=60"
    },
    {
      id: "ex_fb_4",
      nombre: "Sentadilla Sumo con Mancuerna",
      musculo: "Adductores / Glúteos",
      series: 4,
      reps: "20 / 15 / 12 / 10 (Bajando reps, subiendo peso)",
      descansoSeg: 60,
      pasos: "Separa los pies con las puntas hacia afuera a 45°. Baja profundo con el torso erguido.",
      errores: "Colapsar las rodillas hacia adentro.",
      img: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500&auto=format&fit=crop&q=60"
    },
    {
      id: "ex_fb_5",
      nombre: "Patada de Glúteo + Laterales",
      musculo: "Glúteo Mayor y Medio",
      series: 4,
      reps: "15 patadas + 15 laterales por pierna",
      descansoSeg: 45,
      pasos: "En polea o con banda, realiza la extensión trasera y sin descanso cambia a apertura lateral.",
      errores: "Balancear el torso para coger impulso.",
      img: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=60"
    },
    {
      id: "ex_fb_6",
      nombre: "Plancha + Abdominales Cortitas",
      musculo: "Abdomen",
      series: 4,
      reps: "1 min Plancha + 30 Cortitas",
      descansoSeg: 45,
      pasos: "Mantén la plancha abdominal rígida por 1 minuto y pasa inmediatamente al suelo a realizar encogimientos cortos.",
      errores: "Jalar del cuello en los encogimientos.",
      img: "https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=500&auto=format&fit=crop&q=60"
    }
  ];

  return res.status(200).json({
    calentamiento: ["5 min Movilidad articular de cadera y rodillas", "Aproximaciones sin peso"],
    dias: Array.from({ length: numDias }, (_, i) => ({
      nombre: `Día ${i + 1}: Sesión Personalizada Intensa`,
      ejercicios: ejerciciosFallback
    })),
    estiramiento: ["Estiramiento completo de piernas y cadera 2 min"]
  });
}
