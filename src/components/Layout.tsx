import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  Syringe,
  FileText,
  BarChart3,
  Menu,
  Bell,
  Settings,
  User,
  Activity,
  X,
} from "lucide-react";
import { cn } from "@/utils";

const navItems = [
  { to: "/dashboard", label: "当日看板", icon: LayoutDashboard },
  { to: "/appointment", label: "预约排程", icon: CalendarDays },
  { to: "/assessment", label: "到检评估", icon: ClipboardCheck },
  { to: "/injection", label: "注射与候检", icon: Syringe },
  { to: "/report", label: "报告衔接", icon: FileText },
  { to: "/statistics", label: "运营统计", icon: BarChart3 },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const currentNav = navItems.find((item) => location.pathname.startsWith(item.to));

  return (
    <div className="flex h-full bg-slate-50">
      <aside
        className={cn(
          "flex flex-col bg-white border-r border-slate-200 transition-all duration-300 z-20",
          sidebarOpen ? "w-60" : "w-16"
        )}
      >
        <div className="h-16 flex items-center px-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-medical-600 to-medical-800 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <div className="animate-fade-in">
                <div className="text-sm font-semibold text-slate-900">核医学科</div>
                <div className="text-xs text-slate-500">流程管理台</div>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 py-3 px-2 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  isActive ? "nav-item-active" : "nav-item-inactive",
                  "mb-1"
                )}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className={cn("w-5 h-5 shrink-0", isActive && "text-medical-600")} />
                {sidebarOpen && <span className="animate-fade-in">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-2 border-t border-slate-100 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            {sidebarOpen && (
              <div className="animate-fade-in">
                <div className="text-sm font-medium text-slate-900">李主任</div>
                <div className="text-xs text-slate-500">科主任</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                {currentNav?.label ?? "工作台"}
              </h1>
              <p className="text-xs text-slate-500">2026年6月16日 星期二</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
            </button>
            <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
