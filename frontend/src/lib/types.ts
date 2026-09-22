export interface User {
  id: string;
  email: string;
  name: string;
  timezone: string;
  working_hours_start: string;
  working_hours_end: string;
}

export type ProjectStatus = "pending" | "confirmed" | "cancelled" | "no_slot_found";

export interface Project {
  id: string;
  title: string;
  duration_minutes: number;
  search_range_start: string;
  search_range_end: string;
  status: ProjectStatus;
  chosen_start_at: string | null;
  chosen_end_at: string | null;
  owner_id: string;
}

export type MemberRole = "editor" | "participant";

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: MemberRole;
}

export type ProjectAvailabilityStatus = "busy" | "tentative" | "free" | "available";

export interface ProjectAvailabilityEntry {
  id: string;
  project_id: string;
  user_id: string;
  start_at: string;
  end_at: string;
  status: ProjectAvailabilityStatus;
}
