import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  // Configuración de cabeceras CORS
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

  const { nombre, edad, estatura, genero, objetivo, dias, nivel, notas } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Falta configurar la variable GEMINI_API_KEY en Vercel' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `Eres un entrenador personal experto. Crea una rutina de entrenamiento personalizada.
Datos del alumno:
- Nombre: ${nombre || 'Usuario'}
- Edad: ${edad || 'No especificado'} años
- Estatura: ${estatura || 'No especificado'} cm
- Género: ${genero || 'No especificado'}
- Objetivo: ${objetivo || 'Acondicionamiento físico'}
- Días por semana: ${dias || 3}
- Nivel: ${nivel || 'Principiante'}
- Notas especiales / lesiones / equipo: ${notas || 'Ninguna'}

Organiza la rutina por días con ejercicios, series, repeticiones y descanso.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return res.status(200).json({ rutina: response.text });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
}
