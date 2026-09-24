"use client";

import { useState, type FormEvent } from "react";
import styles from "./page.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export default function AccessPage() {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/access/ping`, {
        headers: { "X-Access-Code": code },
      });
      if (!res.ok) {
        setError("Неверный код");
        return;
      }
      document.cookie = `access_code=${encodeURIComponent(code)}; path=/; max-age=${ACCESS_COOKIE_MAX_AGE}`;
      const next = new URLSearchParams(window.location.search).get("next") ?? "/";
      window.location.href = next;
    } catch {
      setError("Не удалось связаться с сервером");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Meeting Scheduler</h1>
        <p className={styles.subtitle}>Введите код доступа</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            type="text"
            className={styles.input}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Код доступа"
            autoFocus
            autoComplete="off"
          />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className="btn-dark" disabled={checking || !code}>
            {checking ? "Проверяю…" : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
