// Envuelve una funcion de ruta para capturar errores automaticamente
// y evitar repetir try/catch en cada endpoint del sistema.

function manejarAsync(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((error) => {
      console.error(error);
      res.status(400).json({ error: error.message || 'Ocurrio un error inesperado.' });
    });
  };
}

module.exports = { manejarAsync };
