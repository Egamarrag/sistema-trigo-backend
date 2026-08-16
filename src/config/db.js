// Conexion unica a la base de datos, compartida por todo el sistema.
// Cualquier modulo que necesite hablar con la base de datos importa esto.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
