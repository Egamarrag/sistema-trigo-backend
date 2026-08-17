-- Agrega tarifas de hora extra y nocturna a trabajadores
ALTER TABLE "trabajadores" ADD COLUMN "tarifa_hora_extra" DECIMAL(10,2);
ALTER TABLE "trabajadores" ADD COLUMN "tarifa_hora_nocturna" DECIMAL(10,2);

-- Cambia el registro de mano de obra para calcular el pago automaticamente
ALTER TABLE "produccion_mano_obra" ADD COLUMN "jornada_completa" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "produccion_mano_obra" ADD COLUMN "horas_extra" DECIMAL(6,2) NOT NULL DEFAULT 0;
ALTER TABLE "produccion_mano_obra" ADD COLUMN "horas_nocturnas" DECIMAL(6,2) NOT NULL DEFAULT 0;
ALTER TABLE "produccion_mano_obra" DROP COLUMN IF EXISTS "horas_trabajadas";
