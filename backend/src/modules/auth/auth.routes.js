const express = require('express');
const router = express.Router();
const { iniciarSesion } = require('./auth.service');

// POST /api/auth/login
// Recibe { usuario, password } y devuelve un token si es correcto
router.post('/login', async (req, res) => {
  const { usuario, password } = req.body;

  if (!usuario || !password) {
    return res.status(400).json({ error: 'Debes ingresar usuario y contrasena.' });
  }

  try {
    const resultado = await iniciarSesion(usuario, password);
    res.json(resultado);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

module.exports = router;
