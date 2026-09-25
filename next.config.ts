import type { NextConfig } from "next";

if (!process.env.NEXTAUTH_URL && process.env.VERCEL_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
}

const nextConfig: NextConfig = {};

export default nextConfig;
