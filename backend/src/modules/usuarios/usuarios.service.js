const bcrypt = require('bcrypt');
const prisma = require('../../config/db');

async function listarUsuarios() {
  return prisma.usuario.findMany({
    include: { rol: true },
    orderBy: { creadoEn: 'desc' },
  });
}

async function crearUsuario({ nombreCompleto, usuario, password, rolId, telefono }) {
  const existente = await prisma.usuario.findUnique({ where: { usuario } });
  if (existente) {
    throw new Error('Ya existe un usuario con ese nombre de acceso. Elige otro.');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.usuario.create({
    data: { nombreCompleto, usuario, passwordHash, rolId, telefono },
    include: { rol: true },
  });
}

async function editarUsuario(id, datos) {
  const data = { ...datos };
  // Si viene una nueva contrasena, la encriptamos. Si no viene, no la tocamos.
  if (data.password) {
    data.passwordHash = await bcrypt.hash(data.password, 10);
    delete data.password;
  }
  return prisma.usuario.update({ where: { id: Number(id) }, data, include: { rol: true } });
}

async function desactivarUsuario(id) {
  return prisma.usuario.update({
    where: { id: Number(id) },
    data: { activo: false },
  });
}

async function listarRoles() {
  return prisma.rol.findMany({ orderBy: { id: 'asc' } });
}

module.exports = { listarUsuarios, crearUsuario, editarUsuario, desactivarUsuario, listarRoles };
