import type { LucideIcon } from "lucide-react";
import { FolderKanban, LayoutDashboard, Settings, Sparkles } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "New Album", href: "/projects/new", icon: Sparkles },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Settings", href: "/settings", icon: Settings }
];

export const setupSteps = [
  {
    title: "Add provider keys",
    body: "Connect OpenAI and ElevenLabs before generation is available.",
    href: "/settings"
  },
  {
    title: "Connect YouTube",
    body: "Optional for now. Private upload and publishing controls unlock after OAuth.",
    href: "/settings/youtube"
  },
  {
    title: "Create first album",
    body: "Start with one natural-language brief. Velvet Coda will ask before any paid work.",
    href: "/projects/new"
  }
];

export const preferenceDefaults = [
  "Let Velvet Coda decide",
  "Instrumental unless requested",
  "Assisted workflow",
  "Private upload review"
];
