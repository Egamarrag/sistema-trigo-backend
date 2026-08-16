// Este script se ejecuta UNA VEZ al preparar el sistema.
// Crea los roles basicos y tu usuario Administrador para que puedas
// entrar al sistema por primera vez.

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Creando roles del sistema...');

  const roles = ['Administrador', 'Operario', 'Vendedor', 'Contador'];
  const rolesCreados = {};

  for (const nombre of roles) {
    const rol = await prisma.rol.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
    rolesCreados[nombre] = rol;
    console.log(`  - Rol "${nombre}" listo.`);
  }

  console.log('Creando tu usuario Administrador...');

  const passwordHash = await bcrypt.hash('trigo2026', 10);

  await prisma.usuario.upsert({
    where: { usuario: 'erick' },
    update: {},
    create: {
      nombreCompleto: 'Erick (Administrador)',
      usuario: 'erick',
      passwordHash,
      rolId: rolesCreados['Administrador'].id,
    },
  });

  console.log('Creando un producto de ejemplo con sus presentaciones...');

  const productoExistente = await prisma.producto.findFirst({
    where: { nombre: 'Trigo procesado' },
  });

  if (!productoExistente) {
    await prisma.producto.create({
      data: {
        nombre: 'Trigo procesado',
        descripcion: 'Producto de ejemplo. Puedes editarlo o crear tus propias variedades desde el sistema.',
        presentaciones: {
          create: [
            { nombre: 'Saco 50kg', pesoKg: 50 },
            { nombre: 'Granel (por kg)', pesoKg: 1 },
          ],
        },
      },
    });
    console.log('  - Producto de ejemplo creado. Puedes editarlo desde el sistema.');
  }

  console.log('Creando tus cuentas de dinero (caja, Yape, banco)...');

  const cuentas = [
    { nombre: 'Caja efectivo', tipo: 'efectivo' },
    { nombre: 'Yape', tipo: 'billetera_digital' },
    { nombre: 'Interbank', tipo: 'banco' },
  ];

  for (const cuenta of cuentas) {
    const existente = await prisma.cuentaTesoreria.findFirst({ where: { nombre: cuenta.nombre } });
    if (!existente) {
      await prisma.cuentaTesoreria.create({ data: cuenta });
      console.log(`  - Cuenta "${cuenta.nombre}" creada.`);
    }
  }

  console.log('');
  console.log('Listo. Puedes iniciar sesion con:');
  console.log('  Usuario:     erick');
  console.log('  Contrasena:  trigo2026');
  console.log('');
  console.log('IMPORTANTE: cambia esta contrasena la primera vez que ingreses.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
