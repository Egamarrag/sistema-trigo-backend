const prisma = require('../../config/db');

async function listarCuentasTesoreria() {
  return prisma.cuentaTesoreria.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } });
}

async function crearCuentaTesoreria(datos) {
  if (!datos.nombre || !datos.tipo) {
    throw new Error('La cuenta necesita un nombre y un tipo (efectivo, billetera digital o banco).');
  }
  return prisma.cuentaTesoreria.create({ data: datos });
}

module.exports = { listarCuentasTesoreria, crearCuentaTesoreria };
