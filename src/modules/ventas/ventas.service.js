const prisma = require('../../config/db');
const { calcularStockLote } = require('../inventario/inventario.service');

async function listarVentas() {
  return prisma.venta.findMany({
    include: { cliente: true, detalle: true, cuentaPorCobrar: true },
    orderBy: { fechaVenta: 'desc' },
  });
}

async function obtenerVenta(id) {
  const venta = await prisma.venta.findUnique({
    where: { id: Number(id) },
    include: {
      cliente: true,
      detalle: { include: { loteProducto: { include: { presentacion: { include: { producto: true } } } } } },
      cuentaPorCobrar: true,
    },
  });
  if (!venta) throw new Error('Venta no encontrada.');
  return venta;
}

// Registrar una venta hace TODO esto en un solo paquete seguro:
// 1. Verifica que haya stock suficiente en cada lote pedido
// 2. Crea la venta y su detalle (copiando el costo_kg del momento, para que el margen
//    quede fijo en la historia aunque despues cambien los costos)
// 3. Descuenta el inventario (movimiento de salida)
// 4. Si es a credito, genera la cuenta por cobrar
async function registrarVenta({ clienteId, fechaVenta, condicionPago, items, usuarioId }) {
  if (!clienteId || !items || items.length === 0) {
    throw new Error('Debes indicar el cliente y al menos un producto vendido.');
  }

  const resultado = await prisma.$transaction(async (tx) => {
    let montoTotal = 0;
    const detallesCalculados = [];

    for (const item of items) {
      const lote = await tx.loteProductoTerminado.findUnique({
        where: { id: Number(item.loteProductoId) },
        include: { movimientosInventario: true },
      });
      if (!lote) throw new Error('Uno de los lotes seleccionados no existe.');

      const stockActual = calcularStockLote(lote.movimientosInventario);
      if (Number(item.cantidadKg) > stockActual) {
        throw new Error(
          `No hay suficiente stock del lote ${lote.codigoLote}. Disponible: ${stockActual}kg, solicitado: ${item.cantidadKg}kg.`
        );
      }
      if (Number(item.cantidadKg) <= 0 || Number(item.precioKg) <= 0) {
        throw new Error('La cantidad y el precio de venta deben ser mayores a cero.');
      }

      const subtotal = Number(item.cantidadKg) * Number(item.precioKg);
      montoTotal += subtotal;

      detallesCalculados.push({
        loteProductoId: lote.id,
        cantidadKg: Number(item.cantidadKg),
        precioKg: Number(item.precioKg),
        subtotal,
        costoKgMomento: Number(lote.costoKg), // se copia el costo actual, queda fijo en el historial
      });
    }

    const venta = await tx.venta.create({
      data: {
        clienteId: Number(clienteId),
        fechaVenta: fechaVenta ? new Date(fechaVenta) : new Date(),
        condicionPago: condicionPago || 'contado',
        montoTotal,
        estado: condicionPago === 'credito' ? 'pendiente' : 'pagada',
        usuarioId: usuarioId || null,
      },
    });

    for (const detalle of detallesCalculados) {
      await tx.ventaDetalle.create({ data: { ventaId: venta.id, ...detalle } });

      // Descontar inventario
      await tx.inventarioMovimiento.create({
        data: {
          loteProductoId: detalle.loteProductoId,
          tipoMovimiento: 'salida',
          cantidadKg: detalle.cantidadKg,
          motivo: 'venta',
          referenciaId: venta.id,
        },
      });

      // Si el stock del lote llega a cero, marcarlo como agotado
      const loteActualizado = await tx.loteProductoTerminado.findUnique({
        where: { id: detalle.loteProductoId },
        include: { movimientosInventario: true },
      });
      const stockRestante = calcularStockLote(loteActualizado.movimientosInventario);
      if (stockRestante <= 0) {
        await tx.loteProductoTerminado.update({
          where: { id: detalle.loteProductoId },
          data: { estado: 'agotado' },
        });
      }
    }

    let cuentaPorCobrar = null;
    if (condicionPago === 'credito') {
      const cliente = await tx.cliente.findUnique({ where: { id: Number(clienteId) } });
      const diasCredito = cliente?.diasCredito || 30;
      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + diasCredito);

      cuentaPorCobrar = await tx.cuentaPorCobrar.create({
        data: {
          ventaId: venta.id,
          montoOriginal: montoTotal,
          saldoPendiente: montoTotal,
          fechaVencimiento,
          estado: 'vigente',
        },
      });
    }

    return { venta, cuentaPorCobrar };
  });

  return resultado;
}

// Rentabilidad por cliente: suma el margen real de todas sus ventas historicas
async function rentabilidadPorCliente() {
  const clientes = await prisma.cliente.findMany({
    include: {
      ventas: { include: { detalle: true } },
    },
  });

  return clientes.map((cliente) => {
    let totalVendidoKg = 0;
    let totalIngresos = 0;
    let totalCosto = 0;

    for (const venta of cliente.ventas) {
      for (const d of venta.detalle) {
        totalVendidoKg += Number(d.cantidadKg);
        totalIngresos += Number(d.subtotal);
        totalCosto += Number(d.cantidadKg) * Number(d.costoKgMomento);
      }
    }

    const margen = totalIngresos - totalCosto;

    return {
      clienteId: cliente.id,
      cliente: cliente.nombre,
      totalVendidoKg,
      totalIngresos,
      margen,
      margenPct: totalIngresos > 0 ? (margen / totalIngresos) * 100 : 0,
    };
  }).filter((c) => c.totalVendidoKg > 0)
    .sort((a, b) => b.margen - a.margen);
}

module.exports = { listarVentas, obtenerVenta, registrarVenta, rentabilidadPorCliente };
