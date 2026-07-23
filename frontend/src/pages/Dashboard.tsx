import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Stethoscope,
  FileSearch,
  Heart,
  Activity,
  Clock,
  Calendar,
  TrendingUp,
  Phone,
} from "lucide-react";

const quickActions = [
  {
    title: "Emergency Help",
    description: "Get immediate medical guidance",
    icon: AlertTriangle,
    href: "/emergency",
    variant: "emergency" as const,
    priority: true,
  },
  {
    title: "AI Doctor Consultation",
    description: "Speak with our AI physician",
    icon: Stethoscope,
    href: "/consultation",
    variant: "medical" as const,
  },
  {
    title: "Upload Medical Report",
    description: "Analyze X-rays, scans & lab reports",
    icon: FileSearch,
    href: "/reports",
    variant: "health" as const,
  },
  {
    title: "Mental Health Support",
    description: "Talk to our empathetic AI counselor",
    icon: Heart,
    href: "/mental-health",
    variant: "mental" as const,
  },
];

const recentSessions = [
  {
    id: 1,
    type: "AI Consultation",
    date: "Jan 23, 2026",
    time: "2:30 PM",
    summary: "Discussed symptoms of seasonal allergies",
    status: "completed",
  },
  {
    id: 2,
    type: "Report Analysis",
    date: "Jan 20, 2026",
    time: "10:15 AM",
    summary: "Blood test results reviewed",
    status: "completed",
  },
  {
    id: 3,
    type: "Mental Health",
    date: "Jan 18, 2026",
    time: "4:00 PM",
    summary: "Stress management session",
    status: "completed",
  },
];

const healthMetrics = [
  { label: "Sessions This Month", value: "12", change: "+3", icon: Activity },
  { label: "Reports Analyzed", value: "5", change: "+2", icon: FileSearch },
  { label: "Next Checkup", value: "Feb 15", icon: Calendar },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEmergencyLoading, setIsEmergencyLoading] = useState(false);
  const API_BASE = import.meta.env.VITE_RESCUE_API_URL || "http://localhost:8000";

  const handleEmergencyContact = async () => {
    setIsEmergencyLoading(true);
    try {
      const response = await fetch(`${API_BASE}/sos/call-primary`, { method: "POST" });
      if (!response.ok) {
        throw new Error("Unable to initiate emergency contact");
      }

      toast({
        title: "Emergency alert sent",
        description: "Calling and messaging 9810112192 with the default emergency message.",
      });
    } catch (error: any) {
      toast({
        title: "Emergency action failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEmergencyLoading(false);
    }
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back, John</h1>
        <p className="text-muted-foreground">
          Your AI-powered healthcare assistant is ready to help you.
        </p>
      </div>

      {/* Emergency Banner */}
      <div className="card-emergency mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emergency-red/20 flex items-center justify-center">
            <Phone className="w-6 h-6 text-emergency-red icon-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Emergency SOS</h3>
            <p className="text-sm text-muted-foreground">One-tap emergency call to local services</p>
          </div>
        </div>
        <button onClick={handleEmergencyContact} disabled={isEmergencyLoading} className="btn-emergency disabled:opacity-70">
          <Phone className="w-5 h-5" />
          {isEmergencyLoading ? "Contacting..." : "Call Emergency"}
        </button>
      </div>

      {/* Quick Actions Grid */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.title}
              onClick={() => navigate(action.href)}
              className={`card-medical text-left hover:scale-[1.02] transition-transform duration-200 ${
                action.priority ? "ring-1 ring-emergency-red/30" : ""
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  action.variant === "emergency"
                    ? "bg-emergency-red/20"
                    : action.variant === "medical"
                    ? "bg-primary/20"
                    : action.variant === "health"
                    ? "bg-accent/20"
                    : "bg-mental-teal/20"
                }`}
              >
                <action.icon
                  className={`w-6 h-6 ${
                    action.variant === "emergency"
                      ? "text-emergency-red"
                      : action.variant === "medical"
                      ? "text-primary"
                      : action.variant === "health"
                      ? "text-accent"
                      : "text-mental-teal"
                  }`}
                />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{action.title}</h3>
              <p className="text-sm text-muted-foreground">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {healthMetrics.map((metric) => (
          <div key={metric.label} className="card-medical">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                {metric.change && (
                  <p className="text-sm text-accent flex items-center gap-1 mt-1">
                    <TrendingUp className="w-4 h-4" />
                    {metric.change} this month
                  </p>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <metric.icon className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Recent Sessions</h2>
          <button
            onClick={() => navigate("/history")}
            className="text-sm text-primary hover:underline"
          >
            View All
          </button>
        </div>
        <div className="card-medical">
          <div className="divide-y divide-border">
            {recentSessions.map((session) => (
              <div key={session.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <Activity className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{session.type}</p>
                    <p className="text-sm text-muted-foreground">{session.summary}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-foreground">{session.date}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />
                    {session.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
