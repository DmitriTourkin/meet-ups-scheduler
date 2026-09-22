"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";
import styles from "./page.module.css";

function staggerStyle(index: number): CSSProperties {
  return { "--stagger-index": index } as CSSProperties;
}

export default function LoginPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingInId, setLoggingInId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<User[]>("/users")
      .then(setUsers)
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Не удалось загрузить список пользователей");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleLogin(userId: string) {
    setError(null);
    setLoggingInId(userId);
    try {
      await api.post("/auth/login", { user_id: userId });
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось войти");
      setLoggingInId(null);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={`${styles.title} stagger-in`} style={staggerStyle(0)}>
          Meeting Scheduler
        </h1>
        <p className={`${styles.subtitle} stagger-in`} style={staggerStyle(1)}>
          Выберите, кем войти (упрощённый вход)
        </p>

        {loading && <p className={styles.empty}>Загрузка…</p>}
        {!loading && users.length === 0 && !error && (
          <p className={styles.empty}>Пользователей пока нет.</p>
        )}
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.list}>
          {users.map((user, index) => (
            <button
              key={user.id}
              type="button"
              className={`${styles.userButton} stagger-in`}
              style={staggerStyle(index + 2)}
              disabled={loggingInId !== null}
              onClick={() => handleLogin(user.id)}
            >
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userEmail}>{user.email}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
