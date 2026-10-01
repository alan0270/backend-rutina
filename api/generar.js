export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { nombre, edad, estatura, genero, objetivo, dias, nivel, notasAdicionales } = req.body;

  const prompt = `Eres un entrenador personal certificado. Diseña una rutina 100% personalizada en formato JSON.
Datos del alumno:
- Nombre: ${nombre}
- Edad: ${edad} años
- Estatura: ${estatura} cm
- Género: ${genero}
- Objetivo: ${objetivo}
- Días a entrenar: ${dias} días por semana
- Nivel: ${nivel}
- Notas especiales/lesiones/equipo: ${notasAdicionales || 'Ninguna'}

Devuelve ÚNICAMENTE un objeto JSON con la siguiente estructura exacta, sin texto antes ni después, ni bloques markdown:
{
  "name": "Rutina Personalizada de ${nombre}",
  "days": [
    {
      "t": "Día 1: Nombre de la zona",
      "ex": [
        {
          "n": "Nombre del ejercicio",
          "s": 4,
          "r": "10-12",
          "d": 0,
          "kg": ""
        }
      ]
    }
  ]
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const content = data.choices[0].message.content.trim();
    const cleanJson = content.replace(/^```json/, '').replace(/```$/, '').trim();
    const rutina = JSON.parse(cleanJson);

    return res.status(200).json(rutina);
  } catch (error) {
    return res.status(500).json({ error: 'Error al generar rutina: ' + error.message });
  }
}
