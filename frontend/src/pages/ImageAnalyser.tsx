import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  HeartPulse,
  Upload,
  Scan,
  Stethoscope,
  Pill,
  Activity,
  Shield,
  Play,
  Square,
  Volume2,
  FileImage,
  Zap,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Loader2,
} from "lucide-react";

type RiskLevel = "low" | "medium" | "high";

interface Recommendation {
  name: string;
  dosage: string;
  duration: string;
}

interface AnalysisResponse {
  risk_level: RiskLevel;
  clinical_findings: string[];
  simple_summary: string[];
  recommendations: Recommendation[];
  follow_up: string;
  red_flags: string[];
  disclaimer: string;
  audio_base64: string;
  raw_analysis: string;
  service_status?: "live" | "fallback";
  error?: string;
}

const API_BASE = import.meta.env.VITE_RESCUE_API_URL || "http://localhost:8000";

export default function ImageAnalyser() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [errorText, setErrorText] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const pushLine = (text: string) => setTerminalLines((prev) => [...prev, text]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedFile(file);
        setUploadedImage(ev.target?.result as string);
        setAnalysisComplete(false);
        setTerminalLines([]);
        setIsPlaying(false);
        setAnalysis(null);
        setErrorText("");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedFile(file);
        setUploadedImage(ev.target?.result as string);
        setAnalysisComplete(false);
        setTerminalLines([]);
        setIsPlaying(false);
        setAnalysis(null);
        setErrorText("");
      };
      reader.readAsDataURL(file);
    }
  };

  const startAnalysis = async () => {
    if (!uploadedFile) return;

    setIsAnalysing(true);
    setAnalysisComplete(false);
    setTerminalLines([]);
    setErrorText("");

    pushLine("> Initializing diagnostic engine...");
    pushLine("> Preparing image for multimodal analysis...");

    const fd = new FormData();
    fd.append("file", uploadedFile);

    try {
      const res = await fetch(`${API_BASE}/medical/analyze-image`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(`Request failed with ${res.status}`);
      const data: AnalysisResponse = await res.json();

      setAnalysis(data);
      pushLine("> Model inference complete. Parsing structured output...");
      pushLine(`> Gemini service status: ${(data.service_status || "live").toUpperCase()}`);
      pushLine(`> Risk Level: ${(data.risk_level || "medium").toUpperCase()}`);
      (data.clinical_findings || []).slice(0, 3).forEach((f) => pushLine(`> Finding: ${f}`));
      if (data.service_status === "fallback" && data.error) {
        pushLine(`> Service note: ${data.error}`);
      }
      pushLine("> Report generation complete.");

      setAnalysisComplete(true);
    } catch (error: any) {
      const msg = error?.message || "Unable to analyze image.";
      setErrorText(msg);
      pushLine(`> ERROR: ${msg}`);
      setAnalysis(null);
      setAnalysisComplete(false);
    } finally {
      setIsAnalysing(false);
    }
  };

  const resetScan = () => {
    setUploadedImage(null);
    setUploadedFile(null);
    setIsAnalysing(false);
    setAnalysisComplete(false);
    setTerminalLines([]);
    setIsPlaying(false);
    setAnalysis(null);
    setErrorText("");
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  const toggleAudio = () => {
    if (!analysis?.audio_base64) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(`data:audio/mp3;base64,${analysis.audio_base64}`);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }
    audioRef.current.play();
    setIsPlaying(true);
  };

  useEffect(() => {
    if (analysisComplete && autoSpeak && analysis?.audio_base64) {
      toggleAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisComplete, autoSpeak, analysis?.audio_base64]);

  const [waveKey, setWaveKey] = useState(0);
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => setWaveKey((k) => k + 1), 180);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const WaveformVisualizer = ({ active }: { active: boolean }) => (
    <div className="flex items-end gap-[3px] h-10">
      {Array.from({ length: 32 }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full transition-all duration-150"
          style={{
            height: active ? `${Math.random() * 100}%` : `${12 + Math.sin(i * 0.5) * 8}%`,
            background: active ? "hsl(var(--mental-teal))" : "hsl(var(--muted-foreground) / 0.3)",
            transition: active ? "height 0.15s ease" : "height 0.5s ease",
          }}
        />
      ))}
    </div>
  );

  const riskClass =
    analysis?.risk_level === "high"
      ? "bg-red-500/20 text-red-300 border-red-500/30"
      : analysis?.risk_level === "medium"
      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--gradient-mental)" }}>
              <HeartPulse className="w-6 h-6 text-background" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">AI Medical Diagnostic Assistant</h1>
              <p className="text-sm text-muted-foreground">Vision-enabled dynamic image analysis with Gemini + TTS</p>
            </div>
          </div>
          <Badge className={`border px-3 py-1.5 text-sm font-medium gap-2 ${analysis ? riskClass : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"}`}>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            {analysis
              ? `${analysis.service_status === "fallback" ? "Gemini Fallback" : "Gemini Live"} | Risk: ${analysis.risk_level.toUpperCase()}`
              : "Gemini AI Online"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card className="border-border/50 backdrop-blur-xl bg-card/60 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Scan className="w-4 h-4 text-[hsl(var(--mental-teal))]" />
                  Image Upload Zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                {!uploadedImage ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="relative border-2 border-dashed border-[hsl(var(--mental-teal)/0.3)] rounded-xl h-72 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-[hsl(var(--mental-teal)/0.6)] hover:bg-[hsl(var(--mental-teal)/0.03)] transition-all duration-300 group"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--mental-teal)/0.1)] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-7 h-7 text-[hsl(var(--mental-teal))]" />
                    </div>
                    <div className="text-center">
                      <p className="text-foreground font-medium">Drop medical image here</p>
                      <p className="text-sm text-muted-foreground mt-1">X-Ray, MRI, CT Scan, Dermatology Photo</p>
                      <p className="text-xs text-muted-foreground mt-2">PNG, JPG up to 25MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden h-72 bg-black/40">
                    <img src={uploadedImage} alt="Uploaded scan" className="w-full h-full object-contain" />
                    {isAnalysing && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute left-0 right-0 h-0.5 bg-[hsl(var(--mental-teal))] shadow-[0_0_12px_hsl(var(--mental-teal)),0_0_40px_hsl(var(--mental-teal)/0.4)] animate-[scanLine_2.5s_ease-in-out_infinite]" />
                        <div className="absolute inset-0 border-2 border-[hsl(var(--mental-teal)/0.2)] rounded-xl" />
                      </div>
                    )}
                    {analysisComplete && (
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Analysed
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <Button onClick={() => void startAnalysis()} disabled={!uploadedImage || isAnalysing} className="flex-1 font-semibold text-background" style={{ background: "var(--gradient-mental)" }}>
                    {isAnalysing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Analysing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" /> Start Analysis
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={resetScan} className="gap-2">
                    <RefreshCw className="w-4 h-4" /> New Scan
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 backdrop-blur-xl bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[hsl(var(--mental-teal))]" />
                  Live Analysis Terminal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div ref={terminalRef} className="bg-black/50 rounded-lg p-4 h-48 overflow-y-auto font-mono text-sm border border-border/30">
                  {terminalLines.length === 0 && <p className="text-muted-foreground/50">Awaiting image for analysis...</p>}
                  {terminalLines.map((line, i) => (
                    <div key={i} className="flex gap-2 mb-1.5 animate-fade-in">
                      <span className={line.includes("ERROR") ? "text-red-300" : line.includes("Risk Level") ? "text-amber-300" : "text-muted-foreground"}>
                        {line}
                      </span>
                    </div>
                  ))}
                  {isAnalysing && <span className="inline-block w-2 h-4 bg-[hsl(var(--mental-teal))] animate-pulse ml-1" />}
                </div>
                {errorText && <p className="mt-3 text-sm text-red-300">{errorText}</p>}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border/50 backdrop-blur-xl bg-card/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Volume2 className={`w-4 h-4 ${isPlaying ? "text-[hsl(var(--mental-teal))] animate-pulse" : "text-muted-foreground"}`} />
                    Voice Explanation
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Auto-speak</span>
                    <Switch checked={autoSpeak} onCheckedChange={setAutoSpeak} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-black/30 rounded-lg p-4 border border-border/20">
                  <WaveformVisualizer key={waveKey} active={isPlaying} />
                </div>
                <Button onClick={toggleAudio} disabled={!analysisComplete || !analysis?.audio_base64} variant="outline" className="w-full gap-2">
                  {isPlaying ? (
                    <>
                      <Square className="w-4 h-4" /> Stop Playback
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" /> Play Explanation
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/50 backdrop-blur-xl bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-[hsl(var(--mental-teal))]" />
                  Treatment Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!analysisComplete || !analysis ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Complete analysis to view recommendations</p>
                ) : (
                  <>
                    {analysis.recommendations.map((med, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/40 border border-border/30">
                        <div className="w-9 h-9 rounded-lg bg-[hsl(var(--mental-teal)/0.1)] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Pill className="w-4 h-4 text-[hsl(var(--mental-teal))]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{med.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{med.dosage}</p>
                          <Badge variant="secondary" className="mt-1.5 text-xs">{med.duration}</Badge>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 mt-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-300/80">
                        <span className="font-semibold">Medical Disclaimer:</span> {analysis.disclaimer}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50 backdrop-blur-xl bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileImage className="w-4 h-4 text-[hsl(var(--mental-teal))]" />
                  Simple Language Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!analysisComplete || !analysis ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Results will appear here in plain language</p>
                ) : (
                  <ul className="space-y-2.5">
                    {analysis.simple_summary.map((point, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{point}</span>
                      </li>
                    ))}
                    <li className="mt-3 rounded-lg border border-border/40 bg-secondary/30 p-3 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Follow-up:</span> {analysis.follow_up}
                    </li>
                    {analysis.red_flags.length > 0 && (
                      <li className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm">
                        <p className="mb-1 font-semibold text-red-300">Red Flags</p>
                        <p className="text-red-200/90">{analysis.red_flags.join(", ")}</p>
                      </li>
                    )}
                    {analysis.clinical_findings.length > 0 && (
                      <li className="rounded-lg border border-border/40 bg-secondary/20 p-3 text-sm">
                        <p className="mb-1 font-semibold text-foreground">Clinical Findings</p>
                        <p className="text-muted-foreground">{analysis.clinical_findings.join(" | ")}</p>
                      </li>
                    )}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
