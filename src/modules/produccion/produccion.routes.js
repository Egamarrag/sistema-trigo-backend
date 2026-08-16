const express = require('express');
const router = express.Router();
const { verificarToken, soloRoles } = require('../../middlewares/auth');
const { manejarAsync } = require('../../utils/manejarAsync');
const servicio = require('./produccion.service');

router.use(verificarToken);

const ROLES_PRODUCCION = ['Administrador', 'Operario'];

router.get('/', soloRoles(...ROLES_PRODUCCION, 'Contador'), manejarAsync(async (req, res) => {
  const procesos = await servicio.listarProcesos();
  res.json(procesos);
}));

router.get('/:id', soloRoles(...ROLES_PRODUCCION, 'Contador'), manejarAsync(async (req, res) => {
  const proceso = await servicio.obtenerProceso(req.params.id);
  res.json(proceso);
}));

// Iniciar un proceso nuevo, indicando que lotes de compra se combinan
router.post('/', soloRoles(...ROLES_PRODUCCION), manejarAsync(async (req, res) => {
  const datos = { ...req.body, usuarioId: req.usuario.id };
  const nuevo = await servicio.iniciarProceso(datos);
  res.status(201).json(nuevo);
}));

// Agregar costos mientras el proceso esta abierto
router.post('/:id/mano-obra', soloRoles(...ROLES_PRODUCCION), manejarAsync(async (req, res) => {
  const registro = await servicio.agregarManoObra(req.params.id, req.body);
  res.status(201).json(registro);
}));

router.post('/:id/maquinaria', soloRoles(...ROLES_PRODUCCION), manejarAsync(async (req, res) => {
  const registro = await servicio.agregarMaquinariaUso(req.params.id, req.body);
  res.status(201).json(registro);
}));

router.post('/:id/insumos', soloRoles(...ROLES_PRODUCCION), manejarAsync(async (req, res) => {
  const registro = await servicio.agregarInsumoAdicional(req.params.id, req.body);
  res.status(201).json(registro);
}));

router.post('/:id/mermas', soloRoles(...ROLES_PRODUCCION), manejarAsync(async (req, res) => {
  const registro = await servicio.registrarMerma(req.params.id, req.body);
  res.status(201).json(registro);
}));

// Finalizar: aqui se calculan los costos reales y se genera el producto terminado
router.post('/:id/finalizar', soloRoles(...ROLES_PRODUCCION), manejarAsync(async (req, res) => {
  const resultado = await servicio.finalizarProceso(req.params.id, req.body);
  res.json(resultado);
}));

module.exports = router;
