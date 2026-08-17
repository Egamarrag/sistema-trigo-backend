const prisma = require('../../config/db');

async function generarCodigoProceso() {
  const anio = new Date().getFullYear();
  const cantidad = await prisma.produccionProceso.count({
    where: { codigoProceso: { startsWith: `PR-${anio}-` } },
  });
  return `PR-${anio}-${String(cantidad + 1).padStart(4, '0')}`;
}

async function generarCodigoLoteTerminado() {
  const anio = new Date().getFullYear();
  const cantidad = await prisma.loteProductoTerminado.count({
    where: { codigoLote: { startsWith: `LT-${anio}-` } },
  });
  return `LT-${anio}-${String(cantidad + 1).padStart(4, '0')}`;
}

async function listarProcesos() {
  return prisma.produccionProceso.findMany({
    include: {
      insumosLote: { include: { loteCompra: true } },
      mermas: true,
      lotesTerminados: true,
    },
    orderBy: { fechaInicio: 'desc' },
  });
}

async function obtenerProceso(id) {
  const proceso = await prisma.produccionProceso.findUnique({
    where: { id: Number(id) },
    include: {
      insumosLote: { include: { loteCompra: { include: { compra: true } } } },
      manoDeObra: { include: { trabajador: true } },
      maquinariaUso: { include: { maquinaria: true } },
      insumosAdicionales: true,
      mermas: true,
      lotesTerminados: { include: { presentacion: true } },
    },
  });
  if (!proceso) throw new Error('Proceso de produccion no encontrado.');
  return proceso;
}

// PASO 1: Iniciar un proceso, indicando que lotes de compra (uno o varios) se van a usar.
// Esto es lo que resuelve tu caso real: mezclar compras distintas en un mismo lavado/secado.
async function iniciarProceso({ tipoProceso, fechaInicio, lotesUtilizados, usuarioId, observaciones }) {
  if (!lotesUtilizados || lotesUtilizados.length === 0) {
    throw new Error('Debes indicar al menos un lote de compra para iniciar la produccion.');
  }

  const codigoProceso = await generarCodigoProceso();

  const resultado = await prisma.$transaction(async (tx) => {
    let pesoEntradaTotal = 0;

    // Verificar que cada lote de compra tenga suficiente peso disponible
    for (const item of lotesUtilizados) {
      const lote = await tx.loteCompra.findUnique({ where: { id: Number(item.loteCompraId) } });
      if (!lote) throw new Error(`El lote de compra indicado no existe.`);
      if (lote.estado === 'agotado') {
        throw new Error(`El lote ${lote.codigoLote} ya esta agotado, no se puede usar de nuevo.`);
      }
      if (Number(item.pesoUtilizadoKg) > Number(lote.pesoKg)) {
        throw new Error(`No puedes usar ${item.pesoUtilizadoKg}kg del lote ${lote.codigoLote}, solo tiene ${lote.pesoKg}kg disponibles.`);
      }
      pesoEntradaTotal += Number(item.pesoUtilizadoKg);
    }

    const proceso = await tx.produccionProceso.create({
      data: {
        codigoProceso,
        tipoProceso,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : new Date(),
        pesoEntradaKg: pesoEntradaTotal,
        estado: 'en_proceso',
        usuarioId: usuarioId || null,
        observaciones: observaciones || null,
      },
    });

    // Registrar que lotes de compra alimentan este proceso (tabla puente)
    // y marcar esos lotes como "en_proceso" para que no se puedan reutilizar sin control
    for (const item of lotesUtilizados) {
      await tx.produccionInsumoLote.create({
        data: {
          procesoId: proceso.id,
          loteCompraId: Number(item.loteCompraId),
          pesoUtilizadoKg: Number(item.pesoUtilizadoKg),
        },
      });
      await tx.loteCompra.update({
        where: { id: Number(item.loteCompraId) },
        data: { estado: 'en_proceso' },
      });
    }

    return proceso;
  });

  return resultado;
}

// PASO 2: Mientras el proceso esta en curso, se van agregando costos: mano de obra,
// uso de maquinaria, insumos (agua, quimicos, empaque). Se pueden agregar de a uno.

