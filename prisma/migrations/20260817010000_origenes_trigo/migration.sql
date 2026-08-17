CREATE TABLE "origenes_trigo" (
  "id" SERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL UNIQUE,
  "activo" BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE "compras" ADD COLUMN "origen_id" INTEGER REFERENCES "origenes_trigo"("id");

INSERT INTO "origenes_trigo" ("nombre") VALUES
  ('Nacional Arequipa'),
  ('Importado');
