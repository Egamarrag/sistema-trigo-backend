const express = require('express');
const router = express.Router();
const { verificarToken, soloRoles } = require('../../middlewares/auth');
const { manejarAsync } = require('../../utils/manejarAsync');
const servicio = require('./proveedores.service');

router.use(verificarToken);

// GET /api/proveedores - Administrador y Operario pueden ver (Operario compra materia prima)
router.get('/', soloRoles('Administrador', 'Operario'), manejarAsync(async (req, res) => {
  const proveedores = await servicio.listarProveedores();
  res.json(proveedores);
}));

router.get('/:id', soloRoles('Administrador', 'Operario'), manejarAsync(async (req, res) => {
  const proveedor = await servicio.obtenerProveedor(req.params.id);
  res.json(proveedor);
}));

router.post('/', soloRoles('Administrador', 'Operario'), manejarAsync(async (req, res) => {
  const nuevo = await servicio.crearProveedor(req.body);
  res.status(201).json(nuevo);
}));

router.put('/:id', soloRoles('Administrador', 'Operario'), manejarAsync(async (req, res) => {
  const actualizado = await servicio.editarProveedor(req.params.id, req.body);
  res.json(actualizado);
}));

// Desactivar es mas delicado: solo el Administrador decide dar de baja a un proveedor
router.delete('/:id', soloRoles('Administrador'), manejarAsync(async (req, res) => {
  await servicio.desactivarProveedor(req.params.id);
  res.json({ mensaje: 'Proveedor desactivado correctamente.' });
}));

module.exports = router;
