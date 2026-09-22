"use client";

import { use } from "react";
import ProjectCalendar from "./ProjectCalendar";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ProjectCalendar id={id} restrictToWorkingHours={false} />;
}
