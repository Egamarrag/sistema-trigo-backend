-- Migracion inicial: crea todas las tablas del Sistema Trigo

CREATE TYPE "CondicionPago" AS ENUM ('contado', 'credito');
CREATE TYPE "TipoPago" AS ENUM ('jornal', 'destajo', 'fijo');
CREATE TYPE "EstadoMaquinaria" AS ENUM ('operativa', 'mantenimiento', 'baja');
CREATE TYPE "TipoCuentaTesoreria" AS ENUM ('efectivo', 'billetera_digital', 'banco');
CREATE TYPE "EstadoLoteCompra" AS ENUM ('disponible', 'en_proceso', 'agotado');
CREATE TYPE "EstadoProceso" AS ENUM ('en_proceso', 'finalizado');
CREATE TYPE "MotivoMerma" AS ENUM ('humedad', 'plagas', 'error_manejo', 'otro');
CREATE TYPE "EstadoLoteProducto" AS ENUM ('disponible', 'agotado');
CREATE TYPE "TipoMovimientoInventario" AS ENUM ('ingreso', 'salida', 'ajuste');
CREATE TYPE "EstadoVenta" AS ENUM ('pendiente', 'pagada_parcial', 'pagada', 'anulada');
CREATE TYPE "EstadoCuenta" AS ENUM ('vigente', 'vencida', 'pagada');
CREATE TYPE "TipoPagoCobro" AS ENUM ('cobro_cliente', 'pago_proveedor');
CREATE TYPE "TipoMovimientoCaja" AS ENUM ('ingreso', 'egreso');

CREATE TABLE "roles" (
  "id" SERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL UNIQUE,
  "descripcion" TEXT,
  "creado_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "usuarios" (
  "id" SERIAL PRIMARY KEY,
  "nombre_completo" TEXT NOT NULL,
  "usuario" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "rol_id" INTEGER NOT NULL REFERENCES "roles"("id"),
  "telefono" TEXT,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "creado_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "permisos" (
  "id" SERIAL PRIMARY KEY,
  "modulo" TEXT NOT NULL,
  "accion" TEXT NOT NULL,
  UNIQUE("modulo", "accion")
);

CREATE TABLE "rol_permiso" (
  "rol_id" INTEGER NOT NULL REFERENCES "roles"("id"),
  "permiso_id" INTEGER NOT NULL REFERENCES "permisos"("id"),
  PRIMARY KEY ("rol_id", "permiso_id")
);

