"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { Project, User } from "@/lib/types";
import styles from "./page.module.css";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const DEFAULT_START = toDateInputValue(new Date());
const DEFAULT_END = toDateInputValue(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export default function NewProjectPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [title, setTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [searchRangeStart, setSearchRangeStart] = useState(DEFAULT_START);
  const [searchRangeEnd, setSearchRangeEnd] = useState(DEFAULT_END);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<User>("/auth/me")
      .then(setCurrentUser)
      .catch(() => router.replace("/login"));
    api.get<User[]>("/users").then(setUsers).catch(() => {});
  }, [router]);

  function toggleMember(userId: string) {
    setMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Название обязательно");
      return;
    }
    if (searchRangeStart >= searchRangeEnd) {
      setError("Дата начала должна быть раньше даты окончания");
      return;
    }

    setSubmitting(true);
    try {
      const project = await api.post<Project>("/projects", {
        title: title.trim(),
        duration_minutes: durationMinutes,
        search_range_start: searchRangeStart,
        search_range_end: searchRangeEnd,
        member_ids: Array.from(memberIds),
      });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось создать проект");
      setSubmitting(false);
    }
  }

  const otherUsers = users.filter((user) => user.id !== currentUser?.id);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Новый проект</h1>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="title">
            Название
          </label>
          <input
            id="title"
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Синк по роадмапу"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="duration">
            Длительность встречи
          </label>
          <select
            id="duration"
            className={styles.select}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
          >
            {DURATION_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} мин
              </option>
            ))}
          </select>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="range-start">
              Диапазон поиска — с
            </label>
            <input
              id="range-start"
              type="date"
              className={styles.input}
              value={searchRangeStart}
              onChange={(e) => setSearchRangeStart(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="range-end">
              по
            </label>
            <input
              id="range-end"
              type="date"
              className={styles.input}
              value={searchRangeEnd}
              onChange={(e) => setSearchRangeEnd(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Участники</span>
          <div className={styles.memberList}>
            {otherUsers.length === 0 && <span>Других пользователей пока нет</span>}
            {otherUsers.map((user) => (
              <label key={user.id} className={styles.memberOption}>
                <input
                  type="checkbox"
                  checked={memberIds.has(user.id)}
                  onChange={() => toggleMember(user.id)}
                />
                {user.name} ({user.email})
              </label>
            ))}
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={`${styles.submit} btn-dark`} disabled={submitting}>
          {submitting ? "Создаём…" : "Создать проект"}
        </button>
      </form>
    </div>
  );
}
