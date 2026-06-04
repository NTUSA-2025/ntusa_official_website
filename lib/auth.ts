import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getUserGroups, getMemberRoleInGroup } from "./google-admin";

const PR_DEPT_GROUP_EMAIL = "pr-dept@ntusa.ntu.edu.tw";
const INFOR_GROUP_EMAIL = "infor@ntusa.ntu.edu.tw";
type UserRole = "admin" | "reviewer" | "editor";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.NEXTAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      // Force https for production domain to fix proxy issues
      if (url.startsWith("http://ntusa.ntu.edu.tw")) {
        return url.replace("http://", "https://");
      }
      return baseUrl;
    },
    async signIn({ user }) {
      const isAllowedToSignIn = user.email?.endsWith("@ntusa.ntu.edu.tw");
      return !!isAllowedToSignIn;
    },
    async jwt({ token, user, account }) {
      if (account && user && user.email) {
        try {
          const groups = await getUserGroups(user.email);
          let role: UserRole = "editor";
          let department: string = "一般部門";
          let isInPrDept = false;

          for (const group of groups) {
            const groupEmail = group.email?.toLowerCase();
            if (groupEmail === INFOR_GROUP_EMAIL) {
              role = "admin";
              department = "資訊部";
              break;
            } else if (groupEmail === PR_DEPT_GROUP_EMAIL) {
              // Tentatively assign PR department; reviewer privilege is
              // gated on OWNER/MANAGER status, checked below.
              department = "公關部";
              isInPrDept = true;
              break;
            } else if (groupEmail?.endsWith("@ntusa.ntu.edu.tw")) {
              role = "editor";
              department = group.name || groupEmail.split("@")[0];
            }
          }

          // Only OWNER/MANAGER of pr-dept can review (approve/reject) articles.
          // Regular pr-dept members remain editors within 公關部.
          if (isInPrDept && role !== "admin") {
            const groupRole = await getMemberRoleInGroup(PR_DEPT_GROUP_EMAIL, user.email);
            role = groupRole === "OWNER" || groupRole === "MANAGER" ? "reviewer" : "editor";
          }

          token.role = role;
          token.department = department;
        } catch (error) {
          console.error("[NextAuth] Error fetching user groups:", error);
          token.role = "editor";
          token.department = "一般部門";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role || "editor";
        session.user.department = token.department || "一般部門";
      }
      return session;
    },
  },
  // 讓 NextAuth 知道它是在反向代理之後運作，強制使用安全 Cookie (僅限 production)
  cookies: {
    pkceCodeVerifier: {
      name: 'next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === "production" || process.env.NEXTAUTH_URL?.startsWith("https://")
      }
    }
  }
};
