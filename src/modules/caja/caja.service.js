const prisma = require('../../config/db');

// Funcion interna reutilizable: registra un movimiento de caja y actualiza el saldo
// de la cuenta de tesoreria correspondiente. Se usa dentro de otras transacciones
// (pagos, cobros, gastos) para que el saldo siempre este sincronizado.
async function registrarMovimientoCaja(tx, { cuentaTesoreriaId, tipo, monto, origen, origenId }) {
  await tx.cajaMovimiento.create({
    data: {
      cuentaTesoreriaId: Number(cuentaTesoreriaId),
      tipo,
      monto: Number(monto),
      origen,
      origenId: origenId || null,
    },
  });

  const ajuste = tipo === 'ingreso' ? Number(monto) : -Number(monto);
  await tx.cuentaTesoreria.update({
    where: { id: Number(cuentaTesoreriaId) },
    data: { saldoActual: { increment: ajuste } },
  });
}

async function listarMovimientos({ cuentaTesoreriaId } = {}) {
  return prisma.cajaMovimiento.findMany({
    where: cuentaTesoreriaId ? { cuentaTesoreriaId: Number(cuentaTesoreriaId) } : {},
    include: { cuentaTesoreria: true },
    orderBy: { fecha: 'desc' },
  });
}

async function obtenerSaldosGenerales() {
  const cuentas = await prisma.cuentaTesoreria.findMany({ where: { activo: true } });
  const totalGeneral = cuentas.reduce((s, c) => s + Number(c.saldoActual), 0);
  return { cuentas, totalGeneral };
}

// Flujo de caja de un periodo: ingresos - egresos
async function flujoCaja({ desde, hasta } = {}) {
  const where = {};
  if (desde || hasta) {
    where.fecha = {};
    if (desde) where.fecha.gte = new Date(desde);
    if (hasta) where.fecha.lte = new Date(hasta);
  }

  const movimientos = await prisma.cajaMovimiento.findMany({ where });

  const totalIngresos = movimientos.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto), 0);
  const totalEgresos = movimientos.filter((m) => m.tipo === 'egreso').reduce((s, m) => s + Number(m.monto), 0);

  return {
    totalIngresos,
    totalEgresos,
    flujoNeto: totalIngresos - totalEgresos,
  };
}

module.exports = { registrarMovimientoCaja, listarMovimientos, obtenerSaldosGenerales, flujoCaja };
