"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import AccountMenu from "@/components/AccountMenu";
import type { Project, ProjectStatus } from "@/lib/types";
import styles from "./page.module.css";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  pending: "в поиске слота",
  confirmed: "встреча назначена",
  cancelled: "отменена",
  no_slot_found: "слот не найден",
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Project[]>("/projects")
      .then(setProjects)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Не удалось загрузить проекты");
      });
  }, [router]);

  return (
    <>
      <AccountMenu />
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Мои проекты</h1>
          <Link href="/projects/new" className={`${styles.newButton} btn-dark`}>
            + Новый проект
          </Link>
        </div>

        {error && <p className={styles.error}>{error}</p>}
        {projects && projects.length === 0 && !error && (
          <p className={styles.empty}>Проектов пока нет — создайте первый.</p>
        )}

        <div className={styles.list}>
          {projects?.map((project, index) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className={styles.item}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <span className={styles.itemTitle}>{project.title}</span>
              <span className={styles.itemMeta}>
                {project.search_range_start} — {project.search_range_end} ·{" "}
                {STATUS_LABELS[project.status]}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
