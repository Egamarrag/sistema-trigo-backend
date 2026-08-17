const express = require('express');
const router = express.Router();
const { verificarToken, soloRoles } = require('../../middlewares/auth');
const { manejarAsync } = require('../../utils/manejarAsync');
const servicio = require('./compras.service');
const origenesServicio = require('./origenes.service');

router.use(verificarToken);

// Catalogo de origenes de trigo (nacional, importado, por zona, etc.)
router.get('/origenes', soloRoles('Administrador', 'Operario'), manejarAsync(async (req, res) => {
  res.json(await origenesServicio.listarOrigenes());
}));

router.post('/origenes', soloRoles('Administrador', 'Operario'), manejarAsync(async (req, res) => {
  res.status(201).json(await origenesServicio.crearOrigen(req.body));
}));

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
