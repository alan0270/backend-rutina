import { GoogleGenerativeAI } from '@google/generative-ai';

// Biblioteca local para asignación de imágenes y fallback seguro
const BIBLIOTECA_MEDIAS = {
  "hip thrust": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&auto=format&fit=crop&q=60",
  "prensa": "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=500&auto=format&fit=crop&q=60",
  "sumo": "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500&auto=format&fit=crop&q=60",
  "banca": "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=60",
  "jalón": "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=500&auto=format&fit=crop&q=60",
  "militar": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500&auto=format&fit=crop&q=60",
  "curl": "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=500&auto=format&fit=crop&q=60",
  "tríceps": "https://images.unsplash.com/photo-1530822847156-5df684ec5ee1?w=500&auto=format&fit=crop&q=60",
  "plancha": "https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=500&auto=format&fit=crop&q=60"
};

function obtenerMedia(nombreEj) {
  const n = (nombreEj || '').toLowerCase();
  for (const [clave, url] of Object.entries(BIBLIOTECA_MEDIAS)) {
    if (n.includes(clave)) return url;
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { nombre, edad, peso, estatura, genero, objetivo, dias, nivel, lesiones = [], equipo, duracion } = req.body || {};
  const numDias = parseInt(dias) || 3;
  const minsSession = parseInt(duracion) || 60;

  let numEjercicios = 5;
  if (minsSession >= 75) numEjercicios = 8;
  else if (minsSession >= 60) numEjercicios = 6;
  else if (minsSession <= 45) numEjercicios = 4;

  const listaLesiones = Array.isArray(lesiones) ? lesiones.join(', ') : (lesiones || 'Ninguna');

  if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];

    const prompt = `Actúa como un entrenador personal de élite. Diseña un plan de entrenamiento completo y personalizado de ${numDias} días para FitAI Pro:
- Nombre: ${nombre || 'Usuario'}
- Género: ${genero || 'Hombre'}
- Edad: ${edad || 25} años, Peso: ${peso || 70} kg, Estatura: ${estatura || 170} cm
- Objetivo: ${objetivo || 'Ganar músculo'}
- Nivel: ${nivel || 'Intermedio'}
- Duración por sesión: ${minsSession} minutos (${numEjercicios} ejercicios por día)
- Equipo disponible: ${equipo || 'Gimnasio completo'}
- Lesiones/Limitaciones a EVITAR estrictamente: ${listaLesiones}

REGLAS DE DISTRIBUCIÓN:
1. Si el género es "Hombre": Distribuye los días de forma equilibrada ("Día 1: Pecho y Tríceps", "Día 2: Espalda y Biceps", "Día 3: Piernas y Hombros").
2. Si es "Mujer": Énfasis en pierna, glúteos y abdomen.
3. Devuelve CADA EJERCICIO separando los campos: "series" (número), "repsBase" (texto ej: "10"), "nota" (texto ej: "+ 10s isometría" o "") y "descansoSeg" (número).

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta sin explicaciones ni bloques de texto:
{
  "calentamiento": ["Movilidad articular 5 min", "2 series suaves de aproximación"],
  "dias": [
    {
      "nombre": "Día 1: Pecho y Tríceps",
      "ejercicios": [
        {
          "id": "ex_1",
          "nombre": "Press de Banca Plano con Barra",
          "musculo": "Pecho",
          "series": 4,
          "repsBase": "10",
          "nota": "Controlar el descenso",
          "descansoSeg": 90,
          "pasos": "Tumbado en banco, baja la barra al esternón y empuja.",
          "errores": "Despegar los glúteos del banco."
        }
      ]
    }
  ],
  "estiramiento": ["Estiramiento pectoral 1 min", "Estiramiento triceps 1 min"]
}`;

    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: "application/json" }
        });
        const result = await model.generateContent(prompt);
        let text = result.response.text();
        
        // Limpieza de marcadores de formato markdown
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(text);

        if (parsed && parsed.dias) {
          // Asignar imágenes
          parsed.dias.forEach(d => {
            d.ejercicios.forEach(ej => {
              ej.media = ej.media || obtenerMedia(ej.nombre);
            });
          });
          return res.status(200).json(parsed);
        }
      } catch (e) {
        console.error(`Error con modelo ${modelName}:`, e.message);
      }
    }
  }

  // --- RESPALDO LOCAL DE EMERGENCIA (FALLBACK) ---
  const esHombre = (genero || 'Hombre') === 'Hombre';
  const diasFallback = [];

  const ejerciciosHombre = [
    [
      { nombre: "Press de Banca Plano con Barra", musculo: "Pecho", series: 4, repsBase: "10", nota: "Controlar descenso", descansoSeg: 90, pasos: "Baja la barra al esternón y empuja con fuerza.", errores: "Arquear excesivamente la espalda." },
      { nombre: "Extensiones en Polea Alta con Cuerda", musculo: "Tríceps", series: 3, repsBase: "12", nota: "Pausa 1s abajo", descansoSeg: 60, pasos: "Extiende los brazos manteniendo codos fijos.", errores: "Mover los hombros." }
    ],
    [
      { nombre: "Jalón al Pecho Agarre Abierto", musculo: "Espalda", series: 4, repsBase: "10", nota: "Saca pecho al bajar", descansoSeg: 90, pasos: "Tracciona hacia la parte alta del pecho.", errores: "Balancear el torso." },
      { nombre: "Curl de Biceps con Barra Z", musculo: "Bíceps", series: 3, repsBase: "12", nota: "Sin impulso", descansoSeg: 60, pasos: "Flexiona codos manteniendo brazos pegados al cuerpo.", errores: "Mover la espalda." }
    ],
    [
      { nombre: "Prensa de Piernas Inclina", musculo: "Cuádriceps", series: 4, repsBase: "12", nota: "Ángulo de 90°", descansoSeg: 90, pasos: "Empuja con la planta del pie sin bloquear rodillas.", errores: "Despegar cadera del asiento." },
      { nombre: "Press Militar con Mancuernas", musculo: "Hombros", series: 3, repsBase: "10", nota: "Subir controlado", descansoSeg: 60, pasos: "Empuja las mancuernas sobre la cabeza.", errores: "Arquear la zona lumbar." }
    ]
  ];

  const ejerciciosMujer = [
    [
      { nombre: "Hip Thrust con Barra", musculo: "Glúteos", series: 4, repsBase: "10", nota: "+ 10s isometría final", descansoSeg: 90, pasos: "Apoya espalda en banco y empuja pelvis hacia arriba.", errores: "Hiperextender la espalda." },
      { nombre: "Sentadilla Sumo con Mancuerna", musculo: "Cuádriceps", series: 4, repsBase: "12", nota: "Profunda", descansoSeg: 75, pasos: "Pies abiertos a 45°, baja erguida.", errores: "Meter las rodillas hacia adentro." }
    ],
    [
      { nombre: "Prensa de Piernas Inclina", musculo: "Cuádriceps", series: 4, repsBase: "15", nota: "Ritmo constante", descansoSeg: 90, pasos: "Pies al ancho de hombros, baja a 90°.", errores: "Bloquear rodillas al subir." },
      { nombre: "Plancha Abdominal Isométrica", musculo: "Abdomen", series: 3, repsBase: "45s", nota: "Cuerpo recto", descansoSeg: 45, pasos: "Mantén tensión en el abdomen.", errores: "Dejar caer la cadera." }
    ],
    [
      { nombre: "Jalón al Pecho Agarre Abierto", musculo: "Espalda", series: 3, repsBase: "12", nota: "Controlado", descansoSeg: 60, pasos: "Tracciona hacia el pecho.", errores: "Usar impulso." },
      { nombre: "Press Militar con Mancuernas", musculo: "Hombros", series: 3, repsBase: "12", nota: "Sin bloquear", descansoSeg: 60, pasos: "Eleva las mancuernas sobre la cabeza.", errores: "Arquear la espalda." }
    ]
  ];

  const baseEjercicios = esHombre ? ejerciciosHombre : ejerciciosMujer;
  const titulosHombre = ["Día 1: Pecho y Tríceps", "Día 2: Espalda y Bíceps", "Día 3: Piernas y Hombros", "Día 4: Torso Completo", "Día 5: Pierna y Core"];
  const titulosMujer = ["Día 1: Glúteos y Cuádriceps", "Día 2: Pierna e Isquios", "Día 3: Torso y Abdomen", "Día 4: Glúteo Focalizado", "Día 5: Fullbody & Core"];

  for (let i = 0; i < numDias; i++) {
    const ejs = baseEjercicios[i % baseEjercicios.length].map(ej => ({
      ...ej,
      id: `ex_fb_${i}_${Math.random().toString(36).substring(2, 7)}`,
      media: obtenerMedia(ej.nombre)
    }));

    diasFallback.push({
      nombre: esHombre ? (titulosHombre[i] || `Día ${i + 1}: Entrenamiento`) : (titulosMujer[i] || `Día ${i + 1}: Entrenamiento`),
      ejercicios: ejs
    });
  }

  return res.status(200).json({
    calentamiento: ["5 min Movilidad articular", "2 series suaves de aproximación"],
    dias: diasFallback,
    estiramiento: ["Estiramiento muscular completo 2 min"]
  });
}
