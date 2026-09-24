"use client";

import { useEffect, useState, type ReactNode } from "react";
import styles from "./PageTransition.module.css";

const EXIT_DURATION = 180;

type Phase = "visible" | "exit" | "enter";

export function PageTransition({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("visible");
  const [content, setContent] = useState<ReactNode>(children);
  const [pending, setPending] = useState<ReactNode>(children);

  if (phase === "visible" && children !== content) {
    setPhase("exit");
    setPending(children);
  } else if (phase === "exit" && children !== pending) {
    setPending(children);
  }

  useEffect(() => {
    if (phase !== "exit") return;
    const timeout = setTimeout(() => {
      setContent(pending);
      setPhase("enter");
    }, EXIT_DURATION);
    return () => clearTimeout(timeout);
  }, [phase, pending]);

  useEffect(() => {
    if (phase !== "enter") return;
    const raf = requestAnimationFrame(() => setPhase("visible"));
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const phaseClass = phase === "exit" ? styles.exit : phase === "enter" ? styles.enter : styles.visible;

  return <div className={`${styles.wrapper} ${phaseClass}`}>{content}</div>;
}
