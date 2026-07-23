import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Loader2,
  MapPin,
  Mic,
  MicOff,
  Phone,
  Send,
  ShieldAlert,
  Video,
  Camera,
  Siren,
  Sparkles,
  PlayCircle,
  X,
} from "lucide-react";

type RiskLevel = "low" | "medium" | "high" | "critical";
type EmergencyStatus = "ready" | "listening" | "processing" | "critical";

interface LocationPayload {
  latitude: number;
  longitude: number;
  country?: string;
}

interface AssistResponse {
  session_id: string;
  avatar_symbol: string;
  emergency_type: string;
  risk_level: RiskLevel;
  summary: string;
  immediate_steps: string[];
  do_not_do?: string[];
  local_help?: string;
  monitor_signs?: string[];
  notify_result?: { sent: boolean; status?: string; recipients?: string[]; reason?: string };
  tutorial_videos?: TutorialVideo[];
}

interface TutorialVideo {
  title: string;
  url: string;
  embed_url?: string;
  video_id?: string;
  thumbnail?: string;
  channel?: string;
  source?: string;
}

interface CameraFrameResult {
  avatar_symbol?: string;
  observations?: string[];
  possible_conditions?: string[];
  severity_level?: "low" | "moderate" | "high";
  immediate_actions?: string[];
  emergency_warning?: string;
  disclaimer?: string;
}

interface VideoResult {
  emotion_label: string | null;
  audio_present: boolean;
  burn?: boolean;
  blood?: boolean;
  wound?: boolean;
}

interface ChatEntry {
  id: string;
  role: "user" | "ai";
  text: string;
  response?: AssistResponse;
}

type SpeechRecognitionCtor = new () => SpeechRecognition;
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

const API_BASE = import.meta.env.VITE_RESCUE_API_URL || "http://localhost:8000";
const WS_BASE = API_BASE.replace(/^http/, "ws");
const ALWAYS_ON_SESSION_ID = "always-on-emergency-session";
const STATUS_CLASSES: Record<EmergencyStatus, string> = {
  ready: "bg-primary/20 text-primary border-primary/40",
  listening: "bg-accent/20 text-accent border-accent/40",
  processing: "bg-warning-amber/20 text-warning-amber border-warning-amber/40",
  critical: "bg-emergency-red/20 text-emergency-red border-emergency-red/40 animate-pulse",
};
const MP4_MIME_TYPES = ["video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=h264", "video/mp4"];
const TUTORIAL_OFFER_TEXT = "I can suggest a short tutorial video for this emergency. Would you like me to show it?";

const isAffirmativeTutorialReply = (text: string) => {
  const normalized = text.trim().toLowerCase();
  return /^(yes|yeah|yep|sure|ok|okay|please|show|show me|play|play it|open|open it|do it)\b/.test(normalized);
};

