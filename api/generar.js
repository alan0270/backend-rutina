// Ejemplo del manejador de generación en el cliente:
async function manejarGenerarRutina(datosPerfil) {
  setCargando(true);
  setError(null);

  try {
    const respuesta = await fetch('/api/generar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosPerfil)
    });

    if (!respuesta.ok) {
      throw new Error(`Error en el servidor: ${respuesta.status}`);
    }

    const datos = await respuesta.json();

    // Validar que la respuesta contenga la estructura esperada antes de actualizar el estado
    if (datos && Array.isArray(datos.dias) && datos.dias.length > 0) {
      setRutina(datos);
    } else {
      throw new Error('La estructura de la rutina no es válida');
    }
  } catch (err) {
    console.error('Error al generar la rutina:', err);
    setError('Ocurrió un problema al cargar la rutina. Por favor, reintenta.');
  } finally {
    setCargando(false);
  }
}
