"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readSession } from "@/lib/api";

export function AuthHomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (readSession()) router.replace("/dashboard");
  }, [router]);

  return null;
}
