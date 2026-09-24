"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { getToken, setToken } from "@/lib/auth";
import type { User } from "@/lib/types";
import styles from "./page.module.css";

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [nickname, setNickname] = useState("@");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api
      .get<User>("/auth/me")
      .then(setUser)
      .catch(() => router.replace("/login"))
      .finally(() => setChecking(false));
  }, [router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!nickname.startsWith("@") || nickname.length < 2) {
      setError("Никнейм должен начинаться с @ и содержать хотя бы один символ после");
      return;
    }
    if (password.length < 4) {
      setError("Пароль слишком короткий");
      return;
    }
    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setSubmitting(true);
    try {
      const data = await api.post<{ access_token: string }>("/auth/complete-setup", {
        password,
        nickname,
      });
      setToken(data.access_token);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить");
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <p className={styles.subtitle}>Загрузка…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Привет, {user?.name}</h1>
        <p className={styles.subtitle}>Придумайте никнейм и пароль — дальше входить будете по ним.</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            type="text"
            className={styles.input}
            placeholder="@nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            autoComplete="username"
          />
          <input
            type="password"
            className={styles.input}
            placeholder="Новый пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <input
            type="password"
            className={styles.input}
            placeholder="Повторите пароль"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className="btn-dark" disabled={submitting}>
            {submitting ? "Сохраняю…" : "Сохранить и войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