const isNegativeTutorialReply = (text: string) => {
  const normalized = text.trim().toLowerCase();
  return /^(no|nope|not now|don't|do not|stop|cancel)\b/.test(normalized);
};

export default function EmergencyAvatar() {
  const { toast } = useToast();

  const [sessionId, setSessionId] = useState<string>("");
  const [avatarSymbol, setAvatarSymbol] = useState("Gemini Rescue");
  const [status, setStatus] = useState<EmergencyStatus>("ready");
  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const [location, setLocation] = useState<LocationPayload>({
    latitude: 0,
    longitude: 0,
  });
  const [emotionLabel, setEmotionLabel] = useState("");
  const [blood, setBlood] = useState(false);
  const [wound, setWound] = useState(false);
  const [burn, setBurn] = useState(false);
  const [emailsInput, setEmailsInput] = useState("");
  const [autoNotify, setAutoNotify] = useState(true);

  const [notifyResult, setNotifyResult] = useState<AssistResponse["notify_result"]>();
  const [cameraResult, setCameraResult] = useState<CameraFrameResult | null>(null);
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [cameraStreaming, setCameraStreaming] = useState(false);

  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [voicePaused, setVoicePaused] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [tutorialLoading, setTutorialLoading] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [selectedTutorial, setSelectedTutorial] = useState<TutorialVideo | null>(null);
  const [tutorialOfferPending, setTutorialOfferPending] = useState(false);
  const [manualAlertLoading, setManualAlertLoading] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const emergencySocketRef = useRef<WebSocket | null>(null);
  const handsFreeRef = useRef(false);
  const activeRequestRef = useRef(false);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const imageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceLoopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visionBusyRef = useRef(false);
  const mp4WarnedRef = useRef(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const riskText = useMemo(() => {
    const latestAI = [...chat].reverse().find((m) => m.role === "ai" && m.response);
    return latestAI?.response?.risk_level || "low";
  }, [chat]);

  const latestAssist = useMemo(() => {
    return [...chat].reverse().find((m) => m.role === "ai" && m.response)?.response || null;
  }, [chat]);

  const tutorialEmbedUrl = useMemo(() => {
    if (!selectedTutorial) return "";
    if (selectedTutorial.embed_url) return selectedTutorial.embed_url;
    const videoId = selectedTutorial.video_id || selectedTutorial.url.match(/[?&]v=([^&]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : "";
  }, [selectedTutorial]);

  const tutorialContextText = useMemo(() => {
    const cameraContext = cameraResult
      ? [
          `Camera severity: ${cameraResult.severity_level || "unknown"}`,
          `Camera observations: ${(cameraResult.observations || []).join(", ")}`,
          `Possible conditions: ${(cameraResult.possible_conditions || []).join(", ")}`,
          `Camera actions: ${(cameraResult.immediate_actions || []).join(", ")}`,
          cameraResult.emergency_warning ? `Camera warning: ${cameraResult.emergency_warning}` : "",
        ].join(". ")
      : "";
    const videoContext = videoResult
      ? [
          `Video emotion: ${videoResult.emotion_label || "unknown"}`,
          `Video audio present: ${videoResult.audio_present ? "yes" : "no"}`,
          videoResult.blood ? "Video detected blood" : "",
          videoResult.wound ? "Video detected wound" : "",
          videoResult.burn ? "Video detected burn" : "",
        ].join(". ")
      : "";

    return [
      latestAssist?.summary || "",
      ...(latestAssist?.immediate_steps || []),
      cameraContext,
      videoContext,
      chat
        .slice(-4)
        .map((item) => item.text)
        .join(" "),
    ].join(" ");
  }, [cameraResult, chat, latestAssist, videoResult]);

  useEffect(() => {
    setVoiceSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (voiceLoopTimeoutRef.current) {
        clearTimeout(voiceLoopTimeoutRef.current);
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  const clearVisionIntervals = useCallback(() => {
    if (imageIntervalRef.current) {
      clearInterval(imageIntervalRef.current);
      imageIntervalRef.current = null;
    }
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    setSessionId(ALWAYS_ON_SESSION_ID);
    setAvatarSymbol("Gemini Rescue");
  }, []);

  useEffect(() => {
    handsFreeRef.current = handsFree;
  }, [handsFree]);

  const speakText = useCallback(
    (message: string) => {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        setSpeaking(false);
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    []
  );

  const speakReply = useCallback(
    (res: AssistResponse) => {
      const msg = [
        res.summary,
        ...(res.immediate_steps || []).map((s, i) => `Step ${i + 1}. ${s}`),
        TUTORIAL_OFFER_TEXT,
      ].join(". ");
      speakText(msg);
    },
    [speakText]
  );

  const handleAssistResponse = useCallback(
    (data: AssistResponse) => {
      setChat((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "ai", text: data.summary, response: data },
        { id: `t-${Date.now()}`, role: "ai", text: TUTORIAL_OFFER_TEXT },
      ]);
      setTutorialOfferPending(true);
      setNotifyResult(data.notify_result);
      setStatus(data.risk_level === "critical" ? "critical" : "ready");
      if (handsFreeRef.current) {
        speakReply(data);
      }
    },
    [speakReply]
  );

  useEffect(() => {
    const socket = new WebSocket(`${WS_BASE}/rescue/emergency/ws/${ALWAYS_ON_SESSION_ID}`);
    emergencySocketRef.current = socket;

    socket.onopen = () => setSocketConnected(true);
    socket.onclose = () => {
      setSocketConnected(false);
      if (emergencySocketRef.current === socket) {
        emergencySocketRef.current = null;
      }
      if (activeRequestRef.current) {
        activeRequestRef.current = false;
        setChatLoading(false);
        setStatus("ready");
      }
    };
    socket.onerror = () => setSocketConnected(false);
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "assistant_response") {
          handleAssistResponse(message.payload);
        } else if (message.type === "error") {
          throw new Error(message.message || "Emergency assist failed");
        }
      } catch (error: any) {
        setStatus("ready");
        toast({
          title: "Assist failed",
          description: error?.message || "Emergency assist failed",
          variant: "destructive",
        });
      } finally {
        activeRequestRef.current = false;
        setChatLoading(false);
      }
    };

    return () => {
      socket.close();
    };
  }, [handleAssistResponse, toast]);

  const sendAssist = useCallback(
    async (message: string) => {
      if (!message.trim() || activeRequestRef.current) return;
      activeRequestRef.current = true;
      setChatLoading(true);
      setStatus("processing");
      setChat((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text: message }]);

      const payload = {
        user_text: message,
        user_email: localStorage.getItem("user_email") || null,
        location,
        camera_findings: {
          blood,
          wound,
          burn,
          observations: cameraResult?.observations || [],
          possible_conditions: cameraResult?.possible_conditions || [],
          severity_level: cameraResult?.severity_level || "low",
          immediate_actions: cameraResult?.immediate_actions || [],
          emergency_warning: cameraResult?.emergency_warning || "",
        },
        emotion_label: emotionLabel || null,
        loved_ones_emails: emailsInput
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        auto_notify_loved_ones: autoNotify,
      };

      try {
        const socket = emergencySocketRef.current;
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(payload));
          return;
        }

        const res = await fetch(`${API_BASE}/rescue/emergency/session/${ALWAYS_ON_SESSION_ID}/assist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Emergency assist failed");
        const data: AssistResponse = await res.json();
        handleAssistResponse(data);
      } catch (error: any) {
        setStatus("ready");
        toast({ title: "Assist failed", description: error.message, variant: "destructive" });
      } finally {
        if (emergencySocketRef.current?.readyState !== WebSocket.OPEN) {
          activeRequestRef.current = false;
          setChatLoading(false);
        }
      }
    },
    [location, blood, wound, burn, cameraResult, emotionLabel, emailsInput, autoNotify, handleAssistResponse, toast]
  );

  const openTutorial = useCallback(async () => {
    const fallbackTutorial = latestAssist?.tutorial_videos?.[0] || null;
    setTutorialLoading(true);
    try {
      const res = await fetch(`${API_BASE}/rescue/emergency/tutorial-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emergency_type: latestAssist?.emergency_type || "general",
          context_text: tutorialContextText,
          limit: 1,
        }),
      });
      if (!res.ok) throw new Error("Unable to fetch tutorial video");
      const data: { tutorial_videos?: TutorialVideo[] } = await res.json();
      const tutorial = data.tutorial_videos?.[0] || fallbackTutorial;
      if (!tutorial) throw new Error("No tutorial video found for this emergency");
      setSelectedTutorial(tutorial);
      setTutorialOpen(true);
    } catch (error: any) {
      if (fallbackTutorial) {
        setSelectedTutorial(fallbackTutorial);
        setTutorialOpen(true);
      } else {
        toast({
          title: "Tutorial unavailable",
          description: error?.message || "No matching YouTube tutorial was found.",
          variant: "destructive",
        });
      }
    } finally {
      setTutorialLoading(false);
    }
  }, [latestAssist, toast, tutorialContextText]);

  const handleConversationMessage = useCallback(
    async (message: string) => {
      const cleanMessage = message.trim();
      if (!cleanMessage) return;

      if (tutorialOfferPending && isAffirmativeTutorialReply(cleanMessage)) {
        setTutorialOfferPending(false);
        setChat((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text: cleanMessage }]);
        setStatus("processing");
        await openTutorial();
        setStatus("ready");
        return;
      }

      if (tutorialOfferPending && isNegativeTutorialReply(cleanMessage)) {
        setTutorialOfferPending(false);
        setChat((prev) => [
          ...prev,
          { id: `u-${Date.now()}`, role: "user", text: cleanMessage },
          { id: `t-no-${Date.now()}`, role: "ai", text: "Okay. I will continue with emergency guidance." },
        ]);
        if (handsFree) {
          speakText("Okay. I will continue with emergency guidance.");
        }
        return;
      }

      await sendAssist(cleanMessage);
    },
    [handsFree, openTutorial, sendAssist, speakText, tutorialOfferPending]
  );

  const startListening = useCallback(() => {
    if (listening || speaking || activeRequestRef.current || voicePaused) return;
    if (!handsFree) {
      toast({ title: "Hands-free is OFF", description: "Turn it ON to use voice conversation." });
      return;
    }
    if (!voiceSupported) {
      toast({ title: "Voice not supported", description: "Use Chrome/Edge for speech recognition.", variant: "destructive" });
      return;
    }

    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setStatus("listening");
      setLiveTranscript("");
    };
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      setLiveTranscript(transcript.trim());
      const latest = event.results[event.results.length - 1];
      if (latest?.isFinal && transcript.trim()) {
      setListening(false);
      recognitionRef.current?.stop();
      setStatus("processing");
      void handleConversationMessage(transcript.trim());
    }
    };
    recognition.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
      if (!activeRequestRef.current) setStatus("ready");
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      if (!activeRequestRef.current && status !== "critical") setStatus("ready");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [handsFree, listening, speaking, voicePaused, voiceSupported, handleConversationMessage, status, toast]);

  const stopListening = useCallback(() => {
    setVoicePaused(true);
    recognitionRef.current?.stop();
    setListening(false);
    if (!activeRequestRef.current) setStatus("ready");
  }, []);

  const resumeListening = useCallback(() => {
    setVoicePaused(false);
    setLiveTranscript("");
  }, []);

  useEffect(() => {
    if (voiceLoopTimeoutRef.current) {
      clearTimeout(voiceLoopTimeoutRef.current);
      voiceLoopTimeoutRef.current = null;
    }

    if (
      handsFree &&
      voiceSupported &&
      !voicePaused &&
      !listening &&
      !speaking &&
      !chatLoading &&
      !tutorialOpen &&
      !activeRequestRef.current
    ) {
      voiceLoopTimeoutRef.current = setTimeout(() => {
        startListening();
      }, 450);
    }

    return () => {
      if (voiceLoopTimeoutRef.current) {
        clearTimeout(voiceLoopTimeoutRef.current);
        voiceLoopTimeoutRef.current = null;
      }
    };
  }, [chatLoading, handsFree, listening, speaking, startListening, tutorialOpen, voicePaused, voiceSupported]);

  const getCurrentLocation = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setLocation((prev) => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        }));
        toast({ title: "Location captured" });
      },
      () => toast({ title: "Location access denied", variant: "destructive" })
    );
  }, [toast]);

  const sendManualEmergencyAlert = useCallback(async () => {
    setManualAlertLoading(true);
    try {
      const recipients = emailsInput
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      const res = await fetch(`${API_BASE}/rescue/emergency/send-location-alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_text: "Manual Emergency Alert",
          user_email: localStorage.getItem("user_email") || null,
          location,
          emotion_label: emotionLabel || null,
          loved_ones_emails: recipients,
        }),
      });

      const data: {
        status?: string;
        reason?: string;
        notify_result?: AssistResponse["notify_result"];
      } = await res.json();

      if (!res.ok) throw new Error(data?.reason || "Failed to send alert");

      const result = data.notify_result || {
        sent: false,
        status: data.status || "unknown",
        reason: data.reason || "No notification status returned",
      };
      setNotifyResult(result);

      toast({
        title: result.sent ? "Emergency Alert Sent" : "Emergency Alert Not Sent",
        description: result.reason || "Location, coordinates, and emotion label processed.",
        variant: result.sent ? "default" : "destructive",
      });
    } catch (error: any) {
      setNotifyResult({
        sent: false,
        status: "failed",
        reason: error?.message || "Failed to send alert",
      });
      toast({
        title: "Alert failed",
        description: error?.message || "Failed to send alert",
        variant: "destructive",
      });
    } finally {
      setManualAlertLoading(false);
    }
  }, [emailsInput, emotionLabel, location, toast]);

  const pushCameraContext = useCallback(
    async (analysis: CameraFrameResult) => {
      try {
        await fetch(`${API_BASE}/rescue/emergency/camera-context`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: ALWAYS_ON_SESSION_ID,
            analysis,
          }),
        });
      } catch {
        // Non-blocking update; ignore camera context push failures.
      }
    },
    []
  );

  const analyzeCamera = useCallback(
    async (file: File) => {
      setMediaLoading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`${API_BASE}/rescue/emergency/camera-frame`, { method: "POST", body: fd });
        if (!res.ok) throw new Error("Camera analysis failed");
        const data: CameraFrameResult = await res.json();
        setCameraResult(data);
        await pushCameraContext(data);
        if (data.severity_level === "high") setStatus("critical");
      } catch (error: any) {
        toast({ title: "Camera analysis failed", description: error.message, variant: "destructive" });
      } finally {
        setMediaLoading(false);
      }
    },
    [pushCameraContext, toast]
  );

  const analyzeVideo = useCallback(
    async (file: File) => {
      setMediaLoading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`${API_BASE}/rescue/video`, { method: "POST", body: fd });
        if (!res.ok) throw new Error("Video analysis failed");
        const data: VideoResult = await res.json();
        setVideoResult(data);
      } catch (error: any) {
        toast({ title: "Video analysis failed", description: error.message, variant: "destructive" });
      } finally {
        setMediaLoading(false);
      }
    },
    [toast]
  );

  const analyzeCameraSafely = useCallback(
    async (file: File) => {
      if (visionBusyRef.current) return;
      visionBusyRef.current = true;
      try {
        await analyzeCamera(file);
      } finally {
        visionBusyRef.current = false;
      }
    },
    [analyzeCamera]
  );

  const analyzeVideoSafely = useCallback(
    async (file: File) => {
      if (visionBusyRef.current) return;
      visionBusyRef.current = true;
      try {
        await analyzeVideo(file);
      } finally {
        visionBusyRef.current = false;
      }
    },
    [analyzeVideo]
  );

  const captureAndSendImage = useCallback(async () => {
    const video = videoPreviewRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) return;
    const file = new File([blob], `camera-frame-${Date.now()}.jpg`, { type: "image/jpeg" });
    await analyzeCameraSafely(file);
  }, [analyzeCameraSafely]);

  const captureAndSendVideo = useCallback(async () => {
    const stream = mediaStreamRef.current;
    if (!stream) return;

    if (typeof MediaRecorder === "undefined") return;
    const mimeType = MP4_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType) {
      if (!mp4WarnedRef.current) {
        mp4WarnedRef.current = true;
        toast({
          title: "MP4 capture unavailable",
          description: "This browser cannot record MP4 from webcam. Automatic video uploads are disabled.",
          variant: "destructive",
        });
      }
      return;
    }

    const clipBlob = await new Promise<Blob | null>((resolve) => {
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => resolve(null);
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      recorder.start();
      setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, 5000);
    });

    if (!clipBlob || clipBlob.size === 0) return;
    const file = new File([clipBlob], `camera-clip-${Date.now()}.mp4`, { type: mimeType });
    await analyzeVideoSafely(file);
  }, [analyzeVideoSafely, toast]);

  const stopWebcamStream = useCallback(() => {
    clearVisionIntervals();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    setCameraStreaming(false);
  }, [clearVisionIntervals]);

  const startWebcamStream = useCallback(async () => {
    try {
      stopWebcamStream();
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      mediaStreamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        await videoPreviewRef.current.play();
      }
      setCameraStreaming(true);
      imageIntervalRef.current = setInterval(() => {
        void captureAndSendImage();
      }, 30000);
      videoIntervalRef.current = setInterval(() => {
        void captureAndSendVideo();
      }, 60000);
    } catch (error: any) {
      setCameraStreaming(false);
      toast({
        title: "Webcam unavailable",
        description: error?.message || "Unable to start webcam stream.",
        variant: "destructive",
      });
    }
  }, [captureAndSendImage, captureAndSendVideo, stopWebcamStream, toast]);

  useEffect(() => {
    void startWebcamStream();
    return () => {
      stopWebcamStream();
    };
  }, [startWebcamStream, stopWebcamStream]);

  useEffect(() => {
    if (!handsFree) {
      if (voiceLoopTimeoutRef.current) {
        clearTimeout(voiceLoopTimeoutRef.current);
        voiceLoopTimeoutRef.current = null;
      }
      recognitionRef.current?.stop();
      setListening(false);
      setVoicePaused(false);
      setLiveTranscript("");
      window.speechSynthesis.cancel();
      setSpeaking(false);
      if (!activeRequestRef.current && status !== "critical") {
        setStatus("ready");
      }
    }
  }, [handsFree, status]);

  return (
    <AppLayout>
      <div className="relative space-y-6 pb-20">
        <div className="absolute -top-10 right-10 h-60 w-60 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute top-48 left-0 h-56 w-56 rounded-full bg-emergency-red/10 blur-3xl pointer-events-none" />

        <section className="card-emergency relative overflow-hidden">
          <div className="absolute right-0 top-0 h-32 w-32 bg-emergency-red/10 blur-2xl" />
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center">
                <div className="absolute h-16 w-16 rounded-2xl border border-primary/40 animate-pulse" />
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">AetherDoc Emergency Assist</h1>
                <p className="text-muted-foreground">Two-way voice + vision powered emergency first-aid guidance</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-lg border px-3 py-1 text-sm font-medium ${STATUS_CLASSES[status]}`}>
                {status.toUpperCase()}
              </span>
              <span className="rounded-lg border border-accent/40 bg-accent/20 px-3 py-1 text-sm font-medium text-accent">
                <Siren className="mr-2 inline h-4 w-4" />
                {socketConnected ? "Live Socket" : "HTTP Backup"}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
            <p><span className="text-foreground font-semibold">Avatar:</span> {avatarSymbol}</p>
            <p><span className="text-foreground font-semibold">Session:</span> {sessionId}</p>
            <p><span className="text-foreground font-semibold">Risk:</span> {riskText.toUpperCase()}</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card-medical min-h-[540px]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Live Webcam Stream</h2>
              <span className={`rounded-lg border px-3 py-1 text-xs font-medium ${cameraStreaming ? "border-accent/40 bg-accent/20 text-accent" : "border-warning-amber/40 bg-warning-amber/20 text-warning-amber"}`}>
                {cameraStreaming ? "Streaming" : "Offline"}
              </span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-black/80">
              <video ref={videoPreviewRef} autoPlay muted playsInline className="h-[430px] w-full object-cover" />
            </div>
            <canvas ref={captureCanvasRef} className="hidden" />
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn-medical" onClick={() => void startWebcamStream()}>
                <Video className="h-4 w-4" /> Restart Camera
              </button>
              <p className="text-sm text-muted-foreground">Auto vision upload: image every 30s, 5-second MP4 clip every 60s.</p>
            </div>
          </div>

            <div className="card-medical min-h-[540px]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Live Conversation</h2>
              <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
                <button
                  type="button"
                  onClick={openTutorial}
                  disabled={tutorialLoading}
                  className="rounded-full px-3 py-1 border border-primary/40 bg-primary/15 text-primary hover:bg-primary/25 transition-colors disabled:opacity-60 flex items-center gap-1"
                >
                  {tutorialLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                  Video Tutorial
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Hands-free</span>
                  <button
                    type="button"
                    onClick={() => {
                      setVoicePaused(false);
                      setHandsFree((v) => !v);
                    }}
                    className={`rounded-full px-3 py-1 border ${handsFree ? "border-accent/40 bg-accent/20 text-accent" : "border-border text-muted-foreground"}`}
                  >
                    {handsFree ? "ON" : "OFF"}
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-4 rounded-xl border border-border/70 bg-secondary/40 p-4">
              {handsFree ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={listening ? stopListening : resumeListening}
                    disabled={chatLoading}
                    className={listening ? "btn-emergency" : "btn-medical"}
                  >
                    {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {listening ? "Pause Listening" : voicePaused ? "Resume Listening" : "Listening Soon"}
                  </button>
                  <span className="text-sm text-muted-foreground">
                    {speaking
                      ? "AI is speaking..."
                      : listening
                      ? "Listening..."
                      : voicePaused
                      ? "Voice loop paused"
                      : liveTranscript
                      ? `You said: ${liveTranscript}`
                      : "Hands-free voice loop is active"}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Hands-free is OFF. Conversation is text-based only.
                </span>
              )}
            </div>

            {handsFree ? (
              <div className="flex flex-col items-center justify-center h-[330px] space-y-4">
                <img
                  src="/avatar/LCPT.gif"
                  alt="AI Avatar"
                  className={`h-48 w-48 object-contain transition-all duration-300 ${
                    speaking
                      ? "scale-110 drop-shadow-[0_0_25px_rgba(0,255,255,0.7)]"
                      : "opacity-90"
                  }`}
                />

                <div className="text-sm text-muted-foreground text-center">
                  {speaking
                    ? "AI is speaking..."
                    : listening
                    ? "Listening to you..."
                    : voicePaused
                    ? "Voice loop paused"
                    : "Speak naturally. I will listen after each response."}
                </div>

                {liveTranscript && (
                  <div className="text-xs text-foreground/80 max-w-sm text-center">
                    You said: {liveTranscript}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[330px] space-y-3 overflow-y-auto pr-1">
                {chat.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                    Describe the emergency in text. Turn Hands-free ON for STT and TTS conversation.
                  </div>
                )}
                {chat.map((item) => (
                  <div key={item.id} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        item.role === "user"
                          ? "bg-primary/20 border border-primary/30"
                          : "bg-secondary border border-border"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!handsFree && (
              <form
                className="mt-4 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleConversationMessage(chatInput);
                  setChatInput("");
                }}
              >
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="input-medical"
                  placeholder="Type emergency details..."
                  disabled={chatLoading}
                />
                <button type="submit" className="btn-medical" disabled={chatLoading}>
                  {chatLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card-medical">
            <h2 className="mb-4 text-lg font-semibold">Vision Assist</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-medical" onClick={() => void captureAndSendImage()} disabled={!cameraStreaming}>
                <Camera className="h-4 w-4" /> Send Frame Now
              </button>
              <button type="button" className="btn-medical" onClick={() => void captureAndSendVideo()} disabled={!cameraStreaming}>
                <Video className="h-4 w-4" /> Send 5s Video Now
              </button>
            </div>
            {mediaLoading && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
              </div>
            )}
            {cameraResult && (
              <div className="mt-4 rounded-lg border border-border p-3 text-sm">
                <p className="font-semibold flex items-center gap-2"><Camera className="h-4 w-4" /> Camera Result</p>
                <p className="text-muted-foreground">Severity: {cameraResult.severity_level || "-"}</p>
                <p className="text-muted-foreground">Observations: {(cameraResult.observations || []).join(", ") || "-"}</p>
                <p className="text-muted-foreground">Possible conditions: {(cameraResult.possible_conditions || []).join(", ") || "-"}</p>
                <p className="text-muted-foreground">Immediate actions: {(cameraResult.immediate_actions || []).join(" | ") || "-"}</p>
                {cameraResult.emergency_warning ? (
                  <p className="text-warning-amber">Warning: {cameraResult.emergency_warning}</p>
                ) : null}
              </div>
            )}
            {videoResult && (
              <div className="mt-3 rounded-lg border border-border p-3 text-sm">
                <p className="font-semibold flex items-center gap-2"><Video className="h-4 w-4" /> Video Result</p>
                <p className="text-muted-foreground">Emotion: {videoResult.emotion_label || "n/a"}</p>
                <p className="text-muted-foreground">Audio present: {videoResult.audio_present ? "yes" : "no"}</p>
                <p className="text-muted-foreground">Detections: {videoResult.blood ? "blood " : ""}{videoResult.wound ? "wound " : ""}{videoResult.burn ? "burn" : ""}</p>
              </div>
            )}
          </div>

          <div className="card-medical">
            <h2 className="text-lg font-semibold mb-4">Emergency Context</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="input-medical"
                type="number"
                step="0.000001"
                value={location.latitude}
                onChange={(e) => setLocation((p) => ({ ...p, latitude: Number(e.target.value) }))}
                placeholder="Latitude"
              />
              <input
                className="input-medical"
                type="number"
                step="0.000001"
                value={location.longitude}
                onChange={(e) => setLocation((p) => ({ ...p, longitude: Number(e.target.value) }))}
                placeholder="Longitude"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-medical" onClick={getCurrentLocation}>
                <MapPin className="h-4 w-4" /> Use Current Coordinates
              </button>
              <button
                type="button"
                className="btn-emergency"
                onClick={() => void sendManualEmergencyAlert()}
                disabled={manualAlertLoading}
              >
                {manualAlertLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                Send Emergency Alert
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input className="input-medical" value={emotionLabel} onChange={(e) => setEmotionLabel(e.target.value)} placeholder="Emotion label (optional)" />
              <input className="input-medical" value={emailsInput} onChange={(e) => setEmailsInput(e.target.value)} placeholder="Loved ones emails (comma separated)" />
            </div>

            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={blood} onChange={(e) => setBlood(e.target.checked)} /> Blood</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={wound} onChange={(e) => setWound(e.target.checked)} /> Wound</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={burn} onChange={(e) => setBurn(e.target.checked)} /> Burn</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={autoNotify} onChange={(e) => setAutoNotify(e.target.checked)} /> Auto notify in severe cases</label>
            </div>

            <div className="mt-5 rounded-lg border border-border p-3">
              <h3 className="mb-2 text-sm font-semibold">Loved Ones Notification</h3>
              {!notifyResult ? (
                <p className="text-sm text-muted-foreground">No notification status yet.</p>
              ) : (
                <div className="text-sm space-y-1">
                  <p>
                    Status:{" "}
                    <span className={notifyResult.sent ? "text-accent font-semibold" : "text-warning-amber font-semibold"}>
                      {notifyResult.status || (notifyResult.sent ? "Sent" : "Not Sent")}
                    </span>
                  </p>
                  {notifyResult.recipients?.length ? <p>Recipients: {notifyResult.recipients.join(", ")}</p> : null}
                  {notifyResult.reason ? <p className="text-muted-foreground">Reason: {notifyResult.reason}</p> : null}
                </div>
              )}
            </div>
          </div>
        </section>

        <footer className="rounded-xl border border-border bg-secondary/50 p-4 text-center">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2 flex-wrap">
            <ShieldAlert className="w-4 h-4 text-warning-amber" />
            <span>
              <strong className="text-foreground">Important:</strong> AI guidance is supportive first aid assistance. In severe emergencies, call local emergency services immediately.
            </span>
          </p>
          {!voiceSupported && (
            <p className="mt-2 text-xs text-warning-amber flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Browser speech recognition is unavailable. Use Chrome or Edge for two-way voice.
            </p>
          )}
        </footer>

        {tutorialOpen && selectedTutorial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
              <div className="flex items-center justify-between gap-3 border-b border-border p-4">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-foreground">{selectedTutorial.title}</h3>
                  <p className="text-sm text-muted-foreground">{selectedTutorial.channel || "YouTube tutorial"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTutorialOpen(false);
                    setSelectedTutorial(null);
                  }}
                  className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"
                  aria-label="Close video tutorial"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {tutorialEmbedUrl ? (
                <iframe
                  className="aspect-video w-full bg-black"
                  src={tutorialEmbedUrl}
                  title={selectedTutorial.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="p-6 text-sm text-muted-foreground">
                  This tutorial cannot be embedded. Open it on YouTube:{" "}
                  <a className="text-primary underline" href={selectedTutorial.url} target="_blank" rel="noreferrer">
                    {selectedTutorial.url}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
