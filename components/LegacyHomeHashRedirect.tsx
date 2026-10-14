"use client";

import { useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { pathFromLegacyHomeHash } from "@/lib/legacy-home-hash";

export default function LegacyHomeHashRedirect() {
  const router = useRouter();

  useLayoutEffect(() => {
    const path = pathFromLegacyHomeHash(window.location.hash);
    if (path) router.replace(path);
  }, [router]);

  return null;
}
