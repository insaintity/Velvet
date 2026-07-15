import type { LucideIcon } from "lucide-react";
import { BarChart3, CalendarClock, FolderKanban, History, Settings, Sparkles } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: "New Media", href: "/projects/new", icon: Sparkles },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Scheduler", href: "/publishing", icon: CalendarClock },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "History", href: "/history", icon: History },
  { label: "Settings", href: "/settings", icon: Settings }
];

export const onboardingSteps = [
  "ChatGPT / OpenAI",
  "ElevenLabs",
  "YouTube",
  "Storage & worker",
  "Review"
];

export const safetyDefaults = [
  "Assisted workflow by default",
  "Review blueprint before generation",
  "Review tracks before rendering",
  "Upload privately before publishing",
  "Never run paid retries silently"
];

export const historyPromptTypes = [
  "Album brief",
  "Album blueprint prompt",
  "Track music prompts",
  "Album cover prompt",
  "YouTube thumbnail prompt",
  "Video background prompt",
  "YouTube metadata prompt"
];

export const historyColumns = [
  "Upload",
  "Project",
  "Privacy",
  "Published",
  "Prompts",
  "Status"
];
