"use client";
import { useState, useEffect } from "react";
import { getDistributors, getRegions } from "@/lib/db";
import { updateDistributorStatus } from "@/lib/actions";
import type { Distributor, Region } from "@/lib/mock-data";
import { cn } from "@/utils/cn";
import {
  RiAddLine,
  RiPauseLine,
  RiPlayLine,
  RiDeleteBin6Line,
  RiSearchLine,
} from "@remixicon/react";

type Status = "all" | "active" | "paused";

export default function DistribuidoresPage() {
  const [dists, setDists]     = useState<Distributor[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState<Status>("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getDistributors(), getRegions()]).then(([d, r]) => {
      setDists(d);
      setRegions(r);
      setLoading(false);
    });
  }, []);

  const filtered = dists.filter((d) => {
    const matchSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    const matchRegion = regionFilter === "all" || d.regionId === regionFilter;
    return matchSearch && matchStatus && matchRegion;
  });

  const toggleStatus = async (id: string) => {
    const d = dists.find((x) => x.id === id);
    if (!d) return;
    const newStatus = d.status === "active" ? "paused" : "active";
    setDists((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: newStatus as Distributor["status"] } : x))
    );
    await updateDistributorStatus(id, newStatus);
  };

  const deleteDist = async (id: string) => {
    setDists((prev) => prev.filter((d) => d.id !== id));
    setDeleteConfirm(null);
    await updateDistributorStatus(id, "inactive");
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Distribuidores</h1>
          <p className="text-sm text-gray-500 mt-1">
            {dists.filter((d) => d.status === "active").length} activos ·{" "}
            {dists.filter((d) => d.status === "paused").length} inactivos
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
        >
          <RiAddLine className="w-4 h-4" />
          Nuevo distribuidor
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar distribuidor..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="all">Todas las regiones</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
          {(["all", "active", "paused"] as Status[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition",
                statusFilter === s
                  ? "bg-primary-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              {s === "all" ? "Todos" : s === "active" ? "Activos" : "Inactivos"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Distribuidor</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Región</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered
              .filter((d) => d.status !== "inactive")
              .map((d) => {
                const region = regions.find((r) => r.id === d.regionId);
                return (
                  <tr key={d.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 font-medium text-gray-900">{d.name}</td>
                    <td className="px-4 py-4 text-gray-500">{d.email}</td>
                    <td className="px-4 py-4 text-gray-500">{region?.name}</td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "text-xs font-medium px-2.5 py-1 rounded-full",
                          d.status === "active"
                            ? "bg-green-50 text-green-700 border border-green-100"
                            : "bg-gray-100 text-gray-500 border border-gray-200"
                        )}
                      >
                        {d.status === "active" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleStatus(d.id)}
                          title={d.status === "active" ? "Pausar" : "Activar"}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
                        >
                          {d.status === "active" ? (
                            <RiPauseLine className="w-4 h-4" />
                          ) : (
                            <RiPlayLine className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(d.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                        >
                          <RiDeleteBin6Line className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        {filtered.filter((d) => d.status !== "inactive").length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            No hay distribuidores que coincidan con los filtros.
          </div>
        )}
      </div>

      {/* Add modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nuevo Distribuidor</h3>
            <p className="text-sm text-gray-500 mb-5">
              Para agregar un nuevo distribuidor, créalo desde el panel de Supabase: primero inserta el registro en la tabla{" "}
              <code className="bg-gray-100 px-1 rounded text-xs">distributors</code> y luego crea el usuario de autenticación con{" "}
              <code className="bg-gray-100 px-1 rounded text-xs">app_metadata.role = "distribuidor"</code>.
            </p>
            <button
              onClick={() => setShowAddModal(false)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar distribuidor</h3>
            <p className="text-sm text-gray-500 mb-6">
              ¿Estás seguro? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteDist(deleteConfirm)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
