import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getUserGroups } from "./google-admin";

const PR_DEPT_GROUP_EMAIL = "pr-dept@ntusa.ntu.edu.tw";
const INFOR_GROUP_EMAIL = "infor@ntusa.ntu.edu.tw";
type UserRole = "admin" | "reviewer" | "editor";

type DepartmentGroupConfig = {
  departmentId: string;
  departmentName: string;
};

const DEPARTMENT_GROUPS: Record<string, DepartmentGroupConfig> = {
  "internationalaffairs@stuco.ntu.edu.tw": {
    departmentId: "international-affairs",
    departmentName: "國際部",
  },
  "studentrights@ntusa.ntu.edu.tw": {
    departmentId: "student-rights",
    departmentName: "學權部",
  },
  "academic@ntusa.ntu.edu.tw": {
    departmentId: "academic",
    departmentName: "學術部",
  },
  "genderequality@ntusa.ntu.edu.tw": {
    departmentId: "gender-equality",
    departmentName: "性平小組",
  },
  "open.ntu@stuco.ntu.edu.tw": {
    departmentId: "open-ntu",
    departmentName: "打開台大",
  },
  "history@stuco.ntu.edu.tw": {
    departmentId: "history",
    departmentName: "會史小組",
  },
  "nativelanguage@stuco.ntu.edu.tw": {
    departmentId: "native-language",
    departmentName: "本土語言小組",
  },
  "campusplanning@stuco.ntu.edu.tw": {
    departmentId: "campus-planning",
    departmentName: "校園規劃小組",
  },
  "sustainable@ntusa.ntu.edu.tw": {
    departmentId: "sustainable",
    departmentName: "永續組",
  },
  "dept-secretariat@ntusa.ntu.edu.tw": {
    departmentId: "secretariat",
    departmentName: "秘書處",
  },
  "finance@ntusa.ntu.edu.tw": {
    departmentId: "finance",
    departmentName: "財務部",
  },
  [INFOR_GROUP_EMAIL]: {
    departmentId: "infor",
    departmentName: "資訊部",
  },
  "transitionjustice@ntusa.ntu.edu.tw": {
    departmentId: "transitional-justice",
    departmentName: "轉型正義小組",
  },
  "election-committee@ntusa.ntu.edu.tw": {
    departmentId: "election-committee",
    departmentName: "選委會",
  },
  "film@ntusa.ntu.edu.tw": {
    departmentId: "film",
    departmentName: "電影節",
  },
  "38-president@ntusa.ntu.edu.tw": {
    departmentId: "president-office",
    departmentName: "會本部",
  },
  "president@ntusa.ntu.edu.tw": {
    departmentId: "president-office",
    departmentName: "會本部",
  },
  "posa@ntusa.ntu.edu.tw": {
    departmentId: "president-office",
    departmentName: "會本部",
  },
  "grading-reform@ntusa.ntu.edu.tw": {
    departmentId: "grading-reform",
    departmentName: "成績改革因應小組",
  },
  [PR_DEPT_GROUP_EMAIL]: {
    departmentId: "public-relations",
    departmentName: "公關部",
  },
};

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
          let matchedDepartment: DepartmentGroupConfig | null = null;

          for (const group of groups) {
            const groupEmail = group.email?.toLowerCase();
            if (!groupEmail) continue;

            if (groupEmail === INFOR_GROUP_EMAIL) {
              role = "admin";
              department = DEPARTMENT_GROUPS[groupEmail].departmentName;
              break;
            }

            const mappedDepartment = DEPARTMENT_GROUPS[groupEmail];
            if (!mappedDepartment) continue;

            if (groupEmail === PR_DEPT_GROUP_EMAIL) {
              isInPrDept = true;
              matchedDepartment = mappedDepartment;
              continue;
            }

            if (!matchedDepartment) {
              matchedDepartment = mappedDepartment;
            }
          }

          // PR department members can review (approve/reject) articles.
          if (isInPrDept && role !== "admin") {
            role = "reviewer";
          }

          if (role !== "admin" && matchedDepartment) {
            department = matchedDepartment.departmentName;
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
