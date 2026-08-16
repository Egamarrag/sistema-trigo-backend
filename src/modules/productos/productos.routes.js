const express = require('express');
const router = express.Router();
const { verificarToken, soloRoles } = require('../../middlewares/auth');
const { manejarAsync } = require('../../utils/manejarAsync');
const servicio = require('./productos.service');

router.use(verificarToken);

// Todos los roles operativos necesitan ver el catalogo de productos
router.get('/', soloRoles('Administrador', 'Operario', 'Vendedor', 'Contador'), manejarAsync(async (req, res) => {
  const productos = await servicio.listarProductos();
  res.json(productos);
}));

router.post('/', soloRoles('Administrador'), manejarAsync(async (req, res) => {
  const nuevo = await servicio.crearProducto(req.body);
  res.status(201).json(nuevo);
}));

router.put('/:id', soloRoles('Administrador'), manejarAsync(async (req, res) => {
  const actualizado = await servicio.editarProducto(req.params.id, req.body);
  res.json(actualizado);
}));

router.delete('/:id', soloRoles('Administrador'), manejarAsync(async (req, res) => {
  await servicio.desactivarProducto(req.params.id);
  res.json({ mensaje: 'Producto desactivado correctamente.' });
}));

// Presentaciones (anidadas dentro de un producto)
router.post('/:productoId/presentaciones', soloRoles('Administrador'), manejarAsync(async (req, res) => {
  const nueva = await servicio.crearPresentacion(req.params.productoId, req.body);
  res.status(201).json(nueva);
}));

router.put('/presentaciones/:id', soloRoles('Administrador'), manejarAsync(async (req, res) => {
  const actualizada = await servicio.editarPresentacion(req.params.id, req.body);
  res.json(actualizada);
}));

router.delete('/presentaciones/:id', soloRoles('Administrador'), manejarAsync(async (req, res) => {
  await servicio.desactivarPresentacion(req.params.id);
  res.json({ mensaje: 'Presentacion desactivada correctamente.' });
}));

module.exports = router;
