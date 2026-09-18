import { prisma } from "@/lib/prisma";
import type { RunResult, LintError } from "@/types";

export async function evaluateSubmission(
  submissionId: string,
  code: string
): Promise<RunResult> {
  const submission = await prisma.submission.findUniqueOrThrow({
    where: { id: submissionId },
    include: {
      soal: {
        include: {
          testCases: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  const testResults = [];
  let passed = 0;

  for (const tc of submission.soal.testCases) {
    const result = await runCode(code, tc.input, submission.soal.language || "javascript");
    const isPassed = normalizeOutput(result.stdout) === normalizeOutput(tc.expected);
    if (isPassed) passed++;

    testResults.push({
      testCaseId: tc.id,
      label: tc.label,
      passed: isPassed,
      actual: result.stdout || result.stderr,
      expected: tc.expected,
      error: result.stderr || undefined,
    });

    if (!isPassed && tc.conceptTagId) {
      await prisma.errorLog.create({
        data: {
          submissionId,
          conceptTagId: tc.conceptTagId,
          message: result.stderr || `Expected "${tc.expected}", got "${result.stdout}"`,
          occurredAt: new Date(),
        },
      });
    }
  }

  const total = submission.soal.testCases.length;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      code,
      testsPassed: passed,
      testsTotal: total,
      autoGradeScore: score,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });

  return { testResults, score, testsPassed: passed, testsTotal: total };
}

export function lintCode(code: string, language: string): LintError[] {
  const errors: LintError[] = [];
  const lines = code.split("\n");

  if (language === "css" || language === "html") {
    lines.forEach((line, i) => {
      const cssPropertyMatch = line.match(/^\s*([a-z-]+)\s*:/);
      if (cssPropertyMatch) {
        const prop = cssPropertyMatch[1];
        const validProps = new Set([
          "display", "flex", "grid", "justify-content", "align-items",
          "flex-direction", "flex-wrap", "gap", "margin", "padding",
          "width", "height", "background", "color", "border", "font-size",
          "font-weight", "text-align", "position", "top", "left", "right",
          "bottom", "overflow", "grid-template-columns", "grid-template-rows",
        ]);
        if (!validProps.has(prop) && prop.length > 2) {
          errors.push({
            line: i + 1,
            message: `Properti "${prop}" tidak dikenali`,
            severity: "warning",
            conceptTag: "salah-nama-properti",
          });
        }
      }
    });
  }

  return errors;
}

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function runCode(
  code: string,
  input: string,
  _language: string
): Promise<ExecutionResult> {
  // Placeholder: in production, this would call Piston API or Docker sandbox
  return {
    stdout: "",
    stderr: "Code execution engine not configured",
    exitCode: 1,
  };
}

function normalizeOutput(str: string): string {
  return str.trim().replace(/\r\n/g, "\n");
}
