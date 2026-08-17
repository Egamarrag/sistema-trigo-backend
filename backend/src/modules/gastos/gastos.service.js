const prisma = require('../../config/db');
const { registrarMovimientoCaja } = require('../caja/caja.service');

async function listarGastos({ desde, hasta } = {}) {
  const where = {};
  if (desde || hasta) {
    where.fecha = {};
    if (desde) where.fecha.gte = new Date(desde);
    if (hasta) where.fecha.lte = new Date(hasta);
  }
  return prisma.gasto.findMany({
    where,
    include: { cuentaTesoreria: true, proceso: true },
    orderBy: { fecha: 'desc' },
  });
}

// Registrar un gasto: crea el gasto y automaticamente lo descuenta de la caja,
// todo en un solo paso seguro (si falla algo, no se guarda nada a medias)
async function registrarGasto({ categoria, descripcion, monto, fecha, cuentaTesoreriaId, procesoId, usuarioId }) {
  if (!categoria || !monto || !cuentaTesoreriaId) {
    throw new Error('Debes indicar categoria, monto y de que cuenta sale el dinero.');
  }
  if (Number(monto) <= 0) throw new Error('El monto del gasto debe ser mayor a cero.');

  return prisma.$transaction(async (tx) => {
    const cuentaTesoreria = await tx.cuentaTesoreria.findUnique({ where: { id: Number(cuentaTesoreriaId) } });
    if (!cuentaTesoreria) throw new Error('Cuenta de tesoreria no encontrada.');
    if (Number(cuentaTesoreria.saldoActual) < Number(monto)) {
      throw new Error(`No hay suficiente saldo en "${cuentaTesoreria.nombre}" para este gasto.`);
    }

    const gasto = await tx.gasto.create({
      data: {
        categoria,
        descripcion: descripcion || null,
        monto: Number(monto),
        fecha: fecha ? new Date(fecha) : new Date(),
        cuentaTesoreriaId: Number(cuentaTesoreriaId),
        procesoId: procesoId ? Number(procesoId) : null,
        usuarioId: usuarioId || null,
      },
    });

    await registrarMovimientoCaja(tx, {
      cuentaTesoreriaId,
      tipo: 'egreso',
      monto,
      origen: 'gasto',
      origenId: gasto.id,
    });

    return gasto;
  });
}

module.exports = { listarGastos, registrarGasto };
