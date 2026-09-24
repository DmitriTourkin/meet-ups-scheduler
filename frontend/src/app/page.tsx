"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<User>("/auth/me")
      .then(setUser)
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    await api.post("/auth/logout").catch(() => {});
    router.replace("/login");
  }

  if (loading || !user) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <p className={styles.meta}>Загрузка…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.greeting}>Привет, {user.name}</h1>
        <p className={styles.meta}>
          {user.email} · рабочие часы {user.working_hours_start}–{user.working_hours_end} (
          {user.timezone})
        </p>
        <Link href="/projects" className={`${styles.logoutButton} btn-dark`}>
          Мои проекты
        </Link>
        <button type="button" className={`${styles.logoutButton} btn-dark`} onClick={handleLogout}>
          Выйти
        </button>
      </div>
    </div>
  );
}
