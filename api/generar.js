import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicializar Supabase y Google Gemini
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_ANON_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { nivel_usuario, dias_disponibles } = req.body;

        // 1. Filtrar niveles permitidos en la base de datos
        const nivelesPermitidos = nivel_usuario === 'basico' ? ['basico'] :
                                  nivel_usuario === 'intermedio' ? ['basico', 'intermedio'] : 
                                  ['basico', 'intermedio', 'avanzado'];

        // 2. Traer ejercicios con su grupo muscular
        const { data: ejerciciosDisponibles, error: dbError } = await supabase
            .from('ejercicios')
            .select('*')
            .in('nivel_minimo', nivelesPermitidos);

        if (dbError) throw dbError;

        // 3. Configurar Gemini con prompt estricto
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
        Eres un entrenador personal de élite. Diseña un plan de entrenamiento enfocado en sobrecarga progresiva e hipertrofia.
        
        REGLAS OBLIGATORIAS:
        1. COHERENCIA DE GRUPOS MUSCULARES: 
           - Revisa el campo 'grupo_muscular' de cada ejercicio.
           - Si un día se enfoca en "Pecho, Hombros, Brazos", NUNCA incluyas ejercicios marcados como 'piernas', 'gluteos' o 'espalda'.
           - Si un día se enfoca en "Cuádriceps, Glúteo, Femoral", NUNCA incluyas ejercicios marcados como 'pecho', 'espalda' o 'brazos'.
        2. USA ÚNICAMENTE LOS EJERCICIOS PROPIOS DE LA LISTA PROVISTA.
        3. PARÁMETROS REALES:
           - Ejercicios compuestos pesados: 3-4 series, 6-10 reps, descanso 120s.
           - Ejercicios aislados/accesorios: 3-4 series, 10-15 reps, descanso 60s-90s.

        Nivel del usuario: ${nivel_usuario}
        Días por semana: ${dias_disponibles}
        Lista de ejercicios en la BD: ${JSON.stringify(ejerciciosDisponibles)}

        Devuelve la respuesta estrictamente en un formato JSON válido con la siguiente estructura:
        {
          "titulo": "Rutina de ${nivel_usuario}",
          "dias": [
            {
              "nombre_dia": "Día 1: Pecho, Hombros, Brazos",
              "ejercicios": [
                {
                  "ejercicio_id": 4,
                  "nombre": "Press de banca plano",
                  "series": 4,
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

        const result = await model.generateContent(prompt);
        const rutinaJson = JSON.parse(result.response.text());

        return res.status(200).json({ success: true, rutina: rutinaJson });

    } catch (error) {
        console.error("Error generando rutina:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
