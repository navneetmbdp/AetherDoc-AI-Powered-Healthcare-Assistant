import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  AlertTriangle,
  Stethoscope,
  FileSearch,
  Heart,
  History,
  User,
  LogOut,
  Activity,
  ScanEye,
} from "lucide-react";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Emergency Help", url: "/emergency", icon: AlertTriangle },
  { title: "AI Doctor", url: "/consultation", icon: Stethoscope },
  { title: "Report Analysis", url: "/reports", icon: FileSearch },
  { title: "Mental Health", url: "/mental-health", icon: Heart },
  { title: "Image Analyser", url: "/image-analyser", icon: ScanEye },
  { title: "Session History", url: "/history", icon: History },
  { title: "My Profile", url: "/profile", icon: User },
];

export function AppSidebar() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">AetherDoc</h1>
            <p className="text-xs text-muted-foreground">AI Healthcare</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            className={isActive(item.url) ? "nav-item-active" : "nav-item"}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.title}</span>
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">John Doe</p>
            <p className="text-xs text-muted-foreground truncate">john@example.com</p>
          </div>
        </div>
        <NavLink
          to="/"
          className="nav-item text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </NavLink>
      </div>
    </aside>
  );
}
