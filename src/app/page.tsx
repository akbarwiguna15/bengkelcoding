import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "GURU") {
    redirect("/guru/soal/buat");
  }

  redirect("/siswa/dashboard");
}
