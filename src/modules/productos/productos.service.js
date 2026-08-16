const prisma = require('../../config/db');

async function listarProductos() {
  return prisma.producto.findMany({
    where: { activo: true },
    include: { presentaciones: { where: { activo: true } } },
    orderBy: { nombre: 'asc' },
  });
}

async function crearProducto(datos) {
  if (!datos.nombre || datos.nombre.trim() === '') {
    throw new Error('El nombre del producto es obligatorio.');
  }
  return prisma.producto.create({ data: datos });
}

async function editarProducto(id, datos) {
  return prisma.producto.update({ where: { id: Number(id) }, data: datos });
}

async function desactivarProducto(id) {
  return prisma.producto.update({ where: { id: Number(id) }, data: { activo: false } });
}

// Presentaciones (ej: "Saco 50kg" del producto "Trigo lavado grado A")
async function crearPresentacion(productoId, datos) {
  if (!datos.nombre || !datos.pesoKg) {
    throw new Error('La presentacion necesita un nombre y su peso en kilogramos.');
  }
  if (Number(datos.pesoKg) <= 0) {
    throw new Error('El peso de la presentacion debe ser mayor a cero.');
  }
  return prisma.presentacion.create({
    data: { ...datos, productoId: Number(productoId) },
  });
}

async function editarPresentacion(id, datos) {
  return prisma.presentacion.update({ where: { id: Number(id) }, data: datos });
}

async function desactivarPresentacion(id) {
  return prisma.presentacion.update({ where: { id: Number(id) }, data: { activo: false } });
}

module.exports = {
  listarProductos,
  crearProducto,
  editarProducto,
  desactivarProducto,
  crearPresentacion,
  editarPresentacion,
  desactivarPresentacion,
};
