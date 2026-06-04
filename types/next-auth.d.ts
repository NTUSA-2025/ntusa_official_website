import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's role. */
      role: "admin" | "reviewer" | "editor" | null
      /** The user's department. */
      department: string | null
    } & DefaultSession["user"]
  }

  interface User {
    role?: "admin" | "reviewer" | "editor" | null
    department?: string | null
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    role?: "admin" | "reviewer" | "editor" | null
    department?: string | null
  }
}
