"use client";

import { useState, type ReactNode } from "react";
import { motion, useScroll, useMotionValueEvent } from "motion/react";

export default function ScrollHeader({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 8);
  });

  return (
    <motion.header
      className={className}
      animate={{
        boxShadow: scrolled ? "0 1px 8px rgba(0,0,0,0.06)" : "0 0 0 rgba(0,0,0,0)",
        paddingTop: scrolled ? 10 : 16,
        paddingBottom: scrolled ? 10 : 16,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {children}
    </motion.header>
  );
}
