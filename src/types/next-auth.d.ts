import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "GURU" | "SISWA";
    } & DefaultSession["user"];
  }

  interface User {
    role: "GURU" | "SISWA";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "GURU" | "SISWA";
  }
}
