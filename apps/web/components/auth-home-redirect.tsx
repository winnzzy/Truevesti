"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readSession } from "@/lib/api";

export function AuthHomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    const session = readSession();
    if (session) {
      router.replace(session.user.role === "ADMIN" ? "/admin/dashboard" : "/dashboard");
    }
  }, [router]);

  return null;
}
