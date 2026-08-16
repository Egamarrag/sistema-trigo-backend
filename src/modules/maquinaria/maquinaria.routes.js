const express = require('express');
const router = express.Router();
const { verificarToken, soloRoles } = require('../../middlewares/auth');
const { manejarAsync } = require('../../utils/manejarAsync');
const servicio = require('./maquinaria.service');

router.use(verificarToken);

router.get('/', soloRoles('Administrador', 'Operario'), manejarAsync(async (req, res) => {
  res.json(await servicio.listarMaquinaria());
}));

router.post('/', soloRoles('Administrador'), manejarAsync(async (req, res) => {
  res.status(201).json(await servicio.crearMaquinaria(req.body));
}));

router.put('/:id', soloRoles('Administrador'), manejarAsync(async (req, res) => {
  res.json(await servicio.editarMaquinaria(req.params.id, req.body));
}));

router.delete('/:id', soloRoles('Administrador'), manejarAsync(async (req, res) => {
  await servicio.darDeBajaMaquinaria(req.params.id);
  res.json({ mensaje: 'Maquina dada de baja correctamente.' });
}));

module.exports = router;
