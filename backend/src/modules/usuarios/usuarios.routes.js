const express = require('express');
const router = express.Router();
const { verificarToken, soloRoles } = require('../../middlewares/auth');
const servicio = require('./usuarios.service');

// Todas las rutas de este archivo requieren sesion iniciada
router.use(verificarToken);

// GET /api/usuarios - lista todos los usuarios (solo Administrador)
router.get('/', soloRoles('Administrador'), async (req, res) => {
  const usuarios = await servicio.listarUsuarios();
  // Nunca enviamos el passwordHash al frontend
  const limpio = usuarios.map(({ passwordHash, ...resto }) => resto);
  res.json(limpio);
});

// GET /api/usuarios/roles - lista los roles disponibles (para el formulario)
router.get('/roles', soloRoles('Administrador'), async (req, res) => {
  const roles = await servicio.listarRoles();
  res.json(roles);
});

// POST /api/usuarios - crea un nuevo usuario (solo Administrador)
router.post('/', soloRoles('Administrador'), async (req, res) => {
  try {
    const nuevo = await servicio.crearUsuario(req.body);
    const { passwordHash, ...limpio } = nuevo;
    res.status(201).json(limpio);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/usuarios/:id - edita un usuario existente
router.put('/:id', soloRoles('Administrador'), async (req, res) => {
  try {
    const actualizado = await servicio.editarUsuario(req.params.id, req.body);
    const { passwordHash, ...limpio } = actualizado;
    res.json(limpio);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/usuarios/:id - desactiva (no elimina fisicamente, por trazabilidad)
router.delete('/:id', soloRoles('Administrador'), async (req, res) => {
  try {
    await servicio.desactivarUsuario(req.params.id);
    res.json({ mensaje: 'Usuario desactivado correctamente.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
