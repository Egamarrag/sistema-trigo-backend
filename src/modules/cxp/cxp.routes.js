const express = require('express');
const router = express.Router();
const { verificarToken, soloRoles } = require('../../middlewares/auth');
const { manejarAsync } = require('../../utils/manejarAsync');
const cxpServicio = require('./cuentasPorPagar.service');
const pagosServicio = require('../cxc/pagosCobros.service');

router.use(verificarToken);

const ROLES_CXP = ['Administrador', 'Contador'];

router.get('/', soloRoles(...ROLES_CXP), manejarAsync(async (req, res) => {
  res.json(await cxpServicio.listarCuentasPorPagar(req.query));
}));

router.get('/total-pendiente', soloRoles(...ROLES_CXP), manejarAsync(async (req, res) => {
  const total = await cxpServicio.totalPorPagar();
  res.json({ totalPendiente: total });
}));

// Registrar el pago a un proveedor
router.post('/:id/pagos', soloRoles(...ROLES_CXP), manejarAsync(async (req, res) => {
  const datos = { ...req.body, cuentaPorPagarId: req.params.id, usuarioId: req.usuario.id };
  const pago = await pagosServicio.registrarPagoProveedor(datos);
  res.status(201).json(pago);
}));

module.exports = router;
