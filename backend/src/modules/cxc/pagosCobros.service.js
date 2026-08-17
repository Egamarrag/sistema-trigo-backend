const prisma = require('../../config/db');
const { registrarMovimientoCaja } = require('../caja/caja.service');

// Registrar un COBRO de un cliente: reduce el saldo pendiente de su cuenta por cobrar
// y aumenta el saldo de la cuenta de tesoreria donde entro el dinero (efectivo, Yape, etc.)
async function registrarCobroCliente({ cuentaPorCobrarId, cuentaTesoreriaId, monto, medioPago, usuarioId }) {
  if (!cuentaPorCobrarId || !cuentaTesoreriaId || !monto) {
    throw new Error('Debes indicar la cuenta por cobrar, la cuenta de tesoreria y el monto.');
  }
  if (Number(monto) <= 0) throw new Error('El monto debe ser mayor a cero.');

  return prisma.$transaction(async (tx) => {
    const cuenta = await tx.cuentaPorCobrar.findUnique({ where: { id: Number(cuentaPorCobrarId) } });
    if (!cuenta) throw new Error('Cuenta por cobrar no encontrada.');
    if (Number(monto) > Number(cuenta.saldoPendiente)) {
      throw new Error(`El monto pagado (${monto}) es mayor a la deuda pendiente (${cuenta.saldoPendiente}).`);
    }

    const nuevoSaldo = Number(cuenta.saldoPendiente) - Number(monto);
    await tx.cuentaPorCobrar.update({
      where: { id: cuenta.id },
      data: {
        saldoPendiente: nuevoSaldo,
        estado: nuevoSaldo === 0 ? 'pagada' : 'vigente',
      },
    });

    // Actualizar tambien el estado de la venta asociada
    await tx.venta.update({
      where: { id: cuenta.ventaId },
      data: { estado: nuevoSaldo === 0 ? 'pagada' : 'pagada_parcial' },
    });

    const pago = await tx.pagoCobro.create({
      data: {
        tipo: 'cobro_cliente',
        cuentaPorCobrarId: cuenta.id,
        cuentaTesoreriaId: Number(cuentaTesoreriaId),
        monto: Number(monto),
        medioPago: medioPago || null,
        usuarioId: usuarioId || null,
      },
    });

    await registrarMovimientoCaja(tx, {
      cuentaTesoreriaId,
      tipo: 'ingreso',
      monto,
      origen: 'cobro',
      origenId: pago.id,
    });

    return pago;
  });
}

// Registrar un PAGO a un proveedor: reduce el saldo pendiente de la cuenta por pagar
// y disminuye el saldo de la cuenta de tesoreria de donde sale el dinero
async function registrarPagoProveedor({ cuentaPorPagarId, cuentaTesoreriaId, monto, medioPago, usuarioId }) {
  if (!cuentaPorPagarId || !cuentaTesoreriaId || !monto) {
    throw new Error('Debes indicar la cuenta por pagar, la cuenta de tesoreria y el monto.');
  }
  if (Number(monto) <= 0) throw new Error('El monto debe ser mayor a cero.');

  return prisma.$transaction(async (tx) => {
    const cuenta = await tx.cuentaPorPagar.findUnique({ where: { id: Number(cuentaPorPagarId) } });
    if (!cuenta) throw new Error('Cuenta por pagar no encontrada.');
    if (Number(monto) > Number(cuenta.saldoPendiente)) {
      throw new Error(`El monto (${monto}) es mayor a la deuda pendiente (${cuenta.saldoPendiente}).`);
    }

    const cuentaTesoreria = await tx.cuentaTesoreria.findUnique({ where: { id: Number(cuentaTesoreriaId) } });
    if (Number(cuentaTesoreria.saldoActual) < Number(monto)) {
      throw new Error(`No hay suficiente saldo en "${cuentaTesoreria.nombre}" para este pago.`);
    }

    const nuevoSaldo = Number(cuenta.saldoPendiente) - Number(monto);
    await tx.cuentaPorPagar.update({
      where: { id: cuenta.id },
      data: {
        saldoPendiente: nuevoSaldo,
        estado: nuevoSaldo === 0 ? 'pagada' : 'vigente',
      },
    });

    const pago = await tx.pagoCobro.create({
      data: {
        tipo: 'pago_proveedor',
        cuentaPorPagarId: cuenta.id,
        cuentaTesoreriaId: Number(cuentaTesoreriaId),
        monto: Number(monto),
        medioPago: medioPago || null,
        usuarioId: usuarioId || null,
      },
    });

    await registrarMovimientoCaja(tx, {
      cuentaTesoreriaId,
      tipo: 'egreso',
      monto,
      origen: 'pago_proveedor',
      origenId: pago.id,
    });

    return pago;
  });
}

async function listarPagosCobros() {
  return prisma.pagoCobro.findMany({
    include: { cuentaTesoreria: true, cuentaPorCobrar: true, cuentaPorPagar: true },
    orderBy: { fecha: 'desc' },
  });
}

module.exports = { registrarCobroCliente, registrarPagoProveedor, listarPagosCobros };
