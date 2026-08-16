// Este archivo protege las rutas del sistema: verifica que quien hace
// la peticion tenga una "llave" (token) valida de haber iniciado sesion.

const jwt = require('jsonwebtoken');

const SECRETO = process.env.JWT_SECRET || 'cambiar_este_secreto_en_produccion';

function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No se proporciono sesion. Inicia sesion nuevamente.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const datos = jwt.verify(token, SECRETO);
    req.usuario = datos; // { id, usuario, rolId, rolNombre }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Sesion invalida o expirada. Inicia sesion nuevamente.' });
  }
}

// Middleware adicional: exige que el usuario tenga uno de los roles permitidos.
// Uso: soloRoles('Administrador', 'Contador')
function soloRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    if (!rolesPermitidos.includes(req.usuario.rolNombre)) {
      return res.status(403).json({ error: 'No tienes permiso para realizar esta accion.' });
    }
    next();
  };
}

module.exports = { verificarToken, soloRoles, SECRETO };
