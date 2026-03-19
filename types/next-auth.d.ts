import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: "CUSTOMER" | "LENDER" | "ADMIN";
    };
  }

  interface User {
    role?: "CUSTOMER" | "LENDER" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "CUSTOMER" | "LENDER" | "ADMIN";
  }
}
