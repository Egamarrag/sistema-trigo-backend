const prisma = require('../../config/db');

// Este es el modulo que junta informacion de TODO el sistema para dar
// una foto completa del negocio: ventas, gastos, deudas, inventario, utilidad.

async function obtenerResumenGeneral({ desde, hasta } = {}) {
  const filtroFecha = {};
  if (desde || hasta) {
    filtroFecha.gte = desde ? new Date(desde) : undefined;
    filtroFecha.lte = hasta ? new Date(hasta) : undefined;
  }
  const whereFecha = (desde || hasta) ? { fechaVenta: filtroFecha } : {};
  const whereFechaGasto = (desde || hasta) ? { fecha: filtroFecha } : {};

  // --- Ventas y margenes del periodo ---
  const ventas = await prisma.venta.findMany({
    where: { ...whereFecha, estado: { not: 'anulada' } },
    include: { detalle: true },
  });

  let totalVentas = 0;
  let totalCostoVendido = 0;
  let totalKgVendidos = 0;

  for (const venta of ventas) {
    for (const d of venta.detalle) {
      totalVentas += Number(d.subtotal);
      totalCostoVendido += Number(d.cantidadKg) * Number(d.costoKgMomento);
      totalKgVendidos += Number(d.cantidadKg);
    }
  }

  const margenBruto = totalVentas - totalCostoVendido;
  const margenBrutoPct = totalVentas > 0 ? (margenBruto / totalVentas) * 100 : 0;
  const precioPromedioVenta = totalKgVendidos > 0 ? totalVentas / totalKgVendidos : 0;

  // --- Gastos del periodo ---
  const gastos = await prisma.gasto.findMany({ where: whereFechaGasto });
  const totalGastos = gastos.reduce((s, g) => s + Number(g.monto), 0);

  const utilidadEstimada = margenBruto - totalGastos;

  // --- Cuentas por cobrar y por pagar (siempre el estado actual, no del periodo) ---
  const cuentasPorCobrar = await prisma.cuentaPorCobrar.findMany({ where: { estado: { not: 'pagada' } } });
  const totalPorCobrar = cuentasPorCobrar.reduce((s, c) => s + Number(c.saldoPendiente), 0);

  const cuentasPorPagar = await prisma.cuentaPorPagar.findMany({ where: { estado: { not: 'pagada' } } });
  const totalPorPagar = cuentasPorPagar.reduce((s, c) => s + Number(c.saldoPendiente), 0);

  // --- Caja: saldo actual total ---
  const cuentasTesoreria = await prisma.cuentaTesoreria.findMany({ where: { activo: true } });
  const saldoCajaTotal = cuentasTesoreria.reduce((s, c) => s + Number(c.saldoActual), 0);

  // --- Inventario disponible (valorizado a costo) ---
  const lotesDisponibles = await prisma.loteProductoTerminado.findMany({
    where: { estado: 'disponible' },
    include: { movimientosInventario: true },
  });
  let inventarioTotalKg = 0;
  let inventarioValorizado = 0;
  for (const lote of lotesDisponibles) {
    const stock = lote.movimientosInventario.reduce((s, m) => {
      if (m.tipoMovimiento === 'ingreso') return s + Number(m.cantidadKg);
      if (m.tipoMovimiento === 'salida') return s - Number(m.cantidadKg);
      return s + Number(m.cantidadKg);
    }, 0);
    inventarioTotalKg += stock;
    inventarioValorizado += stock * Number(lote.costoKg || 0);
  }

  // --- Produccion y mermas del periodo ---
  const procesos = await prisma.produccionProceso.findMany({
    where: { estado: 'finalizado' },
    include: { mermas: true },
  });
  let pesoEntradaTotal = 0;
  let pesoMermaTotal = 0;
  for (const p of procesos) {
    pesoEntradaTotal += Number(p.pesoEntradaKg || 0);
    pesoMermaTotal += p.mermas.reduce((s, m) => s + Number(m.pesoKg), 0);
  }
  const porcentajeMermaPromedio = pesoEntradaTotal > 0 ? (pesoMermaTotal / pesoEntradaTotal) * 100 : 0;

  // --- Kg procesados por origen (nacional, importado, por zona) ---
  const insumosUsados = await prisma.produccionInsumoLote.findMany({
    include: { loteCompra: { include: { compra: { include: { origen: true } } } } },
  });
  const kgPorOrigen = {};
  for (const insumo of insumosUsados) {
    const nombreOrigen = insumo.loteCompra.compra.origen?.nombre || 'Sin origen especificado';
    kgPorOrigen[nombreOrigen] = (kgPorOrigen[nombreOrigen] || 0) + Number(insumo.pesoUtilizadoKg);
  }
  const origenes = Object.entries(kgPorOrigen).map(([nombre, kg]) => ({ nombre, kg }));

  return {
    ventas: {
      totalVentas,
      totalKgVendidos,
      precioPromedioVenta,
      margenBruto,
      margenBrutoPct,
    },
    gastos: { totalGastos },
    utilidadEstimada,
    cuentasPorCobrar: { totalPorCobrar, cantidadCuentas: cuentasPorCobrar.length },
    cuentasPorPagar: { totalPorPagar, cantidadCuentas: cuentasPorPagar.length },
    caja: { saldoCajaTotal, detalleCuentas: cuentasTesoreria },
    inventario: { inventarioTotalKg, inventarioValorizado },
    produccion: { porcentajeMermaPromedio, procesosFinalizados: procesos.length, origenes },
  };
}

module.exports = { obtenerResumenGeneral };
