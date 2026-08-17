const prisma = require('../../config/db');

async function listarCuentasPorPagar({ soloVigentes = false } = {}) {
  return prisma.cuentaPorPagar.findMany({
    where: soloVigentes ? { estado: { not: 'pagada' } } : {},
    include: { proveedor: true, compra: true },
    orderBy: { fechaVencimiento: 'asc' },
  });
}

async function totalPorPagar() {
  const cuentas = await prisma.cuentaPorPagar.findMany({ where: { estado: { not: 'pagada' } } });
  return cuentas.reduce((s, c) => s + Number(c.saldoPendiente), 0);
}

module.exports = { listarCuentasPorPagar, totalPorPagar };
