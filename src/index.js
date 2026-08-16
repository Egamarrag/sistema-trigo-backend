// Punto de entrada del sistema. Aqui se "encienden" todos los modulos.

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Registro de modulos (cada uno agrega mas rutas conforme avanzamos)
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/usuarios', require('./modules/usuarios/usuarios.routes'));
app.use('/api/proveedores', require('./modules/proveedores/proveedores.routes'));
app.use('/api/clientes', require('./modules/clientes/clientes.routes'));
app.use('/api/productos', require('./modules/productos/productos.routes'));
app.use('/api/compras', require('./modules/compras/compras.routes'));
app.use('/api/produccion', require('./modules/produccion/produccion.routes'));
app.use('/api/inventario', require('./modules/inventario/inventario.routes'));
app.use('/api/ventas', require('./modules/ventas/ventas.routes'));
app.use('/api/trabajadores', require('./modules/trabajadores/trabajadores.routes'));
app.use('/api/maquinaria', require('./modules/maquinaria/maquinaria.routes'));
app.use('/api/caja', require('./modules/caja/caja.routes'));
app.use('/api/cuentas-por-cobrar', require('./modules/cxc/cxc.routes'));
app.use('/api/cuentas-por-pagar', require('./modules/cxp/cxp.routes'));
app.use('/api/gastos', require('./modules/gastos/gastos.routes'));
app.use('/api/auditoria', require('./modules/auditoria/auditoria.routes'));
app.use('/api/dashboard', require('./modules/dashboard/dashboard.routes'));

// Ruta de prueba para confirmar que el servidor esta vivo
app.get('/api/salud', (req, res) => {
  res.json({ estado: 'ok', mensaje: 'Sistema Trigo funcionando correctamente.' });
});

const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, () => {
  console.log(`Servidor corriendo en el puerto ${PUERTO}`);
});
