"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { setToken } from "@/lib/auth";
import type { User } from "@/lib/types";
import styles from "./page.module.css";

function staggerStyle(index: number): CSSProperties {
  return { "--stagger-index": index } as CSSProperties;
}

export default function LoginPage() {
  const router = useRouter();
  const [unclaimedUsers, setUnclaimedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<User[]>("/users")
      .then((users) => setUnclaimedUsers(users.filter((user) => user.nickname === null)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleLoginSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await api.post<{ access_token: string }>("/auth/login", {
        nickname,
        password,
      });
      setToken(data.access_token);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось войти");
      setSubmitting(false);
    }
  }

  async function handleClaim(userId: string) {
    setError(null);
    setClaimingId(userId);
    try {
      const data = await api.post<{ access_token: string }>("/auth/claim", { user_id: userId });
      setToken(data.access_token);
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось продолжить");
      setClaimingId(null);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={`${styles.title} stagger-in`} style={staggerStyle(0)}>
          Meeting Scheduler
        </h1>

        {!showPicker && (
          <>
            <p className={`${styles.subtitle} stagger-in`} style={staggerStyle(1)}>
              Войдите по нику и паролю
            </p>
            <form className={`${styles.form} stagger-in`} style={staggerStyle(2)} onSubmit={handleLoginSubmit}>
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
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              {error && <p className={styles.error}>{error}</p>}
              <button type="submit" className="btn-dark" disabled={submitting || !nickname || !password}>
                {submitting ? "Вхожу…" : "Войти"}
              </button>
            </form>
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => {
                setError(null);
                setShowPicker(true);
              }}
            >
              Ещё не настроили аккаунт?
            </button>
          </>
        )}

        {showPicker && (
          <>
            <p className={`${styles.subtitle} stagger-in`} style={staggerStyle(1)}>
              Выберите себя из списка
            </p>

            {loading && <p className={styles.empty}>Загрузка…</p>}
            {!loading && unclaimedUsers.length === 0 && (
              <p className={styles.empty}>Все аккаунты уже настроены — войдите по нику и паролю.</p>
            )}
            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.list}>
              {unclaimedUsers.map((user, index) => (
                <button
                  key={user.id}
                  type="button"
                  className={`${styles.userButton} stagger-in`}
                  style={staggerStyle(index + 2)}
                  disabled={claimingId !== null}
                  onClick={() => handleClaim(user.id)}
                >
                  <span className={styles.userName}>{user.name}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className={styles.linkButton}
              onClick={() => {
                setError(null);
                setShowPicker(false);
              }}
            >
              Уже есть ник и пароль? Войти
            </button>
          </>
        )}
      </div>
    </div>
  );
}
