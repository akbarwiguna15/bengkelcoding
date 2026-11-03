-- AlterTable
ALTER TABLE "soal" ADD COLUMN "starter_html" TEXT;
ALTER TABLE "soal" ADD COLUMN "relevant_props" TEXT[] DEFAULT '{}';
