const express = require('express');
const router = express.Router();
const { verificarToken, soloRoles } = require('../../middlewares/auth');
const { manejarAsync } = require('../../utils/manejarAsync');
const servicio = require('./compras.service');

router.use(verificarToken);

router.get('/', soloRoles('Administrador', 'Operario', 'Contador'), manejarAsync(async (req, res) => {
  const compras = await servicio.listarCompras();
  res.json(compras);
}));

router.get('/:id', soloRoles('Administrador', 'Operario', 'Contador'), manejarAsync(async (req, res) => {
  const compra = await servicio.obtenerCompra(req.params.id);
  res.json(compra);
}));

// Registrar compra: la usan Administrador y Operario (quien recibe el trigo fisicamente)
router.post('/', soloRoles('Administrador', 'Operario'), manejarAsync(async (req, res) => {
  const datos = { ...req.body, usuarioId: req.usuario.id };
  const resultado = await servicio.registrarCompra(datos);
  res.status(201).json(resultado);
}));

module.exports = router;
