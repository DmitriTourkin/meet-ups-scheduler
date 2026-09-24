import { NextResponse, type NextRequest } from "next/server";

const ACCESS_COOKIE = "access_code";

export function proxy(request: NextRequest) {
  if (!process.env.ACCESS_CODE) {
    return NextResponse.next();
  }

  if (request.cookies.get(ACCESS_COOKIE)?.value) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/access";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!access|_next|favicon.ico).*)"],
};
