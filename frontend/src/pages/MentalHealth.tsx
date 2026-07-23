import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import * as faceapi from "face-api.js";
import {
  Heart,
  Send,
  Sparkles,
  CloudRain,
  Sun,
  Moon,
  Leaf,
  Brain,
  User,
  Mic,
  MicOff,
} from "lucide-react";

/* ---------------- EMOTION MAP ---------------- */

const emotionMap: Record<string, string> = {
  happy: "happy",
  sad: "sad",
  angry: "angry",
  fearful: "anxious",
  surprised: "anxious",
  neutral: "neutral",
  disgusted: "stressed",
};

/* ---------------- STATIC DATA ---------------- */

const moodOptions = [
  { id: "anxious", label: "Anxious", icon: CloudRain },
  { id: "stressed", label: "Stressed", icon: Brain },
  { id: "sad", label: "Sad", icon: Moon },
  { id: "calm", label: "Calm", icon: Leaf },
  { id: "happy", label: "Happy", icon: Sun },
];
const USER_ID = "6989956ab06df3058f459db3";
const HANDSFREE_AVATAR_GIF = "/avatar/LCPT.gif";
const API_BASE = import.meta.env.VITE_RESCUE_API_URL || "http://localhost:8000";
const WS_BASE = API_BASE.replace(/^http/, "ws");

type SpeechRecognitionCtor = new () => SpeechRecognition;
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}


const supportResources = [
  { title: "Breathing Exercise", duration: "5 min", type: "Exercise" },
  { title: "Sleep Meditation", duration: "15 min", type: "Audio" },
  { title: "Mind Relief Article", duration: "Read", type: "Article" }, // ADD THIS
  { title: " satisfing games", duration: "", type: "mini games" },
];

const sampleMessages = [
  {
    id: 1,
    role: "assistant",
    content:
      "Hello, I'm here to listen and support you. This is a safe space where you can share whatever is on your mind. How are you feeling right now?",
  },
  {
    id: 2,
    role: "user",
    content:
      "I've been feeling really overwhelmed with work lately. Can't seem to relax.",
  },
];

const BREATHING_PHASES = [
  { key: "inhale", label: "Inhale", duration: 4, instruction: "Press and hold" },
  { key: "hold", label: "Hold", duration: 3, instruction: "Keep holding" },
  { key: "exhale", label: "Exhale", duration: 5, instruction: "Release and relax" },
] as const;
const TOTAL_BREATHING_ROUNDS = 5;
const SLEEP_MEDITATION_TRACKS = [
  {
    id: "adrift-stars",
    title: "Adrift Among Infinite Stars",
    src: "/sleep_meditation/sb_adriftamonginfinitestars(chosic.com).mp3",
  },
];

