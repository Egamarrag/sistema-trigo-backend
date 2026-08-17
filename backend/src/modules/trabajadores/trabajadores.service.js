const prisma = require('../../config/db');

async function listarTrabajadores() {
  return prisma.trabajador.findMany({ where: { activo: true }, orderBy: { nombreCompleto: 'asc' } });
}

async function crearTrabajador(datos) {
  if (!datos.nombreCompleto || !datos.tarifaReferencial) {
    throw new Error('El trabajador necesita nombre y una tarifa referencial de pago.');
  }
  return prisma.trabajador.create({ data: datos });
}

async function editarTrabajador(id, datos) {
  return prisma.trabajador.update({ where: { id: Number(id) }, data: datos });
}

async function desactivarTrabajador(id) {
  return prisma.trabajador.update({ where: { id: Number(id) }, data: { activo: false } });
}

module.exports = { listarTrabajadores, crearTrabajador, editarTrabajador, desactivarTrabajador };
