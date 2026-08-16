const express = require('express');
const router = express.Router();
const { verificarToken, soloRoles } = require('../../middlewares/auth');
const { manejarAsync } = require('../../utils/manejarAsync');
const servicio = require('./inventario.service');

router.use(verificarToken);

// El Vendedor necesita ver el inventario disponible para saber que puede ofrecer
router.get('/', soloRoles('Administrador', 'Vendedor', 'Operario', 'Contador'), manejarAsync(async (req, res) => {
  const inventario = await servicio.listarInventarioDisponible();
  res.json(inventario);
}));

router.get('/:loteProductoId/stock', soloRoles('Administrador', 'Vendedor', 'Operario', 'Contador'), manejarAsync(async (req, res) => {
  const stock = await servicio.obtenerStockLote(req.params.loteProductoId);
  res.json({ stockActualKg: stock });
}));

// Ajustes solo los hace el Administrador, es informacion sensible
router.post('/:loteProductoId/ajuste', soloRoles('Administrador'), manejarAsync(async (req, res) => {
  const ajuste = await servicio.registrarAjuste(req.params.loteProductoId, req.body);
  res.status(201).json(ajuste);
}));

module.exports = router;
