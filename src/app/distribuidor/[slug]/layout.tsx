"use client";
import { use, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { distributors, regions } from "@/lib/mock-data";
import { cn } from "@/utils/cn";
import {
  RiEarthLine,
  RiBarChartBoxLine,
  RiMenuLine,
} from "@remixicon/react";

const REGION_COLORS: Record<string, string> = {
  Capital:            "#0466C8",
  Oriente:            "#BE3054",
  Centro:             "#424656",
  "Centro Occidente": "#FB6A85",
  Occidente:          "#A7AABD",
  Andes:              "#1A2D5A",
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

  const distributor = distributors.find((d) => d.slug === slug);
  const region = distributor ? regions.find((r) => r.id === distributor.regionId) : null;
  const regionColor = REGION_COLORS[region?.name ?? ""] ?? "#0466C8";

  const navItems = [
    {
      label: "Visión Global",
      href: `/distribuidor/${slug}`,
      icon: RiEarthLine,
      exact: true,
    },
    {
      label: "Reportes Mensuales",
      href: `/distribuidor/${slug}/datos`,
      icon: RiBarChartBoxLine,
      exact: false,
    },
  ];

  function SidebarContent() {
    return (
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">F</span>
            </div>
            <span className="text-sm font-semibold text-gray-700">Fritz Calculadora</span>
          </div>
        </div>

        {/* Distributor info */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: regionColor }} />
            <span className="text-xs text-gray-400">{region?.name ?? "—"}</span>
          </div>
          <p className="text-sm font-bold text-gray-900 truncate">{distributor?.name ?? slug}</p>
          <p className="text-xs text-gray-400 truncate mt-0.5">{distributor?.email ?? ""}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="px-2 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Menú</p>
          {navItems.map(({ label, href, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-primary-600" : "text-gray-400")} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100">
          <p className="text-[11px] text-gray-400">Portal del Distribuidor</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-10">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100"
          >
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
