import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, BarChart3, Megaphone, CalendarDays,
  Globe2, Upload, Menu, X, ChevronRight, Settings, GitBranch, Table2, Users
} from "lucide-react";

const NAV_GROUPS = [
  {
    group: "Palsgaard Puls",
    items: [
      { label: "Executive Overview", page: "PalsgaardPulsOverview", icon: LayoutDashboard },
      { label: "Channel Performance", page: "PalsgaardPulsChannels", icon: BarChart3 },
    ],
  },
  {
    group: "Marketing",
    items: [
      { label: "Campaigns", page: "Campaigns", icon: Megaphone },
      { label: "Events & Webinars", page: "EventsWebinars", icon: CalendarDays },
      { label: "Distributors", page: "Distributors", icon: Globe2 },
    ],
  },
  {
    group: "Admin",
    items: [
      { label: "Data Import", page: "DataImport", icon: Upload },
      { label: "Audit Log", page: "AuditLog", icon: GitBranch },
      { label: "Settings", page: "Settings", icon: Settings },
    ],
  },
];

export default function Layout({ children, currentPageName }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <style>{`
        :root {
          --brand: #004B87;
          --brand-light: #e8f0f8;
        }
      `}</style>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-gray-200 flex flex-col
        transform transition-transform duration-200
        ${open ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100" style={{ background: "#1a2e4a" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#4a7c6f" }}>
            <span className="text-white text-xs font-bold">P</span>
          </div>
          <div>
            <p className="text-sm font-bold text-white">Palsgaard Puls</p>
            <p className="text-xs" style={{ color: "#a8c5d6" }}>Marketing Intelligence</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)}>
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.group}>
              <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-1" style={{ color: "#9ca3af" }}>{group.group}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = currentPageName === item.page;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive ? "text-white font-medium" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                      style={isActive ? { background: "#1a2e4a" } : {}}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">DKK · Europe/Copenhagen</p>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setOpen(true)}>
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-800">
            {NAV_GROUPS.flatMap(g => g.items).find((n) => n.page === currentPageName)?.label || "Palsgaard Puls"}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}