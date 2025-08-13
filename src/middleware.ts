// middleware.ts

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { routeAccessMap } from "./lib/settings";

const matchers = Object.keys(routeAccessMap).map((route) =>
  createRouteMatcher([route])
);

const isPublicRoute = createRouteMatcher(["/api/xero/callback"]);

// Your custom logic remains unchanged inside this function
export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  // Check if any of the matchers match the current route
  const matchedRouteIndex = matchers.findIndex((matcher) => matcher(req));

  if (matchedRouteIndex !== -1) {
    const matchedRoute = Object.keys(routeAccessMap)[matchedRouteIndex];
    const allowedRoles = routeAccessMap[matchedRoute];

    const { userId, sessionClaims } = await auth();

    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    const role = (sessionClaims?.metadata as { role?: string })?.role;

    if (!allowedRoles.includes(role!)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Add pathname to headers for menu highlighting
  const response = NextResponse.next();
  response.headers.set('x-pathname', req.nextUrl.pathname);
  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};