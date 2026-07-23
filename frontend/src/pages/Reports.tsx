import { useEffect, useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  TrendingDown,
  TrendingUp,
  Minus,
  Loader2,
  Download,
  Share2,
  X,
  AlertCircle,
  Upload,
  Image,
  FileText,
  FileSearch,
  CheckCircle,
} from "lucide-react";
interface StructuredValue {
  name: string;
  value: string;
  unit: string;
  normal_range: string;
  status: "normal" | "high" | "low";
}
interface ReportAnalysis {
  risk_level: string;
  structured_values: StructuredValue[];
  ai_explanation: string;
}
export default function Reports() {
  const API_BASE = import.meta.env.VITE_RESCUE_API_URL || "http://localhost:8000";
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const email = localStorage.getItem("user_email");
    if (!email) return;
    fetch(`${API_BASE}/users/profile?email=${encodeURIComponent(email)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUserId(data?._id || ""))
      .catch(() => setUserId(""));
  }, [API_BASE]);
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
    setReportData(null);
    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };
  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setReportData(null);
    setError(null);
  };
  const analyzeReport = async () => {
    if (!selectedFile) return;
    if (!userId) {
      setError("Could not identify the current patient profile. Please log in again.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const formData = new FormData();
      formData.append("user_id", userId);
      formData.append("modality", "lab");
      formData.append("file", selectedFile);
      const response = await fetch(`${API_BASE}/report/analyze`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Analysis failed");
      setReportData(data.analysis);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const riskColor = (level: string) => {
    const l = level.toLowerCase();
    if (l === "high" || l === "critical") return "text-emergency-red bg-emergency-red/15 border-emergency-red/30";
    if (l === "moderate" || l === "medium") return "text-warning-amber bg-warning-amber/15 border-warning-amber/30";
    return "text-accent bg-accent/15 border-accent/30";
  };
  return (
    <AppLayout>
      <div className="container mx-auto px-6 py-8">
      {/* Status Messages */}
      {loading && (
        <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <span className="text-foreground font-medium">Analyzing your report...</span>
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-emergency-red/10 border border-emergency-red/20 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-emergency-red" />
          <span className="text-foreground">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="space-y-6">
          <div className="card-medical">
            <h2 className="text-lg font-semibold text-foreground mb-4">Upload Report</h2>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            {!selectedFile ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium mb-2">Drag & drop or click to upload</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Supports: X-ray, CT Scan, MRI, Blood Reports, ECG
                </p>
                <div className="flex justify-center gap-3">
                  <span className="px-3 py-1.5 rounded-lg bg-secondary text-sm text-muted-foreground flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5" /> Image
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-secondary text-sm text-muted-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> PDF
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-secondary/50 p-4 space-y-4">
                {/* File Preview */}
                {previewUrl ? (
                  <div className="relative rounded-lg overflow-hidden bg-background">
                    <img src={previewUrl} alt="Report preview" className="w-full max-h-64 object-contain" />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
                    <FileText className="w-8 h-8 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                )}
                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={analyzeReport}
                    disabled={loading}
                    className="btn-medical flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileSearch className="w-4 h-4" />
                    )}
                    {loading ? "Analyzing..." : "Analyze Report"}
                  </button>
                  <button
                    onClick={clearFile}
                    className="px-4 py-3 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Recent Uploads */}
          <div className="card-medical">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Recent Reports
            </h3>
            <div className="space-y-2">
              {/* future recent items */}
            </div>
          </div>
          </div>
        {/* Analysis Results */}
        <div className="space-y-6">
          {!reportData && !loading && (
            <div className="card-medical flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <FileSearch className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No Report Analyzed</h3>
              <p className="text-sm text-muted-foreground/70 max-w-xs">
                Upload a medical report and click "Analyze" to get AI-powered insights in simple language.
              </p>
            </div>
          )}
          {reportData && (
            <>
              {/* Header + Risk */}
              <div className="card-medical">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Report Analysis</h2>
                  <span className="text-sm text-muted-foreground">
                    {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </span>
                </div>

                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold ${riskColor(reportData.risk_level)}`}>
                  <AlertCircle className="w-4 h-4" />
                  Risk Level: {reportData.risk_level.toUpperCase()}
                </div>
              </div>
              {/* Structured Values */}
              {reportData.structured_values?.length > 0 && (
                <div className="card-medical">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Test Results</h3>
                  <div className="space-y-2">
                    {reportData.structured_values.map((item) => (
                      <div
                        key={item.name}
                        className={`p-3 rounded-lg flex items-center justify-between ${
                          item.status === "high"
                            ? "bg-emergency-red/10 border border-emergency-red/20"
                            : item.status === "low"
                            ? "bg-warning-amber/10 border border-warning-amber/20"
                            : "bg-secondary"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {item.status === "high" ? (
                            <TrendingUp className="w-4 h-4 text-emergency-red" />
                          ) : item.status === "low" ? (
                            <TrendingDown className="w-4 h-4 text-warning-amber" />
                          ) : (
                            <Minus className="w-4 h-4 text-accent" />
                          )}
                          <span className="font-medium text-foreground text-sm">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-foreground">
                            {item.value} <span className="text-muted-foreground">{item.unit}</span>
                          </span>
                          <span className="text-xs text-muted-foreground hidden sm:inline">({item.normal_range})</span>
                          {item.status === "normal" ? (
                            <CheckCircle className="w-4 h-4 text-accent" />
                          ) : (
                            <AlertCircle className={`w-4 h-4 ${item.status === "high" ? "text-emergency-red" : "text-warning-amber"}`} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* AI Explanation */}
              <div className="card-medical">
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileSearch className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">AI Explanation</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {reportData.ai_explanation}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Actions */}
              <div className="flex gap-3">
                <button className="btn-medical flex-1 flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  Download Report
                </button>
                <button className="px-6 py-3 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Share with Doctor
                </button>
              </div>
            </>
          )}
        </div>
        </div> {/* grid */}
    </div>   {/* container */}
  </AppLayout>
  );
}
