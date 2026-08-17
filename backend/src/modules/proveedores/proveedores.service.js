const prisma = require('../../config/db');

async function listarProveedores({ soloActivos = true } = {}) {
  return prisma.proveedor.findMany({
    where: soloActivos ? { activo: true } : {},
    orderBy: { nombre: 'asc' },
  });
}

async function obtenerProveedor(id) {
  const proveedor = await prisma.proveedor.findUnique({ where: { id: Number(id) } });
  if (!proveedor) throw new Error('Proveedor no encontrado.');
  return proveedor;
}

async function crearProveedor(datos) {
  if (!datos.nombre || datos.nombre.trim() === '') {
    throw new Error('El nombre del proveedor es obligatorio.');
  }
  return prisma.proveedor.create({ data: datos });
}

async function editarProveedor(id, datos) {
  return prisma.proveedor.update({ where: { id: Number(id) }, data: datos });
}

async function desactivarProveedor(id) {
  return prisma.proveedor.update({ where: { id: Number(id) }, data: { activo: false } });
}

module.exports = {
  listarProveedores,
  obtenerProveedor,
  crearProveedor,
  editarProveedor,
  desactivarProveedor,
};
