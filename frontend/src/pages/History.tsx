import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  History as HistoryIcon,
  Stethoscope,
  FileSearch,
  Heart,
  AlertTriangle,
  Eye,
  Calendar,
  Clock,
  Filter,
  Activity,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface HistoryItem {
  id: string;
  type: string;
  title: string;
  summary: string;
  occurred_at: string;
  duration: string;
  status: string;
  has_report: boolean;
  metadata?: Record<string, unknown>;
}

interface HistoryStats {
  consultations: number;
  reports: number;
  mental: number;
  emergency: number;
  activities: number;
  total: number;
}

const API_BASE = import.meta.env.VITE_RESCUE_API_URL || "http://localhost:8000";
const filters = ["all", "AI Consultation", "Report Analysis", "Mental Health", "Emergency Help", "App Activity"];

const iconByType = {
  "AI Consultation": Stethoscope,
  "Report Analysis": FileSearch,
  "Mental Health": Heart,
  "Emergency Help": AlertTriangle,
  "App Activity": Activity,
};

const getIconColor = (type: string) => {
  switch (type) {
    case "AI Consultation":
      return "bg-primary/20 text-primary";
    case "Report Analysis":
      return "bg-accent/20 text-accent";
    case "Mental Health":
      return "bg-mental-teal/20 text-mental-teal";
    case "Emergency Help":
      return "bg-emergency-red/20 text-emergency-red";
    case "App Activity":
      return "bg-warning-amber/20 text-warning-amber";
    default:
      return "bg-secondary text-muted-foreground";
  }
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

export default function History() {
  const [sessions, setSessions] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<HistoryStats>({
    consultations: 0,
    reports: 0,
    mental: 0,
    emergency: 0,
    activities: 0,
    total: 0,
  });
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSession, setSelectedSession] = useState<HistoryItem | null>(null);

  const email = useMemo(() => localStorage.getItem("user_email") || "john.doe@email.com", []);

  const loadHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ email, limit: "100" });
      if (selectedFilter !== "all") params.set("activity_type", selectedFilter);
      const res = await fetch(`${API_BASE}/history/sessions?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Could not load history");
      setSessions(data.items || []);
      setStats(data.stats || {});
    } catch (err: any) {
      setError(err?.message || "Could not load history");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, [selectedFilter]);

  const totalMinutes = sessions.reduce((sum, session) => {
    const match = session.duration.match(/\d+/);
    return sum + (match ? Number(match[0]) : 1);
  }, 0);

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 mb-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
            <HistoryIcon className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Session History</h1>
            <p className="text-muted-foreground">Dynamic timeline of patient activity across AetherDoc</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-secondary p-1">
            <Filter className="ml-2 w-4 h-4 text-muted-foreground" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="bg-transparent px-2 py-2 text-sm text-foreground outline-none"
            >
              {filters.map((filter) => (
                <option key={filter} value={filter}>
                  {filter === "all" ? "All Activity" : filter}
                </option>
              ))}
            </select>
          </div>
          <button
            className="px-4 py-2 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 transition-colors flex items-center gap-2"
            onClick={() => void loadHistory()}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Stethoscope} label="Consultations" value={stats.consultations || 0} color="bg-primary/20 text-primary" />
        <StatCard icon={FileSearch} label="Reports Analyzed" value={stats.reports || 0} color="bg-accent/20 text-accent" />
        <StatCard icon={Heart} label="Wellness Sessions" value={stats.mental || 0} color="bg-mental-teal/20 text-mental-teal" />
        <StatCard icon={Clock} label="Tracked Time" value={`${totalMinutes}m`} color="bg-secondary text-muted-foreground" />
      </div>

      <div className="card-medical">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-foreground">All Sessions</h2>
          <span className="text-sm text-muted-foreground">{stats.total || sessions.length} records</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 w-5 h-5 animate-spin" />
            Loading patient history...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-emergency-red/30 bg-emergency-red/10 p-5 text-emergency-red">
            {error}
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <HistoryIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">No history yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Patient activity will appear here after consultations, reports, emergency help, wellness sessions, or app visits.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const Icon = iconByType[session.type as keyof typeof iconByType] || Activity;
              return (
                <div key={`${session.type}-${session.id}`} className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${getIconColor(session.type)}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-foreground">{session.title || session.type}</h3>
                          <p className="text-xs text-muted-foreground">{session.type}</p>
                          <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(session.occurred_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(session.occurred_at)}
                            </span>
                            <span>{session.duration}</span>
                            <span className="rounded-full bg-background px-2 py-0.5 text-xs">{session.status}</span>
                          </div>
                        </div>
                        <button
                          className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setSelectedSession(session)}
                          aria-label="View session details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{session.summary}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{selectedSession.title}</h3>
                <p className="text-sm text-muted-foreground">{selectedSession.type}</p>
              </div>
              <button className="rounded-lg border border-border px-3 py-1 text-sm" onClick={() => setSelectedSession(null)}>
                Close
              </button>
            </div>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{selectedSession.summary}</p>
            <div className="mt-4 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
              <p>Date: {formatDate(selectedSession.occurred_at)} at {formatTime(selectedSession.occurred_at)}</p>
              <p>Status: {selectedSession.status}</p>
              <p>Duration: {selectedSession.duration}</p>
              {selectedSession.metadata ? <p>Metadata: {JSON.stringify(selectedSession.metadata)}</p> : null}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Stethoscope;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="card-medical">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
