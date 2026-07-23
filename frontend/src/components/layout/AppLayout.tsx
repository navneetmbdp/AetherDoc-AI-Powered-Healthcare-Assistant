import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();

  useEffect(() => {
    const email = localStorage.getItem("user_email");
    if (!email || location.pathname === "/history") return;

    const labels: Record<string, string> = {
      "/": "Dashboard",
      "/dashboard": "Dashboard",
      "/reports": "Reports",
      "/consultation": "AI Consultation",
      "/mental-health": "Mental Health",
      "/emergency": "Emergency Help",
      "/emergency/ai": "Emergency Assist",
      "/profile": "Profile",
    };
    const title = labels[location.pathname] || location.pathname.replace("/", "") || "AetherDoc";

    fetch(`${import.meta.env.VITE_RESCUE_API_URL || "http://localhost:8000"}/history/activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        activity_type: "App Activity",
        title: `Opened ${title}`,
        summary: `Patient visited ${title}.`,
        metadata: { path: location.pathname },
      }),
    }).catch(() => {
      // Activity logging should never interrupt patient workflows.
    });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="pl-64">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
