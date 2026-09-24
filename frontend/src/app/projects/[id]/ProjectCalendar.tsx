"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { api, ApiError } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import type {
  Project,
  ProjectAvailabilityEntry,
  ProjectAvailabilityStatus,
  ProjectMember,
  User,
} from "@/lib/types";
import {
  DISPLAY_HOURS,
  WEEKDAY_HEADERS,
  dayStatus,
  entriesForHour,
  formatDayHeader,
  weekdayShort,
  hourCellRange,
  isWithinWorkingHours,
  parseHour,
  statusForHour,
  weeksInRange,
} from "@/lib/schedule";
import styles from "./page.module.css";

const STATUS_LABELS: Record<Project["status"], string> = {
  pending: "в поиске слота",
  confirmed: "встреча назначена",
  cancelled: "отменена",
  no_slot_found: "слот не найден",
};

const STATUS_ORDER: (ProjectAvailabilityStatus | "free")[] = ["free", "available", "busy", "tentative"];
const STATUS_PAINT_LABELS: Record<ProjectAvailabilityStatus | "free", string> = {
  free: "Не определено",
  available: "Есть время",
  busy: "Занят",
  tentative: "Могу освободить",
};
const DARK_STATUS_COLORS: Record<ProjectAvailabilityStatus | "free", string> = {
  free: "var(--surface)",
  available: "var(--status-available-muted)",
  busy: "var(--status-busy-muted)",
  tentative: "var(--status-tentative-muted)",
};
const BRIGHT_STATUS_COLORS: Record<ProjectAvailabilityStatus | "free", string> = {
  free: "var(--surface)",
  available: "#8bc34a",
  busy: "#e24b4a",
  tentative: "#fac775",
};

const TOGGLE_ANIMATION_MS = 2500;

async function deleteIgnoringMissing(path: string): Promise<void> {
  try {
    await api.delete(path);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return;
    throw err;
  }
}

function effectiveWorkingHours(user: User, restrictToWorkingHours: boolean): { start: string; end: string } {
  if (restrictToWorkingHours) {
    return { start: user.working_hours_start, end: user.working_hours_end };
  }
  return { start: "00:00", end: "24:00" };
}

function statusColorClasses(status: ProjectAvailabilityStatus | "free", bright: boolean, animated: boolean): string {
  const dim = bright ? "" : styles.dimmed;
  const anim = animated ? styles.colorAnimated : "";
  if (status === "busy") return `${styles.cellBusy} ${dim} ${anim}`;
  if (status === "tentative") return `${styles.cellTentative} ${dim} ${anim}`;
  if (status === "available") return `${styles.cellAvailable} ${dim} ${anim}`;
  return `${styles.cellFree} ${dim} ${anim}`;
}

function cellClassName(
  status: ProjectAvailabilityStatus | "free",
  withinWorkingHours: boolean,
  bright: boolean,
  animated: boolean,
): string {
  if (!withinWorkingHours) return `${styles.cell} ${styles.cellOutside}`;
  return `${styles.cell} ${statusColorClasses(status, bright, animated)}`;
}

function staggerStyle(index: number): CSSProperties {
  return { "--stagger-index": index } as CSSProperties;
}

function monthCellClassName(status: ProjectAvailabilityStatus | "free", bright: boolean, animated: boolean): string {
  return `${styles.monthCell} ${statusColorClasses(status, bright, animated)}`;
}

function dayGridCellClassName(status: ProjectAvailabilityStatus | "free", bright: boolean, animated: boolean): string {
  return `${styles.dayGridCell} ${statusColorClasses(status, bright, animated)}`;
}

function miniSquareClassName(status: ProjectAvailabilityStatus | "free", bright: boolean): string {
  return `${styles.miniSquare} ${statusColorClasses(status, bright, false)}`;
}

function dayKey(day: Date): string {
  return day.toISOString().slice(0, 10);
}

function cellKey(day: Date, hour: number): string {
  return `${dayKey(day)}_${hour}`;
}

interface HourDragPaint {
  status: ProjectAvailabilityStatus | "free";
  cells: Map<string, { day: Date; hour: number }>;
}

interface DayDragPaint {
  status: ProjectAvailabilityStatus | "free";
  days: Map<string, Date>;
}

interface ProjectCalendarProps {
  id: string;
  restrictToWorkingHours: boolean;
}

type ViewMode = "blocks" | "grid" | "hours";

