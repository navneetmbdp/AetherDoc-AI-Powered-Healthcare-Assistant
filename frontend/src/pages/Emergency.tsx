import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Phone,
  Heart,
  Wind,
  Droplets,
  Flame,
  Zap,
  Volume2,
  Mic,
  Activity,
} from "lucide-react";

const emergencyGuides = [
  {
    id: "cpr",
    title: "CPR",
    subtitle: "Cardiac Arrest",
    description: "Step-by-step chest compression and rescue breathing",
    icon: Heart,
    color: "emergency-red",
  },
  {
    id: "choking",
    title: "Choking",
    subtitle: "Airway Blocked",
    description: "Heimlich maneuver for adults and children",
    icon: Wind,
    color: "warning-amber",
  },
  {
    id: "bleeding",
    title: "Bleeding",
    subtitle: "Severe Wounds",
    description: "Control bleeding and apply pressure techniques",
    icon: Droplets,
    color: "emergency-red",
  },
  {
    id: "burns",
    title: "Burns",
    subtitle: "Thermal Injury",
    description: "Cool, cover, and treat burn injuries",
    icon: Flame,
    color: "warning-amber",
  },
  {
    id: "shock",
    title: "Electric Shock",
    subtitle: "Electrical Injury",
    description: "Safe approach and first response",
    icon: Zap,
    color: "primary",
  },
  {
    id: "allergic",
    title: "Allergic Reaction",
    subtitle: "Anaphylaxis",
    description: "Recognize and respond to severe allergies",
    icon: Activity,
    color: "emergency-red",
  },
];

export default function Emergency() {
  const { toast } = useToast();
  const [callLoading, setCallLoading] = useState(false);
  const API_BASE = import.meta.env.VITE_RESCUE_API_URL || "http://localhost:8000";

  const callEmergencyService = async () => {
    setCallLoading(true);
    try {
      const response = await fetch(`${API_BASE}/sos/call-primary`, { method: "POST" });
      if (!response.ok) throw new Error("Emergency call could not be initiated");

      toast({
        title: "Emergency call started",
        description: "Calling 9810112192 with predefined emergency voice alert.",
      });
    } catch (error: any) {
      toast({
        title: "Call failed",
        description: error?.message || "Unable to reach emergency service.",
        variant: "destructive",
      });
    } finally {
      setCallLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="card-emergency mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emergency-red/20 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-emergency-red icon-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Emergency Medical Help</h1>
            <p className="text-muted-foreground">
              Get immediate life-saving guidance with voice-first instructions
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={callEmergencyService}
            disabled={callLoading}
            className="btn-emergency w-full py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-70"
          >
            <Phone className="w-6 h-6" />
            {callLoading ? "Calling 9810112192..." : "Call Emergency Services"}
          </button>

          <Link
            to="/emergency/ai"
            className="btn-medical w-full py-4 text-lg flex items-center justify-center gap-2"
          >
            <Volume2 className="w-6 h-6" />
            Start Voice Guidance
          </Link>
        </div>
      </div>

      <div className="card-medical mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Mic className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Voice-First Emergency Mode</h3>
              <p className="text-sm text-muted-foreground">
                Say "Help" or describe the emergency for immediate guidance
              </p>
            </div>
          </div>

          <Link
            to="/emergency/ai"
            className="px-6 py-3 rounded-xl bg-primary/20 text-primary font-medium hover:bg-primary/30 transition-colors flex items-center gap-2"
          >
            <Mic className="w-5 h-5" />
            Activate Voice
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Emergency Guides</h2>
        <p className="text-muted-foreground mb-6">
          Select an emergency type for step-by-step instructions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {emergencyGuides.map((guide) => (
          <Link
            key={guide.id}
            to={`/emergency/ai?type=${guide.id}`}
            className="card-medical text-left hover:scale-[1.02] transition-transform duration-200 group"
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  guide.color === "emergency-red"
                    ? "bg-emergency-red/20"
                    : guide.color === "warning-amber"
                      ? "bg-warning-amber/20"
                      : "bg-primary/20"
                }`}
              >
                <guide.icon
                  className={`w-7 h-7 ${
                    guide.color === "emergency-red"
                      ? "text-emergency-red"
                      : guide.color === "warning-amber"
                        ? "text-warning-amber"
                        : "text-primary"
                  }`}
                />
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {guide.title}
                </h3>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  {guide.subtitle}
                </p>
                <p className="text-sm text-muted-foreground">{guide.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 p-4 rounded-xl bg-secondary border border-border">
        <p className="text-sm text-muted-foreground text-center">
          <span className="font-semibold text-foreground">Important:</span> AetherDoc provides
          guidance assistance only. Always call emergency services for life-threatening situations.
        </p>
      </div>
    </AppLayout>
  );
}
