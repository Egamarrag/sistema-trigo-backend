const prisma = require('../../config/db');

// Genera un codigo legible tipo LC-2026-0001 (LC = Lote de Compra)
async function generarCodigoLote() {
  const anio = new Date().getFullYear();
  const cantidad = await prisma.loteCompra.count({
    where: { codigoLote: { startsWith: `LC-${anio}-` } },
  });
  const correlativo = String(cantidad + 1).padStart(4, '0');
  return `LC-${anio}-${correlativo}`;
}

async function listarCompras() {
  return prisma.compra.findMany({
    include: { proveedor: true, lotesCompra: true, cuentaPorPagar: true },
    orderBy: { fechaCompra: 'desc' },
  });
}

async function obtenerCompra(id) {
  const compra = await prisma.compra.findUnique({
    where: { id: Number(id) },
    include: { proveedor: true, lotesCompra: true, cuentaPorPagar: true },
  });
  if (!compra) throw new Error('Compra no encontrada.');
  return compra;
}

// Registrar una compra hace TRES cosas a la vez, de forma segura (todo o nada):
// 1. Crea el registro de la compra
// 2. Genera automaticamente su lote de materia prima
// 3. Si es a credito, genera la cuenta por pagar al proveedor
async function registrarCompra(datos) {
  const { proveedorId, fechaCompra, pesoBrutoKg, precioKg, humedadPct, condicionPago, usuarioId } = datos;

  if (!proveedorId || !pesoBrutoKg || !precioKg) {
    throw new Error('Debes indicar proveedor, peso comprado y precio por kilogramo.');
  }
  if (Number(pesoBrutoKg) <= 0 || Number(precioKg) <= 0) {
    throw new Error('El peso y el precio deben ser mayores a cero.');
  }

  const montoTotal = Number(pesoBrutoKg) * Number(precioKg);
  const codigoLote = await generarCodigoLote();

  const resultado = await prisma.$transaction(async (tx) => {
    const compra = await tx.compra.create({
      data: {
        proveedorId: Number(proveedorId),
        fechaCompra: fechaCompra ? new Date(fechaCompra) : new Date(),
        pesoBrutoKg: Number(pesoBrutoKg),
        precioKg: Number(precioKg),
        montoTotal,
        humedadPct: humedadPct ? Number(humedadPct) : null,
        condicionPago: condicionPago || 'contado',
        usuarioId: usuarioId || null,
      },
    });

    const loteCompra = await tx.loteCompra.create({
      data: {
        compraId: compra.id,
        codigoLote,
        pesoKg: Number(pesoBrutoKg),
        estado: 'disponible',
      },
    });

    let cuentaPorPagar = null;
    if (condicionPago === 'credito') {
      cuentaPorPagar = await tx.cuentaPorPagar.create({
        data: {
          compraId: compra.id,
          proveedorId: Number(proveedorId),
          montoOriginal: montoTotal,
          saldoPendiente: montoTotal,
          estado: 'vigente',
        },
      });
    }

    return { compra, loteCompra, cuentaPorPagar };
  });

  return resultado;
}

module.exports = { listarCompras, obtenerCompra, registrarCompra };
