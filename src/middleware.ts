import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { routeAccessMap } from "./lib/settings";

const matchers = Object.keys(routeAccessMap).map((route) =>
  createRouteMatcher([route])
);

export default clerkMiddleware(async (auth, req) => {
  const matchedRouteIndex = matchers.findIndex((matcher) => matcher(req));

  if (matchedRouteIndex !== -1) {
    const matchedRoute = Object.keys(routeAccessMap)[matchedRouteIndex];
    const allowedRoles = routeAccessMap[matchedRoute];

    const { userId, sessionClaims } = await auth();

    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    // --- THIS IS THE CRUCIAL CHANGE ---
    // 1. Get the array of roles from metadata
    const userRoles = (sessionClaims?.metadata as { roles?: string[] })?.roles || [];

    // 2. Check if at least ONE of the user's roles is in the allowed list
    const hasAccess = userRoles.some(role => allowedRoles.includes(role));

    if (!hasAccess) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

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