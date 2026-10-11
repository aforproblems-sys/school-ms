import { redirect } from "next/navigation";

export default function SettingsIndexPage() {
  // Default settings landing page
  redirect("/settings/system-status");
}
