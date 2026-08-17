const express = require('express');
const router = express.Router();
const { verificarToken, soloRoles } = require('../../middlewares/auth');
const { manejarAsync } = require('../../utils/manejarAsync');
const servicio = require('./ventas.service');

router.use(verificarToken);

router.get('/', soloRoles('Administrador', 'Vendedor', 'Contador'), manejarAsync(async (req, res) => {
  const ventas = await servicio.listarVentas();
  res.json(ventas);
}));

// La rentabilidad por cliente muestra margenes reales: solo Administrador y Contador
router.get('/rentabilidad-clientes', soloRoles('Administrador', 'Contador'), manejarAsync(async (req, res) => {
  const rentabilidad = await servicio.rentabilidadPorCliente();
  res.json(rentabilidad);
}));

router.get('/:id', soloRoles('Administrador', 'Vendedor', 'Contador'), manejarAsync(async (req, res) => {
  const venta = await servicio.obtenerVenta(req.params.id);
  res.json(venta);
}));

router.post('/', soloRoles('Administrador', 'Vendedor'), manejarAsync(async (req, res) => {
  const datos = { ...req.body, usuarioId: req.usuario.id };
  const resultado = await servicio.registrarVenta(datos);
  res.status(201).json(resultado);
}));

module.exports = router;
