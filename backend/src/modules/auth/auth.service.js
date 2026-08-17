// Logica de negocio de inicio de sesion.
// No conoce nada de HTTP, solo reglas de negocio.

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/db');
const { SECRETO } = require('../../middlewares/auth');

async function iniciarSesion(usuario, password) {
  const usuarioEncontrado = await prisma.usuario.findUnique({
    where: { usuario },
    include: { rol: true },
  });

  if (!usuarioEncontrado) {
    throw new Error('Usuario o contrasena incorrectos.');
  }

  if (!usuarioEncontrado.activo) {
    throw new Error('Este usuario esta desactivado. Contacta al administrador.');
  }

  const passwordValido = await bcrypt.compare(password, usuarioEncontrado.passwordHash);

  if (!passwordValido) {
    throw new Error('Usuario o contrasena incorrectos.');
  }

  const token = jwt.sign(
    {
      id: usuarioEncontrado.id,
      usuario: usuarioEncontrado.usuario,
      rolId: usuarioEncontrado.rolId,
      rolNombre: usuarioEncontrado.rol.nombre,
    },
    SECRETO,
    { expiresIn: '12h' }
  );

  return {
    token,
    usuario: {
      id: usuarioEncontrado.id,
      nombreCompleto: usuarioEncontrado.nombreCompleto,
      usuario: usuarioEncontrado.usuario,
      rol: usuarioEncontrado.rol.nombre,
    },
  };
}

module.exports = { iniciarSesion };
