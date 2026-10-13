-- AlterEnum
-- CANCELLED = o candidato encerrou voluntariamente uma entrevista IN_PROGRESS
-- (POST /interviews/:id/cancel). Aditiva: nenhum dado existente muda.
-- O valor novo só pode ser USADO depois do commit desta migration; por isso as
-- CHECKs que o citam ficam na migration seguinte (20261012000100).
ALTER TYPE "interview_status" ADD VALUE 'CANCELLED';
