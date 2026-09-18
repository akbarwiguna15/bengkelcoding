import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (pathname.startsWith("/guru") && token?.role !== "GURU") {
      return NextResponse.redirect(new URL("/siswa/dashboard", req.url));
    }

    if (pathname.startsWith("/siswa") && token?.role !== "SISWA") {
      return NextResponse.redirect(new URL("/guru/soal/buat", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/guru/:path*", "/siswa/:path*"],
};
