const express = require('express');
const router = express.Router();
const { verificarToken, soloRoles } = require('../../middlewares/auth');
const { manejarAsync } = require('../../utils/manejarAsync');
const servicio = require('./trabajadores.service');

router.use(verificarToken);

router.get('/', soloRoles('Administrador', 'Operario'), manejarAsync(async (req, res) => {
  res.json(await servicio.listarTrabajadores());
}));

router.post('/', soloRoles('Administrador'), manejarAsync(async (req, res) => {
  res.status(201).json(await servicio.crearTrabajador(req.body));
}));

router.put('/:id', soloRoles('Administrador'), manejarAsync(async (req, res) => {
  res.json(await servicio.editarTrabajador(req.params.id, req.body));
}));

router.delete('/:id', soloRoles('Administrador'), manejarAsync(async (req, res) => {
  await servicio.desactivarTrabajador(req.params.id);
  res.json({ mensaje: 'Trabajador desactivado correctamente.' });
}));

module.exports = router;
