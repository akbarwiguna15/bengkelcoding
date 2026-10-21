-- Step 1: Remove rows with NULL soal_id or kelas_id (cannot satisfy new NOT NULL + unique)
DELETE FROM "student_activities" WHERE "soal_id" IS NULL OR "kelas_id" IS NULL;

-- Step 2: Drop old unique constraint
ALTER TABLE "student_activities" DROP CONSTRAINT IF EXISTS "student_activities_user_id_kelas_id_key";

-- Step 3: Make columns non-nullable
ALTER TABLE "student_activities" ALTER COLUMN "soal_id" SET NOT NULL;
ALTER TABLE "student_activities" ALTER COLUMN "kelas_id" SET NOT NULL;

-- Step 4: Add foreign key to soal
ALTER TABLE "student_activities"
  ADD CONSTRAINT "student_activities_soal_id_fkey"
  FOREIGN KEY ("soal_id") REFERENCES "soal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 5: Add new unique constraint (userId, kelasId, soalId)
ALTER TABLE "student_activities" ADD CONSTRAINT "student_activities_user_id_kelas_id_soal_id_key" UNIQUE ("user_id", "kelas_id", "soal_id");
