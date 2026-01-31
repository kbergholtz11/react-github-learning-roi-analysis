export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (all API routes for data access)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api).*)",
  ],
};
