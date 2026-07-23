import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Mail, Lock, Eye, EyeOff, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios";


export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
  
    try {
      await axios.post("http://127.0.0.1:8000/auth/login", {
        email,
        password,
      });
  
      // ⭐ STORE EMAIL FOR PROFILE PAGE
      localStorage.setItem("user_email", email);
  
      // SAME BEHAVIOR AS BEFORE
      navigate("/dashboard");
    } catch (error) {
      alert("Invalid email or password");
    }
  };
  

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          <div className="max-w-md text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-8">
              <Activity className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">AetherDoc</h1>
            <p className="text-xl text-muted-foreground mb-8">
              AI-Powered Virtual Healthcare Platform
            </p>
            <div className="space-y-4 text-left">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50">
                <div className="w-10 h-10 rounded-lg bg-emergency-red/20 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-5 h-5 text-emergency-red" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Emergency Guidance</h3>
                  <p className="text-sm text-muted-foreground">Life-saving instructions when you need them</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">AI Doctor Consultation</h3>
                  <p className="text-sm text-muted-foreground">24/7 virtual healthcare consultations</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50">
                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Report Analysis</h3>
                  <p className="text-sm text-muted-foreground">Understand your medical reports easily</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Activity className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">AetherDoc</h1>
            <p className="text-muted-foreground">AI Healthcare Platform</p>
          </div>

          <div className="card-medical">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Welcome Back</h2>
              <p className="text-muted-foreground">Sign in to access your healthcare portal</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="input-medical pl-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="input-medical pl-12 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-border bg-secondary" />
                  <span className="text-muted-foreground">Remember me</span>
                </label>
                <a href="#" className="text-primary hover:underline">Forgot password?</a>
              </div>

              <button type="submit" className="btn-medical w-full">
                Sign In
              </button>

              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <a href="#" className="text-primary hover:underline">Create Account</a>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Secured with end-to-end encryption</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
