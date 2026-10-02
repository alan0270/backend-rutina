import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Inicializar Supabase y OpenAI con las variables de entorno de Vercel
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_ANON_KEY
);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
    // Permitir solo peticiones POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { nivel_usuario, dias_disponibles } = req.body;
        // ej: nivel_usuario = 'intermedio', dias_disponibles = 4

        // 1. Definir qué niveles de ejercicios traer de Supabase según el usuario
        const nivelesPermitidos = nivel_usuario === 'basico' ? ['basico'] :
                                  nivel_usuario === 'intermedio' ? ['basico', 'intermedio'] : 
                                  ['basico', 'intermedio', 'avanzado'];

        // 2. Consultar el catálogo seguro en Supabase
        const { data: ejerciciosDisponibles, error: dbError } = await supabase
            .from('ejercicios')
            .select('*')
            .in('nivel_minimo', nivelesPermitidos);

        if (dbError) throw dbError;

        // 3. Crear los prompts para OpenAI
        const systemPrompt = `
        Eres un entrenador personal experto. Tu objetivo es armar una rutina de entrenamiento enfocada en la sobrecarga progresiva y el rendimiento real.
        DEBES seleccionar los ejercicios ÚNICAMENTE de la lista JSON provista. No inventes ejercicios nuevos.
        Devuelve la respuesta estrictamente en un formato JSON válido que contenga:
        {
          "titulo": "Nombre de la rutina",
          "dias": [
            {
              "nombre_dia": "Día 1: Empuje",
              "ejercicios": [
                {
                  "ejercicio_id": id_numerico,
                  "nombre": "Nombre exacto",
                  "series": 3,
                  "repeticiones": "8-10",
                  "rir_objetivo": 2,
                  "descanso_segundos": 120,
                  "orden": 1
                }
              ]
            }
          ]
        }`;

        const userPrompt = `
        Nivel del usuario: ${nivel_usuario}
        Días por semana: ${dias_disponibles}
        Ejercicios disponibles en la base de datos: ${JSON.stringify(ejerciciosDisponibles)}
        `;

        // 4. Llamada a la API de OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" }
        });

        const rutinaJson = JSON.parse(completion.choices[0].message.content);

        // 5. Responder al frontend con la rutina lista
        return res.status(200).json({ success: true, rutina: rutinaJson });

    } catch (error) {
        console.error("Error generando rutina:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
