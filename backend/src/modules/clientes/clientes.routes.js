const express = require('express');
const router = express.Router();
const { verificarToken, soloRoles } = require('../../middlewares/auth');
const { manejarAsync } = require('../../utils/manejarAsync');
const servicio = require('./clientes.service');

router.use(verificarToken);

// El Vendedor necesita ver clientes para poder venderles
router.get('/', soloRoles('Administrador', 'Vendedor', 'Contador'), manejarAsync(async (req, res) => {
  const clientes = await servicio.listarClientes();
  res.json(clientes);
}));

router.get('/:id', soloRoles('Administrador', 'Vendedor', 'Contador'), manejarAsync(async (req, res) => {
  const cliente = await servicio.obtenerCliente(req.params.id);
  res.json(cliente);
}));

router.get('/:id/deuda', soloRoles('Administrador', 'Vendedor', 'Contador'), manejarAsync(async (req, res) => {
  const deuda = await servicio.obtenerDeudaCliente(req.params.id);
  res.json(deuda);
}));

router.post('/', soloRoles('Administrador', 'Vendedor'), manejarAsync(async (req, res) => {
  const nuevo = await servicio.crearCliente(req.body);
  res.status(201).json(nuevo);
}));

router.put('/:id', soloRoles('Administrador', 'Vendedor'), manejarAsync(async (req, res) => {
  const actualizado = await servicio.editarCliente(req.params.id, req.body);
  res.json(actualizado);
}));

router.delete('/:id', soloRoles('Administrador'), manejarAsync(async (req, res) => {
  await servicio.desactivarCliente(req.params.id);
  res.json({ mensaje: 'Cliente desactivado correctamente.' });
}));

module.exports = router;
