const express = require('express');
const router = express.Router();
const { verificarToken, soloRoles } = require('../../middlewares/auth');
const { manejarAsync } = require('../../utils/manejarAsync');
const cuentasServicio = require('./cuentasTesoreria.service');
const cajaServicio = require('./caja.service');

router.use(verificarToken);

const ROLES_CAJA = ['Administrador', 'Contador'];

// Cuentas de tesoreria (efectivo, Yape, banco)
router.get('/cuentas', soloRoles(...ROLES_CAJA, 'Vendedor'), manejarAsync(async (req, res) => {
  res.json(await cuentasServicio.listarCuentasTesoreria());
}));

router.post('/cuentas', soloRoles('Administrador'), manejarAsync(async (req, res) => {
  res.status(201).json(await cuentasServicio.crearCuentaTesoreria(req.body));
}));

// Saldos generales: cuanto dinero hay en total, desglosado por cuenta
router.get('/saldos', soloRoles(...ROLES_CAJA), manejarAsync(async (req, res) => {
  res.json(await cajaServicio.obtenerSaldosGenerales());
}));

// Historial de movimientos de caja
router.get('/movimientos', soloRoles(...ROLES_CAJA), manejarAsync(async (req, res) => {
  res.json(await cajaServicio.listarMovimientos(req.query));
}));

// Flujo de caja de un periodo (ingresos - egresos)
router.get('/flujo', soloRoles(...ROLES_CAJA), manejarAsync(async (req, res) => {
  res.json(await cajaServicio.flujoCaja(req.query));
}));

module.exports = router;
