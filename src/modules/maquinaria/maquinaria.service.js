const prisma = require('../../config/db');

async function listarMaquinaria() {
  return prisma.maquinaria.findMany({ orderBy: { nombre: 'asc' } });
}

async function crearMaquinaria(datos) {
  if (!datos.nombre || !datos.costoHoraOperacion) {
    throw new Error('La maquina necesita nombre y un costo por hora de operacion.');
  }
  return prisma.maquinaria.create({ data: datos });
}

async function editarMaquinaria(id, datos) {
  return prisma.maquinaria.update({ where: { id: Number(id) }, data: datos });
}

async function darDeBajaMaquinaria(id) {
  return prisma.maquinaria.update({ where: { id: Number(id) }, data: { estado: 'baja' } });
}

module.exports = { listarMaquinaria, crearMaquinaria, editarMaquinaria, darDeBajaMaquinaria };