export default function ProjectCalendar({ id, restrictToWorkingHours }: ProjectCalendarProps) {
  const router = useRouter();
  const theme = useTheme();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [usersById, setUsersById] = useState<Map<string, User>>(new Map());
  const [entries, setEntries] = useState<ProjectAvailabilityEntry[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("blocks");
  const [showDayStructure, setShowDayStructure] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paintStatus, setPaintStatus] = useState<ProjectAvailabilityStatus | "free">("busy");
  const [headerPinned, setHeaderPinned] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [brightColors, setBrightColors] = useState(false);
  const [toggleAnimating, setToggleAnimating] = useState(false);

  const hourDragRef = useRef<HourDragPaint | null>(null);
  const dayDragRef = useRef<DayDragPaint | null>(null);
  const hourCellRefs = useRef<Map<string, { el: HTMLButtonElement; boundaryClass: string }>>(new Map());
  const dayCellRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const projectRef = useRef<Project | null>(null);
  const currentUserRef = useRef<User | null>(null);
  const entriesRef = useRef<ProjectAvailabilityEntry[]>([]);
  const headerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const pageWidthBeforeSwitch = useRef<number | null>(null);
  const isFirstBrightRender = useRef(true);
  const mountTimeRef = useRef<number | null>(null);

  const effectiveBright = theme === "light" ? true : brightColors;

  function changeViewMode(mode: ViewMode) {
    if (pageRef.current) {
      pageWidthBeforeSwitch.current = pageRef.current.getBoundingClientRect().width;
    }
    setViewMode(mode);
  }

  useLayoutEffect(() => {
    const el = pageRef.current;
    const startWidth = pageWidthBeforeSwitch.current;
    pageWidthBeforeSwitch.current = null;
    if (!el || startWidth === null) return;

    const naturalWidth = el.getBoundingClientRect().width;
    if (naturalWidth === startWidth) return;

    el.style.transition = "none";
    el.style.width = `${startWidth}px`;
    void el.offsetWidth;
    el.style.transition = "width 0.3s ease";
    el.style.width = `${naturalWidth}px`;

    function handleTransitionEnd(e: TransitionEvent) {
      if (e.propertyName !== "width") return;
      el!.style.transition = "";
      el!.style.width = "";
    }
    el.addEventListener("transitionend", handleTransitionEnd);
    return () => el.removeEventListener("transitionend", handleTransitionEnd);
  }, [viewMode]);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    setHeaderHeight(el.offsetHeight);
    const observer = new ResizeObserver(() => setHeaderHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [project]);

  useEffect(() => {
    function handleScroll() {
      setHeaderPinned(window.scrollY > 8);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    mountTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (isFirstBrightRender.current) {
      isFirstBrightRender.current = false;
      return;
    }
    if (mountTimeRef.current === null || Date.now() - mountTimeRef.current < 300) return;
    setToggleAnimating(true);
    const timeout = setTimeout(() => setToggleAnimating(false), TOGGLE_ANIMATION_MS);
    return () => clearTimeout(timeout);
  }, [brightColors, theme]);

  const loadEntries = useCallback(async () => {
    const data = await api.get<ProjectAvailabilityEntry[]>(`/projects/${id}/availability`);
    setEntries(data);
  }, [id]);

  const commitHourDrag = useCallback(
    async (paint: HourDragPaint) => {
      const project = projectRef.current;
      const currentUser = currentUserRef.current;
      const entries = entriesRef.current;
      if (!project || !currentUser) return;

      try {
        await Promise.all(
          Array.from(paint.cells.values()).map(async ({ day, hour }) => {
            const overlapping = entriesForHour(entries, currentUser.id, day, hour);
            await Promise.all(
              overlapping.map((entry) =>
                deleteIgnoringMissing(`/projects/${project.id}/availability/${entry.id}`),
              ),
            );
            if (paint.status !== "free") {
              const { start, end } = hourCellRange(day, hour);
              await api.post(`/projects/${project.id}/availability`, {
                start_at: start.toISOString(),
                end_at: end.toISOString(),
                status: paint.status,
              });
            }
          }),
        );
        await loadEntries();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Не удалось обновить занятость");
        await loadEntries();
      }
    },
    [loadEntries],
  );

  const commitDayDrag = useCallback(
    async (paint: DayDragPaint) => {
      const project = projectRef.current;
      const currentUser = currentUserRef.current;
      const entries = entriesRef.current;
      if (!project || !currentUser) return;
      const bounds = effectiveWorkingHours(currentUser, restrictToWorkingHours);
      const startHour = parseHour(bounds.start);
      const endHour = parseHour(bounds.end);

      try {
        await Promise.all(
          Array.from(paint.days.values()).map(async (day) => {
            const dayStart = new Date(day);
            dayStart.setHours(startHour, 0, 0, 0);
            const dayEnd = new Date(day);
            dayEnd.setHours(endHour, 0, 0, 0);

            const overlapping = entries.filter(
              (entry) =>
                entry.user_id === currentUser.id &&
                new Date(entry.start_at) < dayEnd &&
                new Date(entry.end_at) > dayStart,
            );
            await Promise.all(
              overlapping.map((entry) =>
                deleteIgnoringMissing(`/projects/${project.id}/availability/${entry.id}`),
              ),
            );
            if (paint.status !== "free") {
              await api.post(`/projects/${project.id}/availability`, {
                start_at: dayStart.toISOString(),
                end_at: dayEnd.toISOString(),
                status: paint.status,
              });
            }
          }),
        );
        await loadEntries();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Не удалось обновить занятость");
        await loadEntries();
      }
    },
    [loadEntries, restrictToWorkingHours],
  );

  useEffect(() => {
    function handleMouseUp() {
      const hourPaint = hourDragRef.current;
      hourDragRef.current = null;
      if (hourPaint && hourPaint.cells.size > 0) {
        commitHourDrag(hourPaint);
      }

      const dayPaint = dayDragRef.current;
      dayDragRef.current = null;
      if (dayPaint && dayPaint.days.size > 0) {
        commitDayDrag(dayPaint);
      }
    }
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [commitHourDrag, commitDayDrag]);

  useEffect(() => {
    async function load() {
      try {
        const [me, allUsers] = await Promise.all([
          api.get<User>("/auth/me"),
          api.get<User[]>("/users"),
        ]);
        setCurrentUser(me);
        setUsersById(new Map(allUsers.map((u) => [u.id, u])));

        const [proj, memberList] = await Promise.all([
          api.get<Project>(`/projects/${id}`),
          api.get<ProjectMember[]>(`/projects/${id}/members`),
        ]);
        setProject(proj);
        setMembers(memberList);

        await loadEntries();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Не удалось загрузить проект");
      }
    }
    load();
  }, [id, router, loadEntries]);

  function paintHourCellDom(key: string, status: ProjectAvailabilityStatus | "free") {
    const ref = hourCellRefs.current.get(key);
    if (!ref) return;
    ref.el.className = `${cellClassName(status, true, effectiveBright, false)} ${ref.boundaryClass} ${styles.cellEditable}`;
  }

  function paintDayCellDom(key: string, status: ProjectAvailabilityStatus | "free") {
    const el = dayCellRefs.current.get(key);
    if (!el) return;
    const base = viewMode === "grid" ? dayGridCellClassName : monthCellClassName;
    el.className = `${base(status, effectiveBright, false)} ${styles.cellEditable}`;
  }

  function startHourPaint(memberId: string, day: Date, hour: number) {
    if (!currentUser || currentUser.id !== memberId) return;
    const bounds = effectiveWorkingHours(currentUser, restrictToWorkingHours);
    if (!isWithinWorkingHours(hour, bounds.start, bounds.end)) return;

    const key = cellKey(day, hour);
    const paint: HourDragPaint = { status: paintStatus, cells: new Map([[key, { day, hour }]]) };
    hourDragRef.current = paint;
    paintHourCellDom(key, paint.status);
  }

  function extendHourPaint(memberId: string, day: Date, hour: number) {
    if (!currentUser || currentUser.id !== memberId) return;
    const bounds = effectiveWorkingHours(currentUser, restrictToWorkingHours);
    if (!isWithinWorkingHours(hour, bounds.start, bounds.end)) return;
    const current = hourDragRef.current;
    if (!current) return;

    const key = cellKey(day, hour);
    if (current.cells.has(key)) return;
    current.cells.set(key, { day, hour });
    paintHourCellDom(key, current.status);
  }

  function startDayPaint(memberId: string, day: Date) {
    if (!currentUser || currentUser.id !== memberId) return;
    const key = dayKey(day);
    const paint: DayDragPaint = { status: paintStatus, days: new Map([[key, day]]) };
    dayDragRef.current = paint;
    paintDayCellDom(key, paint.status);
  }

  function extendDayPaint(memberId: string, day: Date) {
    if (!currentUser || currentUser.id !== memberId) return;
    const current = dayDragRef.current;
    if (!current) return;

    const key = dayKey(day);
    if (current.days.has(key)) return;
    current.days.set(key, day);
    paintDayCellDom(key, current.status);
  }

  if (error) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  if (!project || !currentUser) {
    return null;
  }

  const weeks = weeksInRange(project.search_range_start, project.search_range_end);
  const sortedMembers = [...members].sort((a, b) => {
    if (a.user_id === currentUser.id) return -1;
    if (b.user_id === currentUser.id) return 1;
    return 0;
  });

  return (
    <div className={styles.page} ref={pageRef}>
      <div style={{ height: headerHeight }} aria-hidden="true" />
      <div
        ref={headerRef}
        className={`${styles.header} ${headerPinned ? styles.headerPinned : ""} stagger-in`}
        style={staggerStyle(0)}
      >
        <div>
          <h1 className={styles.title}>{project.title}</h1>
          <span className={styles.status}>{STATUS_LABELS[project.status]}</span>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.headerRight}>
            <span className={styles.status}>
              {project.search_range_start} — {project.search_range_end}
            </span>
            {theme === "dark" && (
              <label className={styles.brightToggle}>
                <input
                  type="checkbox"
                  checked={brightColors}
                  onChange={(e) => setBrightColors(e.target.checked)}
                />
                Сделать цвета календаря ярче
              </label>
            )}
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="stagger-in" style={{ ...staggerStyle(1), display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className={`${styles.backButton} ${viewMode === "blocks" ? styles.paintOptionActive : ""}`}
          onClick={() => changeViewMode("blocks")}
        >
          По дням
        </button>
        <button
          type="button"
          className={`${styles.backButton} ${viewMode === "grid" ? styles.paintOptionActive : ""}`}
          onClick={() => changeViewMode("grid")}
        >
          Сетка по дням
        </button>
        <button
          type="button"
          className={`${styles.backButton} ${viewMode === "hours" ? styles.paintOptionActive : ""}`}
          onClick={() => changeViewMode("hours")}
        >
          По часам
        </button>
        {restrictToWorkingHours ? (
          <Link href={`/projects/${id}`} className={styles.backButton}>
            ← Все часы
          </Link>
        ) : (
          <span title="Функция пока недоступна">
            <button
              type="button"
              disabled
              className={`${styles.backButton} ${styles.comingSoon}`}
            >
              Только рабочие часы
            </button>
          </span>
        )}
      </div>

      {viewMode === "hours" && restrictToWorkingHours && (
        <p className={styles.hint}>Показаны только часы в пределах рабочего времени участников.</p>
      )}

      {viewMode === "grid" && (
        <label className={`${styles.brightToggle} stagger-in`} style={staggerStyle(2)}>
          <input
            type="checkbox"
            checked={showDayStructure}
            onChange={(e) => setShowDayStructure(e.target.checked)}
          />
          Показать структуру дня (часы)
        </label>
      )}

      <div className={`${styles.paintToolbar} stagger-in`} style={staggerStyle(2)}>
        <span className={styles.hint}>Чем закрашивать:</span>
        {STATUS_ORDER.map((status) => (
          <button
            key={status}
            type="button"
            className={`${styles.paintOption} ${paintStatus === status ? styles.paintOptionActive : ""}`}
            onClick={() => setPaintStatus(status)}
          >
            <span
              className={styles.legendSwatch}
              style={{ background: (effectiveBright ? BRIGHT_STATUS_COLORS : DARK_STATUS_COLORS)[status] }}
            />
            {STATUS_PAINT_LABELS[status]}
          </button>
        ))}
      </div>

      {viewMode === "blocks" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {sortedMembers.map((member, memberIndex) => {
            const user = usersById.get(member.user_id);
            const isYou = member.user_id === currentUser.id;
            return (
              <div
                key={member.user_id}
                className={`${styles.memberBlock} stagger-in`}
                style={staggerStyle(memberIndex + 3)}
              >
                <span className={`${styles.memberBlockName} ${isYou ? styles.memberLabelYou : ""}`}>
                  {user?.name ?? member.user_id}
                </span>
                <div className={styles.weekGrid}>
                  {WEEKDAY_HEADERS.map((label) => (
                    <span key={label} className={styles.weekdayHeader}>
                      {label}
                    </span>
                  ))}
                </div>
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className={styles.weekGrid}>
                    {week.map((day, dayIndex) => {
                      if (day === null) {
                        return <div key={dayIndex} />;
                      }
                      const bounds = user
                        ? effectiveWorkingHours(user, restrictToWorkingHours)
                        : { start: "00:00", end: "24:00" };
                      const status = user
                        ? dayStatus(entries, member.user_id, day, bounds.start, bounds.end)
                        : "free";
                      const label = formatDayHeader(day, day.getDate() === 1);
                      if (isYou) {
                        const key = dayKey(day);
                        return (
                          <button
                            key={dayIndex}
                            ref={(el) => {
                              if (el) dayCellRefs.current.set(key, el);
                              else dayCellRefs.current.delete(key);
                            }}
                            type="button"
                            className={`${monthCellClassName(status, effectiveBright, toggleAnimating)} ${styles.cellEditable}`}
                            onMouseDown={() => startDayPaint(member.user_id, day)}
                            onMouseEnter={() => extendDayPaint(member.user_id, day)}
                            onDragStart={(e) => e.preventDefault()}
                            title="Закрасить весь день выбранным статусом"
                            aria-label={`${label}: ${status}. Закрасить весь день выбранным статусом`}
                          >
                            {label}
                          </button>
                        );
                      }
                      return (
                        <div
                          key={dayIndex}
                          className={monthCellClassName(status, effectiveBright, toggleAnimating)}
                        >
                          {label}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "grid" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {weeks.map((week, weekIndex) => (
            <div
              key={weekIndex}
              className={`${styles.gridWrapper} stagger-in`}
              style={staggerStyle(weekIndex + 3)}
            >
              <div
                className={styles.monthGrid}
                style={{ gridTemplateColumns: "130px repeat(7, minmax(0, 1fr))", rowGap: 0, columnGap: 1 }}
              >
                <div />
                {week.map((day, dayIndex) => (
                  <div key={dayIndex} className={styles.weekdayHeader}>
                    {day ? `${weekdayShort(day)} ${day.getDate()}` : ""}
                  </div>
                ))}

                {sortedMembers.map((member) => {
                  const user = usersById.get(member.user_id);
                  const isYou = member.user_id === currentUser.id;
                  return (
                    <div key={member.user_id} style={{ display: "contents" }}>
                      <div className={`${styles.memberLabel} ${isYou ? styles.memberLabelYou : ""}`}>
                        {user?.name ?? member.user_id}
                      </div>
                      {week.map((day, dayIndex) => {
                        if (day === null) {
                          return <div key={dayIndex} />;
                        }
                        const label = formatDayHeader(day, day.getDate() === 1);
                        const bounds = user
                          ? effectiveWorkingHours(user, restrictToWorkingHours)
                          : { start: "00:00", end: "24:00" };
                        const status = user
                          ? dayStatus(entries, member.user_id, day, bounds.start, bounds.end)
                          : "free";

                        const structureOverlay = (
                          <div
                            className={`${styles.dayGridStructureOverlay} ${showDayStructure ? styles.dayGridStructureOverlayVisible : ""}`}
                          >
                            <div className={styles.dayMiniGrid}>
                              {DISPLAY_HOURS.map((hour) => (
                                <span
                                  key={hour}
                                  className={miniSquareClassName(
                                    statusForHour(entries, member.user_id, day, hour),
                                    effectiveBright,
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        );

                        if (isYou) {
                          const key = dayKey(day);
                          return (
                            <button
                              key={dayIndex}
                              ref={(el) => {
                                if (el) dayCellRefs.current.set(key, el);
                                else dayCellRefs.current.delete(key);
                              }}
                              type="button"
                              className={`${dayGridCellClassName(status, effectiveBright, toggleAnimating)} ${styles.cellEditable}`}
                              onMouseDown={() => startDayPaint(member.user_id, day)}
                              onMouseEnter={() => extendDayPaint(member.user_id, day)}
                              onDragStart={(e) => e.preventDefault()}
                              title="Закрасить весь день выбранным статусом"
                              aria-label={`${label}: ${status}. Закрасить весь день выбранным статусом`}
                            >
                              {structureOverlay}
                            </button>
                          );
                        }
                        return (
                          <div
                            key={dayIndex}
                            className={dayGridCellClassName(status, effectiveBright, toggleAnimating)}
                            aria-label={`${label}: ${status}`}
                          >
                            {structureOverlay}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === "hours" && (
        <>
          <p className={styles.hint}>Почасовая занятость по дням — каждая неделя на своей строке.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {weeks.map((week, weekIndex) => (
              <div
                key={weekIndex}
                className={`${styles.gridWrapper} stagger-in`}
                style={staggerStyle(weekIndex + 3)}
              >
                <div
                  className={styles.monthGrid}
                  style={{
                    gridTemplateColumns: `130px repeat(${7 * DISPLAY_HOURS.length}, minmax(20px, 1fr))`,
                  }}
                >
                  <div />
                  {week.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={day ? styles.dayGroupHeader : undefined}
                      style={{ gridColumn: `span ${DISPLAY_HOURS.length}` }}
                    >
                      {day ? `${weekdayShort(day)}, ${formatDayHeader(day, true)}` : ""}
                    </div>
                  ))}

                  <div />
                  {week.map((day, dayIndex) =>
                    DISPLAY_HOURS.map((hour, hourIndex) => (
                      <div
                        key={`${dayIndex}-${hour}`}
                        className={hourIndex === 0 ? styles.dayBoundary : ""}
                      >
                        {day ? (
                          <span className={styles.hourHeader}>{String(hour).padStart(2, "0")}</span>
                        ) : null}
                      </div>
                    )),
                  )}

                  {sortedMembers.map((member) => {
                    const user = usersById.get(member.user_id);
                    const isYou = member.user_id === currentUser.id;
                    return (
                      <div key={member.user_id} style={{ display: "contents" }}>
                        <div className={`${styles.memberLabel} ${isYou ? styles.memberLabelYou : ""}`}>
                          {user?.name ?? member.user_id}
                        </div>
                        {week.map((day, dayIndex) =>
                          DISPLAY_HOURS.map((hour, hourIndex) => {
                            const boundary = hourIndex === 0 ? styles.dayBoundary : "";
                            const key = `${dayIndex}-${hour}`;

                            if (day === null) {
                              return <div key={key} className={boundary} />;
                            }

                            const status = statusForHour(entries, member.user_id, day, hour);
                            const bounds = user
                              ? effectiveWorkingHours(user, restrictToWorkingHours)
                              : { start: "00:00", end: "24:00" };
                            const withinHours = isWithinWorkingHours(hour, bounds.start, bounds.end);
                            const className = `${cellClassName(status, withinHours, effectiveBright, toggleAnimating)} ${boundary}`;

                            if (isYou && withinHours) {
                              const dragKey = cellKey(day, hour);
                              return (
                                <button
                                  key={key}
                                  ref={(el) => {
                                    if (el) hourCellRefs.current.set(dragKey, { el, boundaryClass: boundary });
                                    else hourCellRefs.current.delete(dragKey);
                                  }}
                                  type="button"
                                  className={`${className} ${styles.cellEditable}`}
                                  onMouseDown={() => startHourPaint(member.user_id, day, hour)}
                                  onMouseEnter={() => extendHourPaint(member.user_id, day, hour)}
                                  onDragStart={(e) => e.preventDefault()}
                                  aria-label={`${formatDayHeader(day, true)} ${String(hour).padStart(2, "0")}:00, статус: ${status}`}
                                />
                              );
                            }
                            return <div key={key} className={className} />;
                          }),
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span
            className={styles.legendSwatch}
            style={{ background: (effectiveBright ? BRIGHT_STATUS_COLORS : DARK_STATUS_COLORS).free }}
          />
          не определено
        </span>
        <span className={styles.legendItem}>
          <span
            className={styles.legendSwatch}
            style={{ background: (effectiveBright ? BRIGHT_STATUS_COLORS : DARK_STATUS_COLORS).busy }}
          />
          занят
        </span>
        <span className={styles.legendItem}>
          <span
            className={styles.legendSwatch}
            style={{ background: (effectiveBright ? BRIGHT_STATUS_COLORS : DARK_STATUS_COLORS).tentative }}
          />
          могу освободить
        </span>
        <span className={styles.legendItem}>
          <span
            className={styles.legendSwatch}
            style={{ background: (effectiveBright ? BRIGHT_STATUS_COLORS : DARK_STATUS_COLORS).available }}
          />
          есть время
        </span>
        {viewMode === "hours" && restrictToWorkingHours && (
          <span className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{
                background:
                  "repeating-linear-gradient(45deg, #1a1a1a, #1a1a1a 2px, #242424 2px, #242424 4px)",
              }}
            />
            вне рабочих часов
          </span>
        )}
      </div>
    </div>
  );
}
