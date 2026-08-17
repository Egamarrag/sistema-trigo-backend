const prisma = require('../../config/db');

async function listarOrigenes() {
  return prisma.origenTrigo.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } });
}

async function crearOrigen(datos) {
  if (!datos.nombre || datos.nombre.trim() === '') {
    throw new Error('El origen necesita un nombre, por ejemplo "Nacional Arequipa" o "Importado".');
  }
  return prisma.origenTrigo.create({ data: { nombre: datos.nombre.trim() } });
}

module.exports = { listarOrigenes, crearOrigen };
