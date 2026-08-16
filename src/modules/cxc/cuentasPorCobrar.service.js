const prisma = require('../../config/db');

async function listarCuentasPorCobrar({ soloVigentes = false } = {}) {
  return prisma.cuentaPorCobrar.findMany({
    where: soloVigentes ? { estado: { not: 'pagada' } } : {},
    include: { venta: { include: { cliente: true } } },
    orderBy: { fechaVencimiento: 'asc' },
  });
}

// Aging: clasifica las cuentas pendientes segun cuantos dias llevan vencidas.
// Esto es clave para que Erick sepa que clientes estan mas atrasados.
async function agingCartera() {
  const cuentas = await prisma.cuentaPorCobrar.findMany({
    where: { estado: { not: 'pagada' } },
    include: { venta: { include: { cliente: true } } },
  });

  const hoy = new Date();
  const categorias = { alDia: [], vencido_1_15: [], vencido_16_30: [], vencido_mas_30: [] };

  for (const cuenta of cuentas) {
    const vencimiento = cuenta.fechaVencimiento ? new Date(cuenta.fechaVencimiento) : null;
    const diasVencido = vencimiento ? Math.floor((hoy - vencimiento) / (1000 * 60 * 60 * 24)) : -1;

    const item = {
      cuentaId: cuenta.id,
      cliente: cuenta.venta.cliente.nombre,
      saldoPendiente: Number(cuenta.saldoPendiente),
      fechaVencimiento: cuenta.fechaVencimiento,
      diasVencido,
    };

    if (diasVencido <= 0) categorias.alDia.push(item);
    else if (diasVencido <= 15) categorias.vencido_1_15.push(item);
    else if (diasVencido <= 30) categorias.vencido_16_30.push(item);
    else categorias.vencido_mas_30.push(item);
  }

  const totalPendiente = cuentas.reduce((s, c) => s + Number(c.saldoPendiente), 0);

  return { categorias, totalPendiente };
}

module.exports = { listarCuentasPorCobrar, agingCartera };
