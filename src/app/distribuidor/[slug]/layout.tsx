"use client";
import { use, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { distributors, regions } from "@/lib/mock-data";
import { cn } from "@/utils/cn";
import {
  RiEarthLine,
  RiBarChartBoxLine,
  RiCalculatorLine,
  RiMenuLine,
  RiArrowLeftSLine,
} from "@remixicon/react";

const REGION_COLORS: Record<string, string> = {
  Capital:            "#3B82F6",
  Oriente:            "#F59E0B",
  Centro:             "#10B981",
  "Centro Occidente": "#F43F5E",
  Occidente:          "#8B5CF6",
  Andes:              "#0891B2",
};

export default function DistribuidorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const distributor = distributors.find((d) => d.slug === slug);
  const region = distributor ? regions.find((r) => r.id === distributor.regionId) : null;
  const regionColor = REGION_COLORS[region?.name ?? ""] ?? "#0466C8";

  const navItems = [
    { label: "Visión Global",      href: `/distribuidor/${slug}`,             icon: RiEarthLine,       exact: true  },
    { label: "Reportes Mensuales", href: `/distribuidor/${slug}/datos`,        icon: RiBarChartBoxLine, exact: false },
    { label: "Calculadora",        href: `/distribuidor/${slug}/calculadora`,  icon: RiCalculatorLine,  exact: false },
  ];

  function SidebarContent({ isCollapsed }: { isCollapsed: boolean }) {
    return (
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className={cn(
          "border-b border-gray-100 flex items-center",
          isCollapsed ? "px-3 py-5 justify-center" : "px-5 py-5 gap-2.5"
        )}>
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">F</span>
          </div>
          {!isCollapsed && <span className="text-sm font-semibold text-gray-700">Fritz Calculadora</span>}
        </div>

        {/* Distributor info */}
        {!isCollapsed && (
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: regionColor }} />
              <span className="text-xs text-gray-400">{region?.name ?? "—"}</span>
            </div>
            <p className="text-sm font-bold text-gray-900 truncate">{distributor?.name ?? slug}</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{distributor?.email ?? ""}</p>
          </div>
        )}
        {isCollapsed && (
          <div className="py-3 border-b border-gray-100 flex justify-center">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: regionColor }} title={distributor?.name ?? slug} />
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {!isCollapsed && <p className="px-2 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Menú</p>}
          {navItems.map(({ label, href, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={isCollapsed ? label : undefined}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isCollapsed ? "justify-center" : "",
                  active
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-primary-600" : "text-gray-400")} />
                {!isCollapsed && label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={cn("border-t border-gray-100 py-3", isCollapsed ? "px-2" : "px-5")}>
          {/* Collapse toggle — desktop only */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            className={cn(
              "hidden lg:flex w-full items-center px-3 py-2 rounded-lg text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition mb-1",
              isCollapsed ? "justify-center" : "gap-2"
            )}
          >
            <RiArrowLeftSLine className={cn("w-4 h-4 flex-shrink-0 transition-transform duration-200", isCollapsed && "rotate-180")} />
            {!isCollapsed && "Colapsar"}
          </button>
          {!isCollapsed && <p className="text-[11px] text-gray-400">Portal del Distribuidor</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col bg-white border-r border-gray-100 flex-shrink-0 transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}>
        <SidebarContent isCollapsed={collapsed} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl z-50">
            <SidebarContent isCollapsed={false} />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-10">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <RiMenuLine className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: regionColor }} />
            <span className="text-sm font-semibold text-gray-900">{distributor?.name ?? slug}</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
