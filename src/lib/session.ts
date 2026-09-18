import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireSession() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireGuru() {
  const session = await requireSession();
  if (session.user.role !== "GURU") {
    throw new Error("Forbidden: hanya guru");
  }
  return session;
}

export async function requireSiswa() {
  const session = await requireSession();
  if (session.user.role !== "SISWA") {
    throw new Error("Forbidden: hanya siswa");
  }
  return session;
}
