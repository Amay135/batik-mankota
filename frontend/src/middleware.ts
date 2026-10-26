import { NextResponse, type NextRequest } from "next/server";

// Gerbang kasar: tanpa cookie sesi -> /masuk. Validasi sesi sebenarnya di layout (akun) dan API.
export function middleware(req: NextRequest) {
  if (!req.cookies.get("sessionid")) {
    const url = req.nextUrl.clone();
    const next = req.nextUrl.pathname + req.nextUrl.search;
    url.pathname = "/masuk";
    url.search = `?next=${encodeURIComponent(next)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/koleksi/:path*", "/produk/:path*", "/checkout/:path*", "/pesanan/:path*"] };
