const prisma = require('../../config/db');

// Cualquier modulo puede llamar a esta funcion para dejar rastro de un cambio importante.
// No detiene la operacion principal si falla (la auditoria nunca debe romper el negocio).
async function registrarAuditoria({ usuarioId, tablaAfectada, registroId, accion, datosAntes, datosDespues }) {
  try {
    await prisma.auditoriaLog.create({
      data: {
        usuarioId: usuarioId || null,
        tablaAfectada,
        registroId: Number(registroId),
        accion,
        datosAntes: datosAntes || null,
        datosDespues: datosDespues || null,
      },
    });
  } catch (error) {
    console.error('No se pudo registrar auditoria:', error.message);
  }
}

async function listarAuditoria({ tabla, usuarioId, desde, hasta } = {}) {
  const where = {};
  if (tabla) where.tablaAfectada = tabla;
  if (usuarioId) where.usuarioId = Number(usuarioId);
  if (desde || hasta) {
    where.fechaHora = {};
    if (desde) where.fechaHora.gte = new Date(desde);
    if (hasta) where.fechaHora.lte = new Date(hasta);
  }

  return prisma.auditoriaLog.findMany({
    where,
    include: { usuario: { select: { nombreCompleto: true, usuario: true } } },
    orderBy: { fechaHora: 'desc' },
    take: 500, // limite razonable para no sobrecargar la pantalla
  });
}

module.exports = { registrarAuditoria, listarAuditoria };
