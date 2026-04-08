"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { regions, distributors } from "@/lib/mock-data";

const REGION_COLORS: Record<string, string> = {
  Capital:           "#3B82F6",
  Oriente:           "#F59E0B",
  Centro:            "#10B981",
  "Centro Occidente":"#F43F5E",
  Occidente:         "#8B5CF6",
  Andes:             "#0891B2",
};
import {
  RiDashboardLine,
  RiGroupLine,
  RiCalculatorLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiArrowLeftSLine,
  RiLogoutBoxLine,
  RiMenuLine,
  RiCloseLine,
} from "@remixicon/react";
import { cn } from "@/utils/cn";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [expandedRegions, setExpandedRegions] = useState<string[]>(["1"]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const toggleRegion = (regionId: string) => {
    setExpandedRegions((prev) =>
      prev.includes(regionId) ? prev.filter((r) => r !== regionId) : [...prev, regionId]
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-30 bg-white border-r border-gray-100 flex flex-col transition-all duration-200",
          collapsed ? "w-16" : "w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand */}
        <div className={cn(
          "border-b border-gray-100 flex items-center",
          collapsed ? "flex-col gap-2 px-3 py-3" : "justify-between px-4 py-4"
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">F</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">Fritz</p>
                <p className="text-xs text-gray-400">Calculadora de métricas</p>
              </div>
            )}
          </div>
          {/* Toggle button */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expandir" : "Colapsar"}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors cursor-pointer flex-shrink-0"
          >
            {collapsed
              ? <RiArrowRightSLine className="w-5 h-5" />
              : <RiArrowLeftSLine className="w-5 h-5" />
            }
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {/* Overview */}
          <Link
            href="/dashboard"
            title={collapsed ? "Vista Global" : undefined}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition",
              collapsed ? "justify-center" : "",
              pathname === "/dashboard"
                ? "bg-primary-50 text-primary-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <RiDashboardLine className="w-4 h-4 flex-shrink-0" />
            {!collapsed && "Vista Global"}
          </Link>

          {/* Regions section */}
          {!collapsed && (
            <div className="pt-3 pb-1">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Regiones</p>
            </div>
          )}
          {collapsed && <div className="pt-2 border-t border-gray-100 mx-1" />}

          {regions.map((region) => {
            const regionDistributors = distributors.filter(
              (d) => d.regionId === region.id && d.status !== "inactive"
            );
            const isExpanded = expandedRegions.includes(region.id);
            const regionColor = REGION_COLORS[region.name] ?? "#94A3B8";
            const isRegionActive = pathname === `/dashboard/region/${region.slug}`;

            if (collapsed) {
              return (
                <Link
                  key={region.id}
                  href={`/dashboard/region/${region.slug}`}
                  title={region.name}
                  className={cn(
                    "flex items-center justify-center w-8 h-8 mx-auto rounded-lg transition",
                    isRegionActive ? "bg-primary-50" : "hover:bg-gray-50"
                  )}
                >
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: regionColor }} />
                </Link>
              );
            }

            return (
              <div key={region.id}>
                <div className={cn(
                  "flex items-center justify-between rounded-lg text-sm font-medium transition",
                  isRegionActive ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}>
                  <Link
                    href={`/dashboard/region/${region.slug}`}
                    className="flex items-center gap-2 flex-1 px-3 py-2 min-w-0"
                  >
                    <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: regionColor, opacity: 0.7 }} />
                    <span className="truncate">{region.name}</span>
                  </Link>
                  <button
                    onClick={() => toggleRegion(region.id)}
                    className="flex items-center gap-0.5 pr-3 py-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <span className="text-xs">{regionDistributors.length}</span>
                    {isExpanded ? <RiArrowDownSLine className="w-4 h-4" /> : <RiArrowRightSLine className="w-4 h-4" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-100 pl-3">
                    {regionDistributors.map((d) => {
                      const isActive = pathname === `/dashboard/distribuidor/${d.slug}`;
                      return (
                        <Link
                          key={d.id}
                          href={`/dashboard/distribuidor/${d.slug}`}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition",
                            isActive ? "bg-primary-50 text-primary-700 font-medium" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800",
                            d.status === "paused" && "opacity-50"
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", d.status === "active" ? "bg-green-400" : "bg-gray-300")} />
                          {d.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Divider */}
          <div className="pt-3 pb-1">
            <div className="border-t border-gray-100" />
          </div>

          {/* Distributors management */}
          <Link
            href="/dashboard/distribuidores"
            title={collapsed ? "Distribuidores" : undefined}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition",
              collapsed ? "justify-center" : "",
              pathname === "/dashboard/distribuidores"
                ? "bg-primary-50 text-primary-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <RiGroupLine className="w-4 h-4 flex-shrink-0" />
            {!collapsed && "Distribuidores"}
          </Link>

          {/* Calculadora */}
          {(() => {
            const distSlug = pathname.match(/\/dashboard\/distribuidor\/([^/]+)/)?.[1];
            const href = distSlug ? `/dashboard/distribuidor/${distSlug}/calculadora` : "/dashboard/calculadora";
            const isActive = pathname.endsWith("/calculadora");
            return (
              <Link
                href={href}
                title={collapsed ? "Calculadora" : undefined}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition",
                  collapsed ? "justify-center" : "",
                  isActive ? "bg-amber-50 text-amber-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <RiCalculatorLine className="w-4 h-4 flex-shrink-0" />
                {!collapsed && "Calculadora"}
              </Link>
            );
          })()}
        </nav>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-gray-100 space-y-1">
          {!collapsed && (
            <>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
                <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">LD</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">Luis Díaz</p>
                  <p className="text-xs text-gray-400">Administrador</p>
                </div>
              </div>
              <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition">
                <RiLogoutBoxLine className="w-4 h-4" />
                Cerrar sesión
              </button>
            </>
          )}

          {collapsed && (
            <button title="Cerrar sesión" className="w-full flex items-center justify-center px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition">
              <RiLogoutBoxLine className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile menu button */}
        <div className="lg:hidden px-4 py-3 border-b border-gray-100 bg-white">
          <button
            className="p-1 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <RiCloseLine className="w-5 h-5" /> : <RiMenuLine className="w-5 h-5" />}
          </button>
        </div>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