CREATE TABLE "auditoria_log" (
  "id" SERIAL PRIMARY KEY,
  "usuario_id" INTEGER REFERENCES "usuarios"("id"),
  "tabla_afectada" TEXT NOT NULL,
  "registro_id" INTEGER NOT NULL,
  "accion" TEXT NOT NULL,
  "datos_antes" JSONB,
  "datos_despues" JSONB,
  "fecha_hora" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "proveedores" (
  "id" SERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "documento_tipo" TEXT,
  "documento_numero" TEXT,
  "telefono" TEXT,
  "direccion" TEXT,
  "zona_procedencia" TEXT,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "creado_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "clientes" (
  "id" SERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "documento_tipo" TEXT,
  "documento_numero" TEXT,
  "telefono" TEXT,
  "direccion" TEXT,
  "condicion_pago" "CondicionPago" NOT NULL DEFAULT 'contado',
  "dias_credito" INTEGER,
  "linea_credito_max" DECIMAL(12,2),
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "creado_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "productos" (
  "id" SERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "unidad_base" TEXT NOT NULL DEFAULT 'kg',
  "activo" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE "presentaciones" (
  "id" SERIAL PRIMARY KEY,
  "producto_id" INTEGER NOT NULL REFERENCES "productos"("id"),
  "nombre" TEXT NOT NULL,
  "peso_kg" DECIMAL(10,3) NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE "trabajadores" (
  "id" SERIAL PRIMARY KEY,
  "nombre_completo" TEXT NOT NULL,
  "documento" TEXT,
  "telefono" TEXT,
  "tipo_pago" "TipoPago" NOT NULL,
  "tarifa_referencial" DECIMAL(10,2) NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE "maquinaria" (
  "id" SERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "tipo" TEXT,
  "costo_hora_operacion" DECIMAL(10,2) NOT NULL,
  "fecha_adquisicion" TIMESTAMP,
  "estado" "EstadoMaquinaria" NOT NULL DEFAULT 'operativa'
);

CREATE TABLE "cuentas_tesoreria" (
  "id" SERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "tipo" "TipoCuentaTesoreria" NOT NULL,
  "saldo_actual" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "activo" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE "compras" (
  "id" SERIAL PRIMARY KEY,
  "proveedor_id" INTEGER NOT NULL REFERENCES "proveedores"("id"),
  "fecha_compra" TIMESTAMP NOT NULL,
  "peso_bruto_kg" DECIMAL(10,3) NOT NULL,
  "precio_kg" DECIMAL(10,4) NOT NULL,
  "monto_total" DECIMAL(12,2) NOT NULL,
  "humedad_pct" DECIMAL(5,2),
  "condicion_pago" "CondicionPago" NOT NULL DEFAULT 'contado',
  "usuario_id" INTEGER REFERENCES "usuarios"("id"),
  "creado_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "lotes_compra" (
  "id" SERIAL PRIMARY KEY,
  "compra_id" INTEGER NOT NULL REFERENCES "compras"("id"),
  "codigo_lote" TEXT NOT NULL UNIQUE,
  "peso_kg" DECIMAL(10,3) NOT NULL,
  "estado" "EstadoLoteCompra" NOT NULL DEFAULT 'disponible',
  "fecha_ingreso" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "produccion_procesos" (
  "id" SERIAL PRIMARY KEY,
  "codigo_proceso" TEXT NOT NULL UNIQUE,
  "fecha_inicio" TIMESTAMP NOT NULL,
  "fecha_fin" TIMESTAMP,
  "tipo_proceso" TEXT NOT NULL,
  "peso_entrada_kg" DECIMAL(10,3),
  "peso_salida_kg" DECIMAL(10,3),
  "estado" "EstadoProceso" NOT NULL DEFAULT 'en_proceso',
  "usuario_id" INTEGER REFERENCES "usuarios"("id"),
  "observaciones" TEXT
);

CREATE TABLE "produccion_insumos_lote" (
  "id" SERIAL PRIMARY KEY,
  "proceso_id" INTEGER NOT NULL REFERENCES "produccion_procesos"("id"),
  "lote_compra_id" INTEGER NOT NULL REFERENCES "lotes_compra"("id"),
  "peso_utilizado_kg" DECIMAL(10,3) NOT NULL
);

CREATE TABLE "produccion_mano_obra" (
  "id" SERIAL PRIMARY KEY,
  "proceso_id" INTEGER NOT NULL REFERENCES "produccion_procesos"("id"),
  "trabajador_id" INTEGER NOT NULL REFERENCES "trabajadores"("id"),
  "horas_trabajadas" DECIMAL(6,2),
  "costo_calculado" DECIMAL(10,2) NOT NULL
);

CREATE TABLE "produccion_maquinaria_uso" (
  "id" SERIAL PRIMARY KEY,
  "proceso_id" INTEGER NOT NULL REFERENCES "produccion_procesos"("id"),
  "maquinaria_id" INTEGER NOT NULL REFERENCES "maquinaria"("id"),
  "horas_uso" DECIMAL(6,2) NOT NULL,
  "costo_calculado" DECIMAL(10,2) NOT NULL
);

CREATE TABLE "produccion_insumos_adicionales" (
  "id" SERIAL PRIMARY KEY,
  "proceso_id" INTEGER NOT NULL REFERENCES "produccion_procesos"("id"),
  "descripcion" TEXT NOT NULL,
  "costo" DECIMAL(10,2) NOT NULL
);

CREATE TABLE "mermas" (
  "id" SERIAL PRIMARY KEY,
  "proceso_id" INTEGER NOT NULL REFERENCES "produccion_procesos"("id"),
  "peso_kg" DECIMAL(10,3) NOT NULL,
  "motivo" "MotivoMerma" NOT NULL,
  "observaciones" TEXT
);

CREATE TABLE "lotes_producto_terminado" (
  "id" SERIAL PRIMARY KEY,
  "proceso_id" INTEGER NOT NULL REFERENCES "produccion_procesos"("id"),
  "presentacion_id" INTEGER NOT NULL REFERENCES "presentaciones"("id"),
  "codigo_lote" TEXT NOT NULL UNIQUE,
  "peso_kg" DECIMAL(10,3) NOT NULL,
  "costo_total_lote" DECIMAL(12,2),
  "costo_kg" DECIMAL(10,4),
  "fecha_produccion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "estado" "EstadoLoteProducto" NOT NULL DEFAULT 'disponible'
);

CREATE TABLE "inventario_movimientos" (
  "id" SERIAL PRIMARY KEY,
  "lote_producto_id" INTEGER NOT NULL REFERENCES "lotes_producto_terminado"("id"),
  "tipo_movimiento" "TipoMovimientoInventario" NOT NULL,
  "cantidad_kg" DECIMAL(10,3) NOT NULL,
  "motivo" TEXT NOT NULL,
  "fecha" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "referencia_id" INTEGER
);

CREATE TABLE "ventas" (
  "id" SERIAL PRIMARY KEY,
  "cliente_id" INTEGER NOT NULL REFERENCES "clientes"("id"),
  "fecha_venta" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "condicion_pago" "CondicionPago" NOT NULL DEFAULT 'contado',
  "monto_total" DECIMAL(12,2),
  "estado" "EstadoVenta" NOT NULL DEFAULT 'pendiente',
  "usuario_id" INTEGER REFERENCES "usuarios"("id")
);

CREATE TABLE "venta_detalle" (
  "id" SERIAL PRIMARY KEY,
  "venta_id" INTEGER NOT NULL REFERENCES "ventas"("id"),
  "lote_producto_id" INTEGER NOT NULL REFERENCES "lotes_producto_terminado"("id"),
  "cantidad_kg" DECIMAL(10,3) NOT NULL,
  "precio_kg" DECIMAL(10,4) NOT NULL,
  "subtotal" DECIMAL(12,2) NOT NULL,
  "costo_kg_momento" DECIMAL(10,4) NOT NULL
);

CREATE TABLE "cuentas_por_cobrar" (
  "id" SERIAL PRIMARY KEY,
  "venta_id" INTEGER NOT NULL UNIQUE REFERENCES "ventas"("id"),
  "monto_original" DECIMAL(12,2) NOT NULL,
  "saldo_pendiente" DECIMAL(12,2) NOT NULL,
  "fecha_vencimiento" TIMESTAMP,
  "estado" "EstadoCuenta" NOT NULL DEFAULT 'vigente'
);

CREATE TABLE "cuentas_por_pagar" (
  "id" SERIAL PRIMARY KEY,
  "compra_id" INTEGER NOT NULL UNIQUE REFERENCES "compras"("id"),
  "proveedor_id" INTEGER NOT NULL REFERENCES "proveedores"("id"),
  "monto_original" DECIMAL(12,2) NOT NULL,
  "saldo_pendiente" DECIMAL(12,2) NOT NULL,
  "fecha_vencimiento" TIMESTAMP,
  "estado" "EstadoCuenta" NOT NULL DEFAULT 'vigente'
);

CREATE TABLE "pagos_cobros" (
  "id" SERIAL PRIMARY KEY,
  "tipo" "TipoPagoCobro" NOT NULL,
  "cuenta_por_cobrar_id" INTEGER REFERENCES "cuentas_por_cobrar"("id"),
  "cuenta_por_pagar_id" INTEGER REFERENCES "cuentas_por_pagar"("id"),
  "cuenta_tesoreria_id" INTEGER NOT NULL REFERENCES "cuentas_tesoreria"("id"),
  "monto" DECIMAL(12,2) NOT NULL,
  "fecha" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "medio_pago" TEXT,
  "usuario_id" INTEGER REFERENCES "usuarios"("id")
);

CREATE TABLE "gastos" (
  "id" SERIAL PRIMARY KEY,
  "categoria" TEXT NOT NULL,
  "descripcion" TEXT,
  "monto" DECIMAL(12,2) NOT NULL,
  "fecha" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cuenta_tesoreria_id" INTEGER NOT NULL REFERENCES "cuentas_tesoreria"("id"),
  "proceso_id" INTEGER REFERENCES "produccion_procesos"("id"),
  "usuario_id" INTEGER REFERENCES "usuarios"("id")
);

CREATE TABLE "caja_movimientos" (
  "id" SERIAL PRIMARY KEY,
  "cuenta_tesoreria_id" INTEGER NOT NULL REFERENCES "cuentas_tesoreria"("id"),
  "tipo" "TipoMovimientoCaja" NOT NULL,
  "monto" DECIMAL(12,2) NOT NULL,
  "origen" TEXT NOT NULL,
  "origen_id" INTEGER,
  "fecha" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
