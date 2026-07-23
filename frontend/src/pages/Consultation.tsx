import { useEffect, useRef, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Volume2, Menu, Stethoscope, Loader2 } from "lucide-react";
import DoctorAvatar from "../components/DoctorAvatar";
import ChatMessage from "../components/ChatMessage";
import ChatInput from "../components/ChatInput";
import TypingIndicator from "../components/TypingIndicator";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

interface Specialist {
  id: string;
  name: string;
  specialty: string;
}

interface AttachmentAnalysis {
  risk_level?: string;
  simple_summary?: string[];
  clinical_findings?: string[];
}

const API_BASE = import.meta.env.VITE_RESCUE_API_URL || "http://localhost:8000";

const Consultation = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Specialist | null>(null);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!selectedDoctor) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [selectedDoctor]);

  useEffect(() => {
    const loadSpecialists = async () => {
      setLoadingDoctors(true);
      try {
        const res = await fetch(`${API_BASE}/consultation/specialists`);
        if (!res.ok) throw new Error("Could not load specialists");
        const data = await res.json();
        setSpecialists(data.specialists || []);
      } catch {
        setSpecialists([]);
      } finally {
        setLoadingDoctors(false);
      }
    };
    void loadSpecialists();
  }, []);

  const startWithDoctor = async (doctor: Specialist) => {
    setLoadingDoctors(true);
    try {
      const res = await fetch(`${API_BASE}/consultation/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: doctor.id,
          user_email: localStorage.getItem("user_email") || undefined,
        }),
      });
      if (!res.ok) throw new Error("Could not start consultation");
      const data = await res.json();
      setSelectedDoctor(doctor);
      setSessionId(data.session_id || null);
      setMessages(
        (data.messages || []).map((msg: { role: "user" | "assistant"; content: string }, index: number) => ({
          id: Date.now() + index,
          role: msg.role,
          content: msg.content,
        })),
      );
    } catch {
      setSelectedDoctor(doctor);
      setSessionId(null);
      setMessages([
        {
          id: Date.now(),
          role: "assistant",
          content: `Hello, I am ${doctor.name}, your ${doctor.specialty}. Please describe your symptoms and I will guide you.`,
        },
      ]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleSend = async (content: string) => {
    if (!content.trim() || !selectedDoctor || !sessionId) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const res = await fetch(`${API_BASE}/consultation/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          doctor_id: selectedDoctor.id,
          user_message: content,
          patient_data: { symptoms: content },
        }),
      });
      if (!res.ok) throw new Error("Consultation response failed");
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: data.reply || "I could not generate a response right now.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: "I am temporarily unavailable. Please retry in a moment.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAttachmentUpload = async (file: File) => {
    if (!selectedDoctor || !sessionId) return;

    const previewMessage: Message = {
      id: Date.now(),
      role: "user",
      content: `Uploaded image: ${file.name}`,
    };
    setMessages((prev) => [...prev, previewMessage]);
    setIsUploadingAttachment(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/consultation/session/${sessionId}/attachment`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Attachment analysis failed");
      const data = await res.json();
      const analysis: AttachmentAnalysis = data.analysis || {};
      const summary = (analysis.simple_summary || []).slice(0, 2).join(" ");
      const findings = (analysis.clinical_findings || []).slice(0, 2).join(", ");
      const doctorContext = [
        `I reviewed the uploaded image for ${selectedDoctor.name}.`,
        summary || "The image analysis is now attached to this consultation.",
        findings ? `Key findings: ${findings}.` : "",
      ]
        .filter(Boolean)
        .join(" ");

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: doctorContext,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: "I could not analyze that image right now. You can still continue the consultation with a text description.",
        },
      ]);
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  return (
    <AppLayout>
      <div className="relative min-h-screen">
        <div className="relative h-[calc(100vh-4rem)] flex flex-col">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-20 flex items-center justify-between px-5 pt-5 pb-2">
          <button className="p-2.5 rounded-full glass-card hover:scale-105 transition-transform">
            <Menu size={20} className="text-primary" />
          </button>

          <button
            onClick={() => setSoundOn(!soundOn)}
            className={`p-2.5 rounded-full glass-card transition-transform ${soundOn ? "glow-sm" : ""}`}
          >
            <Volume2 size={20} className={soundOn ? "text-primary" : "text-muted-foreground"} />
          </button>
        </div>

        <div className="relative z-10 flex-shrink-0 flex items-center justify-center py-6">
          <DoctorAvatar speaking={isTyping} />
        </div>

        <div className="relative z-20 flex-1 min-h-0 mx-3 mb-3 flex flex-col glass-card rounded-3xl overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-4 pb-2 scrollbar-thin">
            {selectedDoctor && (
              <div className="mb-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
                Consulting with: <span className="font-semibold">{selectedDoctor.name}</span> ({selectedDoctor.specialty})
              </div>
            )}

            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                senderName={msg.role === "assistant" ? (selectedDoctor?.name || "AI Doctor") : "You"}
              />
            ))}

            {(isTyping || isUploadingAttachment) && <TypingIndicator />}
          </div>

          <ChatInput onSend={handleSend} onAttachment={handleAttachmentUpload} attachmentDisabled={!selectedDoctor || !sessionId || isUploadingAttachment} />
        </div>

        {!selectedDoctor && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-2xl flex items-center justify-center">
            <div className="h-full w-full max-w-6xl rounded-3xl border border-border bg-card/95 p-6 shadow-2xl md:p-8 overflow-auto">
              <div className="mb-6 flex items-center gap-4">
                <div className="rounded-2xl bg-primary/20 p-3">
                  <Stethoscope className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Choose Your Specialist Doctor</h2>
                  <p className="text-muted-foreground">Select one doctor to start focused consultation with specialist-level guidance.</p>
                </div>
              </div>

              {loadingDoctors ? (
                <div className="flex h-[50vh] items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading specialist doctors...
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {specialists.map((doctor) => (
                    <button
                      key={doctor.id}
                      onClick={() => startWithDoctor(doctor)}
                      className="group rounded-2xl border border-border bg-gradient-to-br from-card via-card to-secondary/40 p-6 text-left transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-primary/80">Specialist</p>
                      <h3 className="mt-3 text-2xl font-semibold leading-tight">{doctor.name}</h3>
                      <p className="mt-2 text-muted-foreground">{doctor.specialty}</p>
                      <p className="mt-5 text-sm font-medium text-primary opacity-0 transition group-hover:opacity-100">Start Consultation</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </AppLayout>
  );
};

export default Consultation;
