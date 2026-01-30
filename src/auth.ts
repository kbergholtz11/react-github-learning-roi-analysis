import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token and profile info
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
      }
      if (profile) {
        token.name = profile.name;
        token.email = profile.email;
        // @ts-expect-error - GitHub profile has login
        token.login = profile.login;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (session.user) {
        session.user.id = token.sub as string;
        // @ts-expect-error - accessToken is custom property
        session.accessToken = token.accessToken;
        // @ts-expect-error - login is custom property
        session.user.login = token.login;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname.startsWith("/auth");
      const isApiAuth = nextUrl.pathname.startsWith("/api/auth");
      const isPublicPage = nextUrl.pathname === "/" || nextUrl.pathname === "/health";

      // Allow auth-related routes
      if (isApiAuth) return true;

      // Redirect logged-in users away from auth pages
      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/", nextUrl));
      }

      // Allow public pages without auth
      if (isPublicPage) return true;

      // Require auth for all other pages
      return isLoggedIn;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  debug: process.env.NODE_ENV === "development",
});
