import { GoogleGenerativeAI } from '@google/generative-ai';

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

  // Determinar número de ejercicios según duración estimada
  let numEjercicios = 5;
  if (minsSession >= 75) numEjercicios = 8;
  else if (minsSession >= 60) numEjercicios = 6;
  else if (minsSession <= 45) numEjercicios = 4;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Falta configurar GEMINI_API_KEY en Vercel' });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];

  const listaLesiones = Array.isArray(lesiones) ? lesiones.join(', ') : (lesiones || 'Ninguna');

  const prompt = `Actúa como un entrenador personal de élite. Diseña un plan de entrenamiento completo y personalizado de ${numDias} días para FitAI Pro:
- Nombre: ${nombre || 'Usuario'}
- Género: ${genero || 'Hombre'}
- Edad: ${edad || 25} años, Peso: ${peso || 70} kg, Estatura: ${estatura || 170} cm
- Objetivo: ${objetivo || 'Ganar músculo'}
- Nivel: ${nivel || 'Intermedio'}
- Duración por sesión: ${minsSession} minutos (Proporcionar estrictamente entre ${numEjercicios} y ${numEjercicios + 1} ejercicios por día)
- Equipo disponible: ${equipo || 'Gimnasio completo'}
- Lesiones/Limitaciones a EVITAR estrictamente: ${listaLesiones}

REGLAS DE DISTRIBUCIÓN DE ENTRENAMIENTO:
1. Si el género es "Hombre": Distribuye los días de manera equilibrada (Ejemplo para 3 días: "Día 1: Pecho y Tríceps", "Día 2: Espalda y Biceps", "Día 3: Piernas y Hombros"; o Torso/Pierna/Fullbody). NO asignes solo glúteos/femorales a un hombre salvo que lo pida.
2. Si el género es "Mujer": Da mayor énfasis a la cadena posterior, glúteos, cuádriceps y abdomen, manteniendo trabajo complementario de torso.
3. CADA DÍA debe tener un título descriptivo real según los músculos principales (Ej: "Día 1: Pecho, Hombros y Tríceps").
4. CADA EJERCICIO debe separar estrictamente sus campos: "series" (número entero), "repsBase" (ej: "10" o "12/10/8"), "nota" (ej: "+ 10 seg isométrica al final" o "" si no requiere) y "descansoSeg" (número entero).
5. Excluye cualquier ejercicio contraindicado para las lesiones mencionadas: ${listaLesiones}.

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta sin explicaciones ni markdown:
{
  "calentamiento": ["Movilidad articular 5 min", "2 series suaves de aproximación"],
  "dias": [
    {
      "nombre": "Día 1: Pecho y Tríceps",
      "ejercicios": [
        {
          "id": "ex_1",
          "nombre": "Press de Banca Plano",
          "musculo": "Pecho",
          "series": 4,
          "repsBase": "10/10/8/8",
          "nota": "Controlar la fase descendente en 2 segundos",
          "descansoSeg": 90,
          "pasos": "Acuéstate sobre el banco, baja la barra al esternón con codos a 45° y empuja con fuerza.",
          "errores": "Despegar los glúteos del banco o rebotar la barra en el pecho."
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
      const text = result.response.text();
      const parsed = JSON.parse(text);
      if (parsed) return res.status(200).json(parsed);
    } catch (e) {
      console.error(`Error con modelo ${modelName}:`, e.message);
    }
  }

  return res.status(500).json({ error: 'No se pudo generar la rutina con la IA. Inténtalo de nuevo.' });
}