async function agregarManoObra(procesoId, { trabajadorId, jornadaCompleta, horasExtra, horasNocturnas }) {
  await validarProcesoAbierto(procesoId);

  const trabajador = await prisma.trabajador.findUnique({ where: { id: Number(trabajadorId) } });
  if (!trabajador) throw new Error('Trabajador no encontrado.');

  const esJornadaCompleta = jornadaCompleta !== false;
  const horasExtraNum = Number(horasExtra) || 0;
  const horasNocturnasNum = Number(horasNocturnas) || 0;

  if (horasExtraNum > 0 && !trabajador.tarifaHoraExtra) {
    throw new Error(`${trabajador.nombreCompleto} no tiene definida una tarifa de hora extra. Agregala en su ficha en Trabajadores.`);
  }
  if (horasNocturnasNum > 0 && !trabajador.tarifaHoraNocturna) {
    throw new Error(`${trabajador.nombreCompleto} no tiene definida una tarifa de hora nocturna. Agregala en su ficha en Trabajadores.`);
  }

  const costoCalculado =
    (esJornadaCompleta ? Number(trabajador.tarifaReferencial) : 0) +
    horasExtraNum * Number(trabajador.tarifaHoraExtra || 0) +
    horasNocturnasNum * Number(trabajador.tarifaHoraNocturna || 0);

  return prisma.produccionManoObra.create({
    data: {
      procesoId: Number(procesoId),
      trabajadorId: Number(trabajadorId),
      jornadaCompleta: esJornadaCompleta,
      horasExtra: horasExtraNum,
      horasNocturnas: horasNocturnasNum,
      costoCalculado,
    },
  });
}

async function agregarMaquinariaUso(procesoId, { maquinariaId, horasUso }) {
  await validarProcesoAbierto(procesoId);
  const maquina = await prisma.maquinaria.findUnique({ where: { id: Number(maquinariaId) } });
  if (!maquina) throw new Error('Maquinaria no encontrada.');

  const costoCalculado = Number(horasUso) * Number(maquina.costoHoraOperacion);

  return prisma.produccionMaquinariaUso.create({
    data: {
      procesoId: Number(procesoId),
      maquinariaId: Number(maquinariaId),
      horasUso: Number(horasUso),
      costoCalculado,
    },
  });
}

async function agregarInsumoAdicional(procesoId, { descripcion, costo }) {
  await validarProcesoAbierto(procesoId);
  if (!descripcion || Number(costo) < 0) {
    throw new Error('El insumo necesita una descripcion y un costo valido.');
  }
  return prisma.produccionInsumoAdicional.create({
    data: { procesoId: Number(procesoId), descripcion, costo: Number(costo) },
  });
}

async function registrarMerma(procesoId, { pesoKg, motivo, observaciones }) {
  await validarProcesoAbierto(procesoId);
  if (!pesoKg || Number(pesoKg) <= 0) {
    throw new Error('El peso de la merma debe ser mayor a cero.');
  }
  return prisma.merma.create({
    data: {
      procesoId: Number(procesoId),
      pesoKg: Number(pesoKg),
      motivo: motivo || 'otro',
      observaciones: observaciones || null,
    },
  });
}

// Permite sumar MAS lotes de compra a un proceso que ya esta en marcha.
// Esto resuelve el caso real de combinar 2 o 3 lotes que empezaron por separado
// (cada uno con su propio raspado/secado) y se juntan mas adelante, por ejemplo al encostalar.
async function agregarLoteAProceso(procesoId, { loteCompraId, pesoUtilizadoKg }) {
  await validarProcesoAbierto(procesoId);

  if (!loteCompraId || !pesoUtilizadoKg || Number(pesoUtilizadoKg) <= 0) {
    throw new Error('Debes indicar el lote de compra y un peso mayor a cero.');
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const lote = await tx.loteCompra.findUnique({ where: { id: Number(loteCompraId) } });
    if (!lote) throw new Error('El lote de compra indicado no existe.');
    if (lote.estado === 'agotado') {
      throw new Error(`El lote ${lote.codigoLote} ya esta agotado, no se puede usar de nuevo.`);
    }
    if (Number(pesoUtilizadoKg) > Number(lote.pesoKg)) {
      throw new Error(`No puedes usar ${pesoUtilizadoKg}kg del lote ${lote.codigoLote}, solo tiene ${lote.pesoKg}kg disponibles.`);
    }

    const insumo = await tx.produccionInsumoLote.create({
      data: {
        procesoId: Number(procesoId),
        loteCompraId: Number(loteCompraId),
        pesoUtilizadoKg: Number(pesoUtilizadoKg),
      },
    });

    await tx.loteCompra.update({
      where: { id: Number(loteCompraId) },
      data: { estado: 'en_proceso' },
    });

    // Actualizar el peso de entrada total del proceso, sumando este nuevo lote
    const proceso = await tx.produccionProceso.findUnique({ where: { id: Number(procesoId) } });
    await tx.produccionProceso.update({
      where: { id: Number(procesoId) },
      data: { pesoEntradaKg: Number(proceso.pesoEntradaKg || 0) + Number(pesoUtilizadoKg) },
    });

    return insumo;
  });

  return resultado;
}

async function validarProcesoAbierto(procesoId) {
  const proceso = await prisma.produccionProceso.findUnique({ where: { id: Number(procesoId) } });
  if (!proceso) throw new Error('Proceso de produccion no encontrado.');
  if (proceso.estado === 'finalizado') {
    throw new Error('Este proceso ya fue finalizado, no se pueden agregar mas costos.');
  }
}

