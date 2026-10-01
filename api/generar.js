import { GoogleGenerativeAI } from '@google/generative-ai';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { nombre, edad, estatura, genero, objetivo, dias, nivel, notas } = req.body || {};

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Falta configurar la variable GEMINI_API_KEY en Vercel' });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  // Lista de modelos a intentar en orden de preferencia
  const modelsToTry = ['gemini-3.8-flash', 'gemini-2.0-flash'];

  const prompt = `Eres un entrenador personal experto. Crea una rutina de entrenamiento personalizada.
Datos del alumno:
- Nombre: ${nombre || 'Usuario'}
- Edad: ${edad || 'No especificado'}
- Estatura: ${estatura || 'No especificado'} cm
- Género: ${genero || 'No especificado'}
- Objetivo: ${objetivo || 'Acondicionamiento físico'}
- Días por semana: ${dias || 3}
- Nivel: ${nivel || 'Principiante'}
- Notas especiales / lesiones / equipo: ${notas || 'Ninguna'}

Organiza la rutina por días con ejercicios, series, repeticiones y descanso.`;

  for (const modelName of modelsToTry) {
    const model = genAI.getGenerativeModel({ model: modelName });
    let attempt = 0;
    const maxRetries = 2;

    while (attempt < maxRetries) {
      try {
        attempt++;
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        return res.status(200).json({ rutina: responseText });
      } catch (error) {
        console.error(`Error con ${modelName} (Intento ${attempt}):`, error.message);
        if (attempt < maxRetries) {
          await wait(1000);
        }
      }
    }
  }

  // Si todos los modelos de IA están en su límite, devuelve una respuesta útil
  return res.status(200).json({
    rutina: `### Rutina Base de Resguardo (IA Saturada)
El servidor de la IA está experimentando alta demanda en este momento. Aquí tienes una estructura inicial mientras se restablece el servicio:

**Día 1: Torso / Fuerza**
- Press de banca o flexiones: 4 series x 10-12 reps (Descanso: 90s)
- Remo con mancuerna o barra: 4 series x 10-12 reps (Descanso: 90s)
- Press militar: 3 series x 12 reps (Descanso: 60s)

**Día 2: Pierna / Core**
- Sentadillas: 4 series x 10-12 reps (Descanso: 90s)
- Peso muerto rumano: 3 series x 12 reps (Descanso: 90s)
- Plancha abdominal: 3 series x 45 segundos`
  });
}
