const express = require('express');
const router = express.Router();
const { verificarToken, soloRoles } = require('../../middlewares/auth');
const { manejarAsync } = require('../../utils/manejarAsync');
const cxcServicio = require('./cuentasPorCobrar.service');
const pagosServicio = require('./pagosCobros.service');

router.use(verificarToken);

const ROLES_CXC = ['Administrador', 'Contador', 'Vendedor'];

router.get('/', soloRoles(...ROLES_CXC), manejarAsync(async (req, res) => {
  res.json(await cxcServicio.listarCuentasPorCobrar(req.query));
}));

router.get('/aging', soloRoles('Administrador', 'Contador'), manejarAsync(async (req, res) => {
  res.json(await cxcServicio.agingCartera());
}));

// Registrar el cobro de una cuenta pendiente
router.post('/:id/cobros', soloRoles('Administrador', 'Contador'), manejarAsync(async (req, res) => {
  const datos = { ...req.body, cuentaPorCobrarId: req.params.id, usuarioId: req.usuario.id };
  const pago = await pagosServicio.registrarCobroCliente(datos);
  res.status(201).json(pago);
}));

module.exports = router;
