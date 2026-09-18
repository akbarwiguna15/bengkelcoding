"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"GURU" | "SISWA">("SISWA");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Terjadi kesalahan");
      return;
    }

    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-paper-dim flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <svg width="32" height="32" viewBox="0 0 26 26" fill="none">
            <rect x="1" y="1" width="24" height="24" stroke="#c17a3d" strokeWidth="1.4" />
            <path
              d="M8 9L5 13L8 17M18 9L21 13L18 17M14.5 7L11.5 19"
              stroke="#16241f"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="font-semibold text-[17px]">Bengkel Kode</div>
        </div>

        <div className="bg-white border border-line p-6 relative">
          <span className="absolute -top-px -left-px w-2.5 h-2.5 border-t-2 border-l-2 border-pcb" />
          <span className="absolute -top-px -right-px w-2.5 h-2.5 border-t-2 border-r-2 border-pcb" />
          <span className="absolute -bottom-px -left-px w-2.5 h-2.5 border-b-2 border-l-2 border-pcb" />
          <span className="absolute -bottom-px -right-px w-2.5 h-2.5 border-b-2 border-r-2 border-pcb" />

          <h1 className="text-[18px] font-semibold mb-1">Daftar Akun</h1>
          <p className="text-[13px] text-text-dim mb-5">
            Buat akun untuk mulai menggunakan Bengkel Kode
          </p>

          {error && (
            <div className="bg-rust-soft border-l-[3px] border-rust px-3.5 py-2.5 text-[12.5px] text-rust mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-[13px] font-medium text-text-primary block mb-1.5">
                Peran
              </label>
              <div className="flex gap-2">
                {(["GURU", "SISWA"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      "flex-1 border py-2.5 text-[13px] font-medium cursor-pointer font-sans",
                      role === r
                        ? "bg-ink text-paper border-ink"
                        : "bg-white text-text-dim border-line"
                    )}
                  >
                    {r === "GURU" ? "Guru" : "Siswa"}
                  </button>
                ))}
              </div>
            </div>
            <Input
              id="name"
              label="Nama Lengkap"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ahmad Fauzan"
              required
            />
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="siswa@sekolah.sch.id"
              required
            />
            <Input
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              required
              minLength={6}
            />
            <Button type="submit" disabled={loading} className="w-full mt-1">
              {loading ? "Memproses..." : "Daftar"}
            </Button>
          </form>

          <p className="text-[12.5px] text-text-dim text-center mt-4">
            Sudah punya akun?{" "}
            <Link href="/login" className="text-pcb font-medium no-underline">
              Masuk
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
