const prisma = require('../../config/db');

// El stock disponible de cada lote NUNCA se guarda como un numero editable.
// Siempre se calcula sumando los movimientos (ingresos - salidas), para que
// nunca haya inconsistencia entre "lo que dice el sistema" y "lo que paso realmente".

async function listarInventarioDisponible() {
  const lotes = await prisma.loteProductoTerminado.findMany({
    where: { estado: 'disponible' },
    include: {
      presentacion: { include: { producto: true } },
      movimientosInventario: true,
    },
    orderBy: { fechaProduccion: 'desc' },
  });

  return lotes.map((lote) => {
    const stockActual = calcularStockLote(lote.movimientosInventario);
    return {
      id: lote.id,
      codigoLote: lote.codigoLote,
      producto: lote.presentacion.producto.nombre,
      presentacion: lote.presentacion.nombre,
      costoKg: lote.costoKg,
      stockActualKg: stockActual,
      fechaProduccion: lote.fechaProduccion,
    };
  }).filter((l) => l.stockActualKg > 0); // solo mostrar lo que realmente queda
}

function calcularStockLote(movimientos) {
  return movimientos.reduce((stock, mov) => {
    if (mov.tipoMovimiento === 'ingreso') return stock + Number(mov.cantidadKg);
    if (mov.tipoMovimiento === 'salida') return stock - Number(mov.cantidadKg);
    if (mov.tipoMovimiento === 'ajuste') return stock + Number(mov.cantidadKg); // puede ser negativo
    return stock;
  }, 0);
}

async function obtenerStockLote(loteProductoId) {
  const movimientos = await prisma.inventarioMovimiento.findMany({
    where: { loteProductoId: Number(loteProductoId) },
  });
  return calcularStockLote(movimientos);
}

// Ajuste manual de inventario (por ejemplo, si se detecta merma en almacen despues de producido)
async function registrarAjuste(loteProductoId, { cantidadKg, motivo }) {
  if (cantidadKg === undefined || cantidadKg === 0) {
    throw new Error('Debes indicar una cantidad distinta de cero para el ajuste.');
  }
  const stockActual = await obtenerStockLote(loteProductoId);
  if (stockActual + Number(cantidadKg) < 0) {
    throw new Error('Este ajuste dejaria el inventario en negativo. Revisa la cantidad.');
  }

  return prisma.inventarioMovimiento.create({
    data: {
      loteProductoId: Number(loteProductoId),
      tipoMovimiento: 'ajuste',
      cantidadKg: Number(cantidadKg),
      motivo: motivo || 'ajuste_merma_almacen',
    },
  });
}

module.exports = { listarInventarioDisponible, calcularStockLote, obtenerStockLote, registrarAjuste };
