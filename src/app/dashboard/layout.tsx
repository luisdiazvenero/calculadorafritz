"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { regions, distributors } from "@/lib/mock-data";

const REGION_COLORS: Record<string, string> = {
  Capital:           "#0466C8",
  Oriente:           "#BE3054",
  Centro:            "#424656",
  "Centro Occidente":"#FB6A85",
  Occidente:         "#A7AABD",
  Andes:             "#1A2D5A",
};
import {
  RiDashboardLine,
  RiGroupLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiLogoutBoxLine,
  RiMenuLine,
  RiCloseLine,
} from "@remixicon/react";
import { cn } from "@/utils/cn";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [expandedRegions, setExpandedRegions] = useState<string[]>(["1"]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          "fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100 flex flex-col transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand */}
        <div className="px-4 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">F</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Fritz</p>
            <p className="text-xs text-gray-400">Calculadora de métricas</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {/* Overview */}
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition",
              pathname === "/dashboard"
                ? "bg-primary-50 text-primary-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <RiDashboardLine className="w-4 h-4" />
            Vista Global
          </Link>

          {/* Divider */}
          <div className="pt-3 pb-1">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Regiones
            </p>
          </div>

          {/* Regions + distributors */}
          {regions.map((region) => {
            const regionDistributors = distributors.filter(
              (d) => d.regionId === region.id && d.status !== "inactive"
            );
            const isExpanded = expandedRegions.includes(region.id);
            const regionColor = REGION_COLORS[region.name] ?? "#94A3B8";
            const isRegionActive = pathname === `/dashboard/region/${region.slug}`;

            return (
              <div key={region.id}>
                <div className={cn(
                  "flex items-center justify-between rounded-lg text-sm font-medium transition",
                  isRegionActive ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}>
                  {/* Region name → navigates to region page */}
                  <Link
                    href={`/dashboard/region/${region.slug}`}
                    className="flex items-center gap-2 flex-1 px-3 py-2 min-w-0"
                  >
                    <span
                      className="w-2 h-2 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: regionColor, opacity: 0.7 }}
                    />
                    <span className="truncate">{region.name}</span>
                  </Link>
                  {/* Arrow → toggles distributor list */}
                  <button
                    onClick={() => toggleRegion(region.id)}
                    className="flex items-center gap-0.5 pr-3 py-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <span className="text-xs">{regionDistributors.length}</span>
                    {isExpanded ? (
                      <RiArrowDownSLine className="w-4 h-4" />
                    ) : (
                      <RiArrowRightSLine className="w-4 h-4" />
                    )}
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
                            isActive
                              ? "bg-primary-50 text-primary-700 font-medium"
                              : "text-gray-500 hover:bg-gray-50 hover:text-gray-800",
                            d.status === "paused" && "opacity-50"
                          )}
                        >
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full flex-shrink-0",
                            d.status === "active" ? "bg-green-400" : "bg-gray-300"
                          )} />
                          {d.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Divider before Distribuidores */}
          <div className="pt-3 pb-1">
            <div className="border-t border-gray-100" />
          </div>

          {/* Distributors management */}
          <Link
            href="/dashboard/distribuidores"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition",
              pathname === "/dashboard/distribuidores"
                ? "bg-primary-50 text-primary-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <RiGroupLine className="w-4 h-4" />
            Distribuidores
          </Link>
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-100 space-y-1">
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
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile menu button — only visible on small screens */}
        <div className="lg:hidden px-4 py-3 border-b border-gray-100 bg-white">
          <button
            className="p-1 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <RiCloseLine className="w-5 h-5" /> : <RiMenuLine className="w-5 h-5" />}
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
