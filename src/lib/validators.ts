import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["GURU", "SISWA"]),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createKelasSchema = z.object({
  name: z.string().min(1, "Nama kelas wajib diisi"),
});

export const joinKelasSchema = z.object({
  joinCode: z.string().length(6, "Kode kelas harus 6 karakter"),
});

export const createSoalSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  learningModel: z.enum(["PROBLEM_SOLVING", "PBL", "TRANSFORMATIF", "DEEP_LEARNING"]),
  topic: z.string().min(1),
  difficulty: z.number().min(1).max(3),
  starterCode: z.string().optional(),
  language: z.string().optional(),
});

export const generateSoalSchema = z.object({
  learningModel: z.enum(["PROBLEM_SOLVING", "PBL", "TRANSFORMATIF", "DEEP_LEARNING"]),
  topic: z.string().min(1),
  difficulty: z.number().min(1).max(3),
  count: z.number().min(1).max(5),
  language: z.string().optional(),
  context: z.string().optional(),
});

export const approveSoalSchema = z.object({
  status: z.enum(["APPROVED", "REVISION_NEEDED", "ARCHIVED"]),
});

export const submitCodeSchema = z.object({
  code: z.string(),
});

export const submitWritingSchema = z.object({
  writingContent: z.string().min(1),
});

export const submitMilestoneSchema = z.object({
  milestoneId: z.string(),
  content: z.string().min(1),
});

export const sendHintSchema = z.object({
  receiverId: z.string(),
  soalId: z.string(),
  message: z.string().min(1),
});

export const reviewMilestoneSchema = z.object({
  decision: z.enum(["APPROVED", "REVISION_NEEDED"]),
  teacherNote: z.string().optional(),
});

export const gradeTransformatifSchema = z.object({
  grades: z.array(
    z.object({
      criterionId: z.string(),
      score: z.number().min(0),
      feedback: z.string().optional(),
    })
  ),
  teacherComment: z.string().optional(),
});

export const assignSoalSchema = z.object({
  soalId: z.string(),
  kelasId: z.string(),
  dueAt: z.string().datetime().optional(),
});
