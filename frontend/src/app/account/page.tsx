"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";
import styles from "./page.module.css";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingHoursStart, setWorkingHoursStart] = useState("09:00");
  const [workingHoursEnd, setWorkingHoursEnd] = useState("18:00");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<User>("/auth/me")
      .then((data) => {
        setUser(data);
        setWorkingHoursStart(data.working_hours_start.slice(0, 5));
        setWorkingHoursEnd(data.working_hours_end.slice(0, 5));
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    if (workingHoursStart >= workingHoursEnd) {
      setError("Начало рабочего дня должно быть раньше окончания");
      return;
    }

    setSaving(true);
    try {
      const updated = await api.patch<User>("/users/me", {
        working_hours_start: workingHoursStart,
        working_hours_end: workingHoursEnd,
      });
      setUser(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
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
        <div className={styles.backRow}>
          <Link href="/" className={styles.back}>
            ← На главную
          </Link>
          <Link href="/projects" className={styles.back}>
            Мои проекты →
          </Link>
        </div>
        <h1 className={styles.title}>Мой аккаунт</h1>

        <div className={styles.info}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Имя</span>
            <span>{user.name}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Никнейм</span>
            <span>{user.nickname}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Email</span>
            <span>{user.email}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Часовой пояс</span>
            <span>{user.timezone}</span>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <span className={styles.formTitle}>Рабочие часы</span>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="start">
                С
              </label>
              <input
                id="start"
                type="time"
                className={styles.input}
                value={workingHoursStart}
                onChange={(e) => setWorkingHoursStart(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="end">
                По
              </label>
              <input
                id="end"
                type="time"
                className={styles.input}
                value={workingHoursEnd}
                onChange={(e) => setWorkingHoursEnd(e.target.value)}
              />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}
          {saved && !error && <p className={styles.success}>Сохранено</p>}

          <button type="submit" className="btn-dark" disabled={saving}>
            {saving ? "Сохраняю…" : "Сохранить"}
          </button>
        </form>
      </div>
    </div>
  );
}
