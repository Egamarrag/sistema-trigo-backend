const prisma = require('../../config/db');

async function listarClientes({ soloActivos = true } = {}) {
  return prisma.cliente.findMany({
    where: soloActivos ? { activo: true } : {},
    orderBy: { nombre: 'asc' },
  });
}

async function obtenerCliente(id) {
  const cliente = await prisma.cliente.findUnique({ where: { id: Number(id) } });
  if (!cliente) throw new Error('Cliente no encontrado.');
  return cliente;
}

async function crearCliente(datos) {
  if (!datos.nombre || datos.nombre.trim() === '') {
    throw new Error('El nombre del cliente es obligatorio.');
  }

  // Si el cliente es a credito, debe tener dias de credito definidos.
  // Esto evita que despues, al vender, no sepamos calcular el vencimiento.
  if (datos.condicionPago === 'credito' && !datos.diasCredito) {
    throw new Error('Si el cliente compra a credito, debes indicar a cuantos dias paga.');
  }

  return prisma.cliente.create({ data: datos });
}

async function editarCliente(id, datos) {
  if (datos.condicionPago === 'credito' && !datos.diasCredito) {
    throw new Error('Si el cliente compra a credito, debes indicar a cuantos dias paga.');
  }
  return prisma.cliente.update({ where: { id: Number(id) }, data: datos });
}

async function desactivarCliente(id) {
  return prisma.cliente.update({ where: { id: Number(id) }, data: { activo: false } });
}

// Util para el modulo de ventas mas adelante: saber cuanto le debe un cliente
async function obtenerDeudaCliente(id) {
  const cuentas = await prisma.cuentaPorCobrar.findMany({
    where: { venta: { clienteId: Number(id) }, estado: { not: 'pagada' } },
  });
  const totalDeuda = cuentas.reduce((suma, c) => suma + Number(c.saldoPendiente), 0);
  return { totalDeuda, cuentasPendientes: cuentas.length };
}

module.exports = {
  listarClientes,
  obtenerCliente,
  crearCliente,
  editarCliente,
  desactivarCliente,
  obtenerDeudaCliente,
};
