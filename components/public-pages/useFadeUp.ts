"use client";

import { useEffect } from "react";

export function useFadeUp(dependencies: readonly unknown[] = []) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.01, rootMargin: "0px 0px -20px 0px" },
    );

    document.querySelectorAll(".fade-up-target").forEach((element, index) => {
      if (element.classList.contains("is-visible")) return;
      (element as HTMLElement).style.setProperty("--delay", `${(index % 5) * 60}ms`);
      element.classList.add("fade-up");
      observer.observe(element);
    });

    return () => observer.disconnect();
    // Callers explicitly provide the values that should restart the observer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}
