const express = require('express');
const router = express.Router();
const { verificarToken, soloRoles } = require('../../middlewares/auth');
const { manejarAsync } = require('../../utils/manejarAsync');
const servicio = require('./dashboard.service');

router.use(verificarToken);

// El dashboard muestra informacion financiera sensible: Administrador y Contador
router.get('/', soloRoles('Administrador', 'Contador'), manejarAsync(async (req, res) => {
  const resumen = await servicio.obtenerResumenGeneral(req.query);
  res.json(resumen);
}));

module.exports = router;
