"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./AccountMenu.module.css";

export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-label="Меню аккаунта"
        title="Меню аккаунта"
        onClick={() => setOpen((prev) => !prev)}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
        </svg>
      </button>
      {open && (
        <div className={styles.menu}>
          <Link href="/account" className={styles.menuItem} onClick={() => setOpen(false)}>
            Профиль
          </Link>
          <Link href="/projects" className={styles.menuItem} onClick={() => setOpen(false)}>
            Мои встречи
          </Link>
        </div>
      )}
    </div>
  );
}