// PASO 3: Finalizar el proceso. Aqui es donde ocurre el calculo automatico de costos
// que definimos como regla de negocio, y se genera el o los lotes de producto terminado.
async function finalizarProceso(procesoId, { lotesTerminadosGenerados }) {
  if (!lotesTerminadosGenerados || lotesTerminadosGenerados.length === 0) {
    throw new Error('Debes indicar al menos un lote de producto terminado generado por este proceso.');
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const proceso = await tx.produccionProceso.findUnique({
      where: { id: Number(procesoId) },
      include: {
        insumosLote: { include: { loteCompra: { include: { compra: true } } } },
        manoDeObra: true,
        maquinariaUso: true,
        insumosAdicionales: true,
        mermas: true,
      },
    });

    if (!proceso) throw new Error('Proceso de produccion no encontrado.');
    if (proceso.estado === 'finalizado') throw new Error('Este proceso ya fue finalizado.');

    // --- CALCULO 1: costo de materia prima ---
    // Se prorratea segun cuanto peso de cada lote de compra se uso en este proceso
    let costoMateriaPrima = 0;
    for (const insumo of proceso.insumosLote) {
      const precioKgOriginal = Number(insumo.loteCompra.compra.precioKg);
      costoMateriaPrima += Number(insumo.pesoUtilizadoKg) * precioKgOriginal;
    }

    // --- CALCULO 2: costo de procesamiento ---
    const costoManoObra = proceso.manoDeObra.reduce((s, m) => s + Number(m.costoCalculado), 0);
    const costoMaquinaria = proceso.maquinariaUso.reduce((s, m) => s + Number(m.costoCalculado), 0);
    const costoInsumos = proceso.insumosAdicionales.reduce((s, i) => s + Number(i.costo), 0);
    const costoProcesamiento = costoManoObra + costoMaquinaria + costoInsumos;

    const costoTotalProceso = costoMateriaPrima + costoProcesamiento;

    // --- CALCULO 3: peso de salida y merma ---
    const pesoSalidaTotal = lotesTerminadosGenerados.reduce((s, l) => s + Number(l.pesoKg), 0);
    const pesoMermaRegistrada = proceso.mermas.reduce((s, m) => s + Number(m.pesoKg), 0);
    const pesoEntrada = Number(proceso.pesoEntradaKg);

    // Verificacion de consistencia: entrada debe ser aprox igual a salida + merma
    const diferencia = pesoEntrada - (pesoSalidaTotal + pesoMermaRegistrada);
    if (Math.abs(diferencia) > 0.5) {
      throw new Error(
        `Los pesos no cuadran: entraron ${pesoEntrada}kg, pero salida + merma registrada suman ${(pesoSalidaTotal + pesoMermaRegistrada).toFixed(2)}kg. ` +
        `Revisa si falta registrar merma o si el peso del producto terminado esta mal.`
      );
    }

    // --- CALCULO 4: costo por kg y generacion de lotes terminados ---
    // El costo total del proceso se reparte entre los lotes terminados segun su peso
    const lotesCreados = [];
    for (const item of lotesTerminadosGenerados) {
      const proporcion = Number(item.pesoKg) / pesoSalidaTotal;
      const costoTotalLote = costoTotalProceso * proporcion;
      const costoKg = costoTotalLote / Number(item.pesoKg);
      const codigoLote = await generarCodigoLoteTerminado();

      const loteCreado = await tx.loteProductoTerminado.create({
        data: {
          procesoId: proceso.id,
          presentacionId: Number(item.presentacionId),
          codigoLote,
          pesoKg: Number(item.pesoKg),
          costoTotalLote,
          costoKg,
          estado: 'disponible',
        },
      });

      // Movimiento de inventario: ingreso de producto terminado
      await tx.inventarioMovimiento.create({
        data: {
          loteProductoId: loteCreado.id,
          tipoMovimiento: 'ingreso',
          cantidadKg: Number(item.pesoKg),
          motivo: 'produccion',
        },
      });

      lotesCreados.push(loteCreado);
    }

    // Marcar los lotes de compra usados como agotados
    for (const insumo of proceso.insumosLote) {
      await tx.loteCompra.update({
        where: { id: insumo.loteCompraId },
        data: { estado: 'agotado' },
      });
    }

    // Cerrar el proceso
    const procesoFinalizado = await tx.produccionProceso.update({
      where: { id: proceso.id },
      data: {
        estado: 'finalizado',
        fechaFin: new Date(),
        pesoSalidaKg: pesoSalidaTotal,
      },
    });

    return {
      proceso: procesoFinalizado,
      lotesCreados,
      resumenCostos: {
        costoMateriaPrima,
        costoProcesamiento,
        costoTotalProceso,
        porcentajeMerma: pesoEntrada > 0 ? (pesoMermaRegistrada / pesoEntrada) * 100 : 0,
      },
    };
  });

  return resultado;
}

module.exports = {
  listarProcesos,
  obtenerProceso,
  iniciarProceso,
  agregarLoteAProceso,
  agregarManoObra,
  agregarMaquinariaUso,
  agregarInsumoAdicional,
  registrarMerma,
  finalizarProceso,
};
