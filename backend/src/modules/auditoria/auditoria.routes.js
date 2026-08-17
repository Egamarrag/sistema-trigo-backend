const express = require('express');
const router = express.Router();
const { verificarToken, soloRoles } = require('../../middlewares/auth');
const { manejarAsync } = require('../../utils/manejarAsync');
const servicio = require('./auditoria.service');

router.use(verificarToken);

// Solo el Administrador puede ver el historial completo de cambios del sistema
router.get('/', soloRoles('Administrador'), manejarAsync(async (req, res) => {
  res.json(await servicio.listarAuditoria(req.query));
}));

module.exports = router;
