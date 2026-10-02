import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicializar Supabase
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_ANON_KEY
);

// Inicializar Google GenAI (asegúrate de tener GEMINI_API_KEY en las variables de Vercel)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { nivel_usuario, dias_disponibles } = req.body;

        // 1. Filtrar niveles permitidos
        const nivelesPermitidos = nivel_usuario === 'basico' ? ['basico'] :
                                  nivel_usuario === 'intermedio' ? ['basico', 'intermedio'] : 
                                  ['basico', 'intermedio', 'avanzado'];

        // 2. Consultar Supabase
        const { data: ejerciciosDisponibles, error: dbError } = await supabase
            .from('ejercicios')
            .select('*')
            .in('nivel_minimo', nivelesPermitidos);

        if (dbError) throw dbError;

        // 3. Configurar modelo de Gemini
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" } // Fuerza respuesta en JSON puro
        });

        const prompt = `
        Eres un entrenador personal experto. Tu objetivo es armar una rutina de entrenamiento enfocada en la sobrecarga progresiva.
        DEBES seleccionar los ejercicios ÚNICAMENTE de la siguiente lista JSON provista. No inventes ejercicios nuevos.
        
        Nivel del usuario: ${nivel_usuario}
        Días por semana: ${dias_disponibles}
        Ejercicios disponibles en la base de datos: ${JSON.stringify(ejerciciosDisponibles)}

        Devuelve la respuesta estrictamente en un formato JSON válido con esta estructura:
        {
          "titulo": "Nombre de la rutina",
          "dias": [
            {
              "nombre_dia": "Día 1: Empuje",
              "ejercicios": [
                {
                  "ejercicio_id": 1,
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
        }
        `;

        // 4. Generar contenido con Gemini
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const rutinaJson = JSON.parse(responseText);

        return res.status(200).json({ success: true, rutina: rutinaJson });

    } catch (error) {
        console.error("Error generando rutina:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
