import { GoogleGenerativeAI } from '@google/generative-ai';

// Función para esperar X milisegundos
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
  const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });

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

  // Intentar hasta 3 veces si hay congestión (error 503)
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      attempt++;
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      return res.status(200).json({ rutina: responseText });
    } catch (error) {
      console.error(`Intento ${attempt} falló:`, error.message);

      // Si es el último intento o el error no es de alta demanda/servidor, lanzamos el error
      if (attempt >= maxRetries) {
        return res.status(500).json({ 
          error: 'El servicio de IA está experimentando alta demanda en este momento. Por favor, intenta de nuevo en unos segundos.' 
        });
      }

      // Esperar 1.5 segundos antes de reintentar
      await wait(1500);
    }
  }
}
