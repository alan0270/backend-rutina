import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_ANON_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 1. Estructura rígida de días según frecuencia
const RUTINAS_ESTRUC = {
    3: [
        { nombre: "Día 1: Empuje (Pecho, Hombros, Tríceps)", grupos: ['pecho', 'hombros', 'brazos'] },
        { nombre: "Día 2: Tracción (Espalda, Bíceps)", grupos: ['espalda', 'brazos'] },
        { nombre: "Día 3: Pierna Completa y Glúteo", grupos: ['piernas', 'gluteos'] }
    ],
    4: [
        { nombre: "Día 1: Pecho y Tríceps", grupos: ['pecho', 'brazos'] },
        { nombre: "Día 2: Espalda y Bíceps", grupos: ['espalda', 'brazos'] },
        { nombre: "Día 3: Hombros y Abdomen", grupos: ['hombros'] },
        { nombre: "Día 4: Piernas y Glúteos", grupos: ['piernas', 'gluteos'] }
    ],
    5: [
        { nombre: "Día 1: Pecho, Hombros, Brazos", grupos: ['pecho', 'hombros', 'brazos'] },
        { nombre: "Día 2: Espalda y Bíceps", grupos: ['espalda', 'brazos'] },
        { nombre: "Día 3: Cuádriceps, Glúteo y Femoral", grupos: ['piernas', 'gluteos'] },
        { nombre: "Día 4: Torso Completo", grupos: ['pecho', 'espalda', 'hombros', 'brazos'] },
        { nombre: "Día 5: Glúteo y Piernas", grupos: ['gluteos', 'piernas'] }
    ]
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { nivel_usuario, dias_disponibles, genero } = req.body;
        const diasNum = parseInt(dias_disponibles) || 3;

        // Niveles de dificultad permitidos
        const nivelesPermitidos = nivel_usuario === 'basico' ? ['basico'] :
                                  nivel_usuario === 'intermedio' ? ['basico', 'intermedio'] : 
                                  ['basico', 'intermedio', 'avanzado'];

        // Traer todos los ejercicios válidos por nivel de la BD
        const { data: todosEjercicios, error: dbError } = await supabase
            .from('ejercicios')
            .select('*')
            .in('nivel_minimo', nivelesPermitidos);

        if (dbError) throw dbError;

        // Obtener la plantilla de días seleccionada
        const plantillaDias = RUTINAS_ESTRUC[diasNum] || RUTINAS_ESTRUC[3];

        // Construir los días filtrando ESTRICTAMENTE por grupo_muscular en el código
        const diasConstruidos = plantillaDias.map((diaInfo) => {
            // Solo dejamos los ejercicios que pertenecen a los grupos de este día
            const ejerciciosFiltrados = todosEjercicios.filter(ej => 
                diaInfo.grupos.includes(ej.grupo_muscular)
            );

            return {
                nombre_dia: diaInfo.nombre,
                ejercicios_permitidos: ejerciciosFiltrados
            };
        });

        // Llamada a la IA con los datos ya filtrados código por código
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
        Eres un entrenador personal. Tienes una lista de días, y para CADA DÍA tienes una lista de ejercicios MUESTRA que YA FUERON FILTRADOS previamente para ese grupo muscular.

        TU ÚNICA TAREA:
        Para cada día en la lista recibida, selecciona entre 4 y 5 ejercicios DE LOS QUE TE FUE ENTREGADO EN SU RESPECTIVA LISTA. 
        Asígnales series (3 a 4), repeticiones ("8-10" o "10-12") y tiempo de descanso adecuado (60s a 120s).

        Nivel: ${nivel_usuario}
        Estructura previa de días y ejercicios: ${JSON.stringify(diasConstruidos)}

        Devuelve estrictamente un JSON válido con este formato exacto:
        {
          "titulo": "Rutina de ${nivel_usuario}",
          "dias": [
            {
              "nombre_dia": "Nombre del dia recibido",
              "ejercicios": [
                {
                  "ejercicio_id": 1,
                  "nombre": "Nombre del ejercicio",
                  "series": 4,
                  "repeticiones": "8-12",
                  "rir_objetivo": 2,
                  "descanso_segundos": 90,
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
