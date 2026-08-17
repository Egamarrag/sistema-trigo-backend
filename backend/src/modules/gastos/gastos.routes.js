const express = require('express');
const router = express.Router();
const { verificarToken, soloRoles } = require('../../middlewares/auth');
const { manejarAsync } = require('../../utils/manejarAsync');
const servicio = require('./gastos.service');

router.use(verificarToken);

router.get('/', soloRoles('Administrador', 'Contador'), manejarAsync(async (req, res) => {
  res.json(await servicio.listarGastos(req.query));
}));

router.post('/', soloRoles('Administrador', 'Contador'), manejarAsync(async (req, res) => {
  const datos = { ...req.body, usuarioId: req.usuario.id };
  res.status(201).json(await servicio.registrarGasto(datos));
}));

module.exports = router;