function BreathingExercise({ onClose }: { onClose: () => void }) {
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(1);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(BREATHING_PHASES[0].duration);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const currentPhase = BREATHING_PHASES[phaseIndex];
  const totalSteps = TOTAL_BREATHING_ROUNDS * BREATHING_PHASES.length;
  const completedSteps = (round - 1) * BREATHING_PHASES.length + phaseIndex;
  const progress = (completedSteps / totalSteps) * 100;

  useEffect(() => {
    if (!started || gameOver) return;

    const timer = setInterval(() => {
      const shouldPress = currentPhase.key !== "exhale";
      const correctAction = shouldPress ? isPressing : !isPressing;

      if (correctAction) {
        setScore((prev) => prev + 10);
      } else {
        setMistakes((prev) => prev + 1);
      }

      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;

        const isLastPhase = phaseIndex === BREATHING_PHASES.length - 1;
        if (!isLastPhase) {
          const next = phaseIndex + 1;
          setPhaseIndex(next);
          return BREATHING_PHASES[next].duration;
        }

        if (round >= TOTAL_BREATHING_ROUNDS) {
          setGameOver(true);
          return 0;
        }

        setRound((prevRound) => prevRound + 1);
        setPhaseIndex(0);
        return BREATHING_PHASES[0].duration;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, gameOver, currentPhase.key, isPressing, phaseIndex, round]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      setIsPressing(true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      setIsPressing(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const resetGame = () => {
    setStarted(true);
    setRound(1);
    setPhaseIndex(0);
    setSecondsLeft(BREATHING_PHASES[0].duration);
    setScore(0);
    setMistakes(0);
    setIsPressing(false);
    setGameOver(false);
  };

  const scale =
    currentPhase.key === "inhale"
      ? "scale-125"
      : currentPhase.key === "exhale"
      ? "scale-75"
      : "scale-100";

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center px-4">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-mental-teal text-2xl"
      >
        ✕
      </button>

      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-background/60 p-6">
        <h2 className="text-2xl font-semibold text-white text-center">
          Breathing Game
        </h2>
        <p className="text-sm text-muted-foreground text-center mt-1">
          Hold <span className="text-white font-medium">Space</span> or press the orb during inhale/hold, then release on exhale.
        </p>

        {!started && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Complete {TOTAL_BREATHING_ROUNDS} rounds with calm and steady timing.
            </p>
            <button onClick={resetGame} className="px-6 py-2 rounded-xl bg-mental-teal text-white font-medium hover:opacity-90 transition">
              Start Game
            </button>
          </div>
        )}

        {started && (
          <>
            <div className="mt-5 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-mental-teal transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Round {round}/{TOTAL_BREATHING_ROUNDS}</span>
              <span>Score: {score}</span>
              <span>Mistakes: {mistakes}</span>
            </div>

            {!gameOver ? (
              <>
                <p className="text-center text-mental-teal font-semibold mt-5">
                  {currentPhase.label} • {secondsLeft}s
                </p>
                <p className="text-center text-xs text-muted-foreground mt-1">
                  {currentPhase.instruction}
                </p>

                <div className="relative w-64 h-64 mx-auto mt-6 flex items-center justify-center">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className={`absolute w-48 h-48 rounded-full bg-mental-teal/30 transition-transform duration-1000 ease-in-out ${scale}`}
                      style={{ transform: `rotate(${i * 60}deg)` }}
                    />
                  ))}

                  <button
                    type="button"
                    onMouseDown={() => setIsPressing(true)}
                    onMouseUp={() => setIsPressing(false)}
                    onMouseLeave={() => setIsPressing(false)}
                    onTouchStart={() => setIsPressing(true)}
                    onTouchEnd={() => setIsPressing(false)}
                    className={`absolute w-36 h-36 rounded-full bg-mental-teal transition-transform duration-1000 ease-in-out ${scale} text-white text-sm font-medium`}
                  >
                    {isPressing ? "Holding..." : "Press"}
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-8 text-center">
                <p className="text-white text-lg font-semibold">Session complete</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Final score: <span className="text-white">{score}</span> with {mistakes} mistakes.
                </p>
                <button
                  onClick={resetGame}
                  className="mt-5 px-6 py-2 rounded-xl bg-mental-teal text-white font-medium hover:opacity-90 transition"
                >
                  Play Again
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SleepMeditationPopup({ onClose }: { onClose: () => void }) {
  const [selectedTrack, setSelectedTrack] = useState(SLEEP_MEDITATION_TRACKS[0].src);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center px-4">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-mental-teal text-2xl"
      >
        x
      </button>

      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-background/60 p-6">
        <h2 className="text-2xl font-semibold text-white text-center">
          Sleep Meditation
        </h2>
        <p className="text-sm text-muted-foreground text-center mt-1">
          Select an audio and play it to relax.
        </p>

        <div className="mt-6 space-y-3">
          {SLEEP_MEDITATION_TRACKS.map((track) => (
            <button
              key={track.id}
              onClick={() => setSelectedTrack(track.src)}
              className={`w-full p-3 rounded-xl text-left border transition ${
                selectedTrack === track.src
                  ? "border-mental-teal bg-mental-teal/20 text-white"
                  : "border-white/10 bg-secondary text-foreground"
              }`}
            >
              {track.title}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <audio key={selectedTrack} controls autoPlay className="w-full">
            <source src={selectedTrack} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      </div>
    </div>
  );
}

function ArticlePopup({ onClose }: { onClose: () => void }) {
  const [content, setContent] = useState<string>("Loading article...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await fetch("/sleep_meditation/relief.txt");
        const text = await res.text();
        setContent(text);
      } catch (err) {
        setContent("Failed to load article.");
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center px-4">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-mental-teal text-2xl"
      >
        ✕
      </button>

      <div className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 bg-background/90 p-6 shadow-2xl">
        <h2 className="text-2xl font-semibold text-white mb-4 text-center">
          Mind Relief Article
        </h2>

        <div className="overflow-y-auto max-h-[65vh] pr-2 custom-scrollbar">
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">
              {content}
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-mental-teal text-white font-medium hover:opacity-90 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

type MiniGameId = "dice" | "gamble" | "space" | "click" | "eden";

function OddlySatisfyingGamesPopup({ onClose }: { onClose: () => void }) {
  const [activeGame, setActiveGame] = useState<MiniGameId>("dice");
  const [diceValue, setDiceValue] = useState(1);
  const [diceRolling, setDiceRolling] = useState(false);
  const [gambleResult, setGambleResult] = useState("Pick a crystal to reveal calm points.");
  const [gamblePoints, setGamblePoints] = useState(0);
  const [spaceScore, setSpaceScore] = useState(0);
  const [questProgress, setQuestProgress] = useState(0);
  const [edenStep, setEdenStep] = useState(1);

  const [stars, setStars] = useState(
    Array.from({ length: 12 }).map((_, idx) => ({
      id: idx + 1,
      x: Math.floor(Math.random() * 85) + 5,
      y: Math.floor(Math.random() * 70) + 10,
    }))
  );

  const gameTabs: { id: MiniGameId; label: string }[] = [
    { id: "dice", label: "A) Dice with Death" },
    { id: "gamble", label: "D) Mini gamble" },
    { id: "space", label: "K) Space Rescue" },
    { id: "click", label: "L) One click rpg" },
    { id: "eden", label: "Road to Eden" },
  ];

  const rollDice = () => {
    setDiceRolling(true);
    const finalValue = Math.floor(Math.random() * 6) + 1;
    let ticks = 0;
    const timer = setInterval(() => {
      ticks += 1;
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      if (ticks >= 8) {
        clearInterval(timer);
        setDiceValue(finalValue);
        setDiceRolling(false);
      }
    }, 70);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center px-4">
      <button onClick={onClose} className="absolute top-6 right-6 text-mental-teal text-2xl font-bold">
        x
      </button>

      <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl border border-mental-teal/20 bg-gradient-to-br from-background via-background to-mental-teal/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.5)]">
        <h2 className="text-3xl font-bold text-white mb-2 text-center">Oddly Satisfying Arcade</h2>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Relaxing web mini versions inspired by games from your uploaded Python ZIP.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-5">
          {gameTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveGame(tab.id)}
              className={`p-3 rounded-xl text-xs border transition-all ${
                activeGame === tab.id
                  ? "border-mental-teal bg-mental-teal/25 text-white shadow-[0_0_20px_rgba(45,212,191,0.25)]"
                  : "border-white/10 bg-secondary/70 text-foreground hover:border-mental-teal/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 min-h-[400px]">
          {activeGame === "dice" && (
            <div className="flex flex-col items-center justify-center h-full gap-5">
              <p className="text-sm text-muted-foreground">Roll for calm. Higher roll, deeper breath.</p>
              <div
                className={`w-32 h-32 rounded-3xl bg-gradient-to-br from-mental-teal/40 to-mental-teal/10 border border-mental-teal/50 flex items-center justify-center text-6xl font-bold text-mental-teal shadow-[0_0_35px_rgba(45,212,191,0.25)] ${
                  diceRolling ? "animate-pulse" : ""
                }`}
              >
                {diceValue}
              </div>
              <button onClick={rollDice} className="px-6 py-2 rounded-xl bg-mental-teal text-white font-semibold hover:opacity-90">
                Roll Dice
              </button>
            </div>
          )}

          {activeGame === "gamble" && (
            <div className="h-full">
              <p className="text-center text-sm text-muted-foreground mb-4">{gambleResult}</p>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      const won = Math.random() > 0.45;
                      const points = won ? 12 : 3;
                      setGamblePoints((p) => p + points);
                      setGambleResult(won ? `Crystal ${n}: Jackpot +${points} calm points` : `Crystal ${n}: Soft miss +${points} points`);
                    }}
                    className="h-32 rounded-2xl border border-mental-teal/30 bg-gradient-to-br from-mental-teal/20 to-background text-3xl hover:scale-[1.03] transition-transform"
                  >
                    ◈
                  </button>
                ))}
              </div>
              <p className="text-center mt-5 text-mental-teal text-lg font-semibold">Calm Points: {gamblePoints}</p>
            </div>
          )}

          {activeGame === "space" && (
            <div className="relative h-[340px] rounded-2xl bg-black/70 overflow-hidden border border-mental-teal/30">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(45,212,191,0.15),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.14),transparent_30%)]" />
              {stars.map((star) => (
                <button
                  key={star.id}
                  onClick={() => {
                    setStars((prev) => prev.filter((s) => s.id !== star.id));
                    setSpaceScore((s) => s + 1);
                  }}
                  className="absolute text-yellow-300 text-2xl hover:scale-125 transition-transform drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]"
                  style={{ left: `${star.x}%`, top: `${star.y}%` }}
                >
                  ✧
                </button>
              ))}
              <div className="absolute bottom-3 left-3 text-sm text-white">Rescued stars: {spaceScore}</div>
              <button
                onClick={() => {
                  setSpaceScore(0);
                  setStars(
                    Array.from({ length: 12 }).map((_, idx) => ({
                      id: idx + 1,
                      x: Math.floor(Math.random() * 85) + 5,
                      y: Math.floor(Math.random() * 70) + 10,
                    }))
                  );
                }}
                className="absolute bottom-3 right-3 text-xs px-3 py-1 rounded-lg bg-mental-teal text-white"
              >
                Reset
              </button>
            </div>
          )}

          {activeGame === "click" && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="text-sm text-muted-foreground">Build your calm streak with rhythmic taps.</p>
              <div className="w-full bg-black/40 rounded-full h-5 overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-mental-teal to-cyan-300 transition-all"
                  style={{ width: `${Math.min((questProgress / 50) * 100, 100)}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">Quest Progress: {questProgress}/50</p>
              <button
                onClick={() => setQuestProgress((v) => Math.min(v + 1, 50))}
                className="px-6 py-3 rounded-xl bg-mental-teal text-white font-semibold hover:opacity-90"
              >
                One Calm Tap
              </button>
              {questProgress >= 50 && <p className="text-mental-teal font-semibold">Quest complete. Mind feels lighter.</p>}
            </div>
          )}

          {activeGame === "eden" && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="text-sm text-muted-foreground">Follow the glowing path in order to reach Eden.</p>
              <div className="flex gap-2 flex-wrap justify-center max-w-xl">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const step = idx + 1;
                  const done = step < edenStep;
                  const next = step === edenStep;
                  return (
                    <button
                      key={step}
                      onClick={() => {
                        if (next) setEdenStep((s) => Math.min(s + 1, 11));
                      }}
                      className={`w-11 h-11 rounded-full border text-sm transition-all ${
                        done
                          ? "bg-mental-teal text-white border-mental-teal shadow-[0_0_16px_rgba(45,212,191,0.45)]"
                          : next
                          ? "bg-mental-teal/20 text-mental-teal border-mental-teal/60 animate-pulse"
                          : "bg-secondary text-muted-foreground border-white/10"
                      }`}
                    >
                      {step}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">{edenStep > 10 ? "Reached Eden. Breathe and smile." : `Step ${edenStep} of 10`}</p>
              <button onClick={() => setEdenStep(1)} className="px-5 py-2 rounded-lg bg-mental-teal text-white text-sm">
                Restart Path
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MentalHealth() {
  const [message, setMessage] = useState("");
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState(sampleMessages);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [showBreathing, setShowBreathing] = useState(false);
  const [showSleepMeditation, setShowSleepMeditation] = useState(false);
  const [showArticle, setShowArticle] = useState(false);
  const [showOddlyGames, setShowOddlyGames] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mentalSocketRef = useRef<WebSocket | null>(null);
  const activeRequestRef = useRef(false);
  const audioReplyRef = useRef<HTMLAudioElement | null>(null);
  const handsFreeRef = useRef(false);
  const [socketConnected, setSocketConnected] = useState(false);



  

  const [detectedEmotion, setDetectedEmotion] = useState<{
    emotion: string;
    confidence: number;
  } | null>(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  /* ---------------- LOAD FACE MODELS ---------------- */

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
    };

    loadModels();
  }, []);

  /* ---------------- EMOTION DETECTION ---------------- */

  useEffect(() => {
    if (!modelsLoaded || !videoRef.current) return;

    const interval = setInterval(async () => {
      if (videoRef.current?.readyState !== 4) return;

      const detection = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        )
        .withFaceExpressions();

      if (!detection) return;

      const expressions = detection.expressions;
      const sorted = Object.entries(expressions).sort((a, b) => b[1] - a[1]);
      const [rawEmotion, confidence] = sorted[0];


      setDetectedEmotion({
        emotion: emotionMap[rawEmotion],
        confidence,
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [modelsLoaded]);

  /* ---------------- STABLE WEBCAM ---------------- */

  useEffect(() => {
    let stream: MediaStream | null = null;
    let retryTimeout: ReturnType<typeof setTimeout>;

    const startCamera = async () => {
      try {
        if (!videoRef.current) {
          retryTimeout = setTimeout(startCamera, 300);
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });

        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      } catch {
        retryTimeout = setTimeout(startCamera, 1000);
      }
    };

    startCamera();

    return () => {
      clearTimeout(retryTimeout);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!messagesEndRef.current) return;
  
    messagesEndRef.current.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [chatMessages]);

  useEffect(() => {
    setVoiceSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => {
      recognitionRef.current?.stop();
      if (audioReplyRef.current) {
        audioReplyRef.current.pause();
        audioReplyRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    handsFreeRef.current = handsFree;
  }, [handsFree]);

  useEffect(() => {
    if (!sessionId) return;

    const socket = new WebSocket(`${WS_BASE}/mental-chat/ws/${sessionId}`);
    mentalSocketRef.current = socket;

    socket.onopen = () => setSocketConnected(true);
    socket.onclose = () => {
      setSocketConnected(false);
      if (mentalSocketRef.current === socket) {
        mentalSocketRef.current = null;
      }
      activeRequestRef.current = false;
    };
    socket.onerror = () => setSocketConnected(false);
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "assistant_response") {
          const data = message.payload || {};
          setChatMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              role: "assistant",
              content: data.reply || "I could not generate a response right now.",
            },
          ]);

          if (handsFreeRef.current && data.tts_audio_base64) {
            playReplyAudio(data.tts_audio_base64);
          }
        } else if (message.type === "error") {
          throw new Error(message.message || "Mental health response failed");
        }
      } catch (err) {
        console.error("Message send failed", err);
      } finally {
        activeRequestRef.current = false;
      }
    };

    return () => {
      socket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);
  
  const playReplyAudio = (audioBase64: string) => {
    if (!audioBase64) return;
    if (audioReplyRef.current) {
      audioReplyRef.current.pause();
    }
    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
    audioReplyRef.current = audio;
    setSpeaking(true);
    audio.onended = () => {
      setSpeaking(false);
      if (handsFree && sessionStarted && !activeRequestRef.current) {
        setTimeout(() => startListening(), 250);
      }
    };
    void audio.play().catch(() => setSpeaking(false));
  };

  const sendMessage = async (overrideText?: string) => {
    const outgoingText = (overrideText ?? message).trim();
    if (!outgoingText || !sessionId || activeRequestRef.current) return;

    activeRequestRef.current = true;

    const userMsg = {
      id: Date.now(),
      role: "user",
      content: outgoingText,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!overrideText) setMessage("");
    setLiveTranscript("");

    try {
      const payload = {
        session_id: sessionId,
        user_message: userMsg.content,
        handsfree: handsFree,
        detected_emotion: detectedEmotion
          ? {
              emotion: detectedEmotion.emotion,
              confidence: detectedEmotion.confidence,
            }
          : null,
      };

      const socket = mentalSocketRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload));
        return;
      }

      const res = await fetch(`${API_BASE}/mental-chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Message request failed");
      const data = await res.json();

      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: data.reply,
        },
      ]);

      if (handsFree && data.tts_audio_base64) {
        playReplyAudio(data.tts_audio_base64);
      }
    } catch (err) {
      console.error("Message send failed", err);
    } finally {
      if (mentalSocketRef.current?.readyState !== WebSocket.OPEN) {
        activeRequestRef.current = false;
      }
    }
  };

  const startListening = () => {
    if (!handsFree || !sessionStarted || !sessionId || !voiceSupported || activeRequestRef.current || speaking) {
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
        void sendMessage(transcript.trim());
      }
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      if (handsFree && !activeRequestRef.current && !speaking) {
        setTimeout(() => startListening(), 300);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
    setLiveTranscript("");
  };

  useEffect(() => {
    if (!handsFree) {
      stopListening();
      if (audioReplyRef.current) {
        audioReplyRef.current.pause();
      }
      setSpeaking(false);
      return;
    }
    if (sessionStarted && voiceSupported) {
      startListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handsFree, sessionStarted, voiceSupported]);
  
  

  /* ---------------- UI ---------------- */

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-mental-teal/20 flex items-center justify-center">
            <Heart className="w-8 h-8 text-mental-teal" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Mental Health Support
            </h1>
            <p className="text-muted-foreground">
              A safe, empathetic space for emotional wellness
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (!voiceSupported) return;
            setHandsFree((v) => !v);
          }}
          className="px-5 py-2 rounded-xl bg-mental-teal/20 text-mental-teal border border-mental-teal/30 font-medium hover:bg-mental-teal/30 transition-colors flex items-center gap-2 disabled:opacity-60"
          disabled={!voiceSupported}
        >
          {handsFree ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          Hands-Free {handsFree ? "ON" : "OFF"}
        </button>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* CHAT */}
          <div className="card-medical relative flex flex-col h-[calc(100vh-16rem)]">
            {/* BLURRED CONTENT */}
            <div
              className={`flex flex-col h-full transition-all ${
                !sessionStarted
                  ? "blur-sm pointer-events-none select-none"
                  : ""
              }`}
            >
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {handsFree && sessionStarted && (
                <div className="rounded-xl border border-mental-teal/30 bg-mental-teal/10 p-3 flex items-center gap-3">
                  <img
                    src={HANDSFREE_AVATAR_GIF}
                    alt="Hands-free avatar"
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="text-sm">
                    <p className="text-mental-teal font-semibold">Hands-free voice mode active</p>
                    <p className="text-muted-foreground">
                      {speaking
                        ? "Assistant speaking..."
                        : listening
                        ? `Listening... ${liveTranscript ? `(${liveTranscript})` : ""}`
                        : "Waiting for your voice..."}
                    </p>
                  </div>
                </div>
              )}
              {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${
                      msg.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        msg.role === "user"
                          ? "bg-primary/20"
                          : "bg-mental-teal/20"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <User className="w-5 h-5 text-primary" />
                      ) : (
                        <Heart className="w-5 h-5 text-mental-teal" />
                      )}
                    </div>
                    <div className="max-w-[70%] p-4 rounded-xl bg-secondary">
                      <p className="text-sm whitespace-pre-line">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}

              <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-border pt-4">
                {!handsFree ? (
                  <div className="flex items-end gap-3">
                    <div className="flex-1 relative">
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Share what's on your mind..."
                        rows={2}
                        className="input-medical resize-none pr-16"
                      />
                      <button
                        onClick={sendMessage}
                        className="absolute right-3 bottom-3 p-3 rounded-xl bg-mental-teal hover:opacity-90 transition"
                      >
                        <Send className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-mental-teal/20 bg-mental-teal/5 px-3 py-2 text-sm text-muted-foreground">
                    Voice-only conversation is enabled. Turn Hands-Free OFF to type messages.
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Everything shared here is private and confidential
                </p>
                <p className="text-xs text-mental-teal mt-1 text-center">
                  {handsFree
                    ? speaking
                      ? "Assistant speaking..."
                      : listening
                        ? `Listening... ${liveTranscript ? `(${liveTranscript})` : ""}`
                        : "Hands-free active"
                    : "Hands-free is off. Type to chat."}
                </p>
              </div>
            </div>

            {/* SESSION OVERLAY */}
            {!sessionStarted && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="bg-background/80 backdrop-blur-md p-6 rounded-2xl text-center border border-border">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Therapy Session Not Started
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start a session to begin a private, supportive conversation.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(
                          `http://localhost:8000/mental-session/start/${USER_ID}`,
                          { method: "POST" }
                        );

                        const data = await res.json();
                        setSessionId(data.session_id);
                        setSessionStarted(true);
                      } catch (err) {
                        console.error("Failed to start therapy session", err);
                      }
                    }}
                    className="px-6 py-2 rounded-xl bg-mental-teal text-white font-medium hover:opacity-90 transition"
                  >
                    Start Therapy Session
                  </button>

                </div>
              </div>
            )}
          </div>

          {/* Quick Relief */}
          <div className="card-medical">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-mental-teal" />
              <h3 className="font-semibold text-foreground">Quick Relief</h3>
            </div>
            <button
              onClick={() => setShowBreathing(true)}
              className="w-full btn-mental mb-2"
            >
              Start Breathing Exercise
            </button>
            <p className="text-xs text-muted-foreground text-center">
              A 2-minute guided breathing to calm your mind
            </p>
          </div>

          {/* Crisis */}
          <div className="p-4 rounded-xl bg-emergency-red/10 border border-emergency-red/20">
            <h3 className="font-semibold text-foreground mb-2">
              Need Immediate Help?
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              If you're in crisis, please reach out to professional support.
            </p>
            <button className="w-full py-2 rounded-lg bg-emergency-red/20 text-emergency-red">
              Crisis Helpline
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-6">
          <div className="card-medical">
            <h3 className="font-semibold text-foreground mb-3">
              Self View (Camera)
            </h3>

            <div className="mb-3 px-3 py-2 rounded-lg bg-mental-teal/10 border border-mental-teal/20">
              <p className="text-sm font-medium text-mental-teal text-center">
                Current Expression:{" "}
                <span className="capitalize">
                  {detectedEmotion ? detectedEmotion.emotion : "Detecting..."}
                </span>
              </p>
              {detectedEmotion && (
                <p className="text-xs text-muted-foreground text-center">
                  Confidence:{" "}
                  {(detectedEmotion.confidence * 100).toFixed(0)}%
                </p>
              )}
            </div>

            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full rounded-xl bg-black aspect-video object-cover"
            />

            <p className="text-xs text-muted-foreground mt-2 text-center">
              Camera is only visible to you
            </p>
          </div>

          <div className="card-medical">
            <h3 className="font-semibold text-foreground mb-4">
              Wellness Resources
            </h3>
            <div className="space-y-3">
              {supportResources.map((resource) => (
                <button
                  key={resource.title}
                  onClick={() => {
                    if (resource.title === "Breathing Exercise") {
                      setShowBreathing(true);
                    }
                    if (resource.title === "Sleep Meditation") {
                      setShowSleepMeditation(true);
                    }
                    if (resource.title === "Mind Relief Article") {
                      setShowArticle(true);
                    }
                    if (resource.title === "odly satisfing games") {
                      setShowOddlyGames(true);
                    }
                  }}
                  className="w-full p-3 rounded-xl bg-secondary text-left"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{resource.title}</span>
                    <span className="text-xs">{resource.duration}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {resource.type}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showBreathing && (
  <BreathingExercise onClose={() => setShowBreathing(false)} />
)}
      {showSleepMeditation && (
  <SleepMeditationPopup onClose={() => setShowSleepMeditation(false)} />
)}
      {showArticle && (
  <ArticlePopup onClose={() => setShowArticle(false)} />
)}
      {showOddlyGames && (
  <OddlySatisfyingGamesPopup onClose={() => setShowOddlyGames(false)} />
)}
    </AppLayout>
  );
}
