"use client";
import { useState, useEffect } from "react";
import { getRegions, getDistributors, ROLE_LABELS } from "@/lib/db";
import { listUsers, setUserAccess, setUserEnabled, type ManagedUser } from "@/lib/user-actions";
import type { Region, Distributor } from "@/lib/mock-data";
import { cn } from "@/utils/cn";
import { REGION_COLORS } from "@/lib/regions";
import {
  RiSearchLine,
  RiCheckLine,
  RiForbidLine,
  RiErrorWarningLine,
} from "@remixicon/react";

export default function UsuariosPage() {
  const [users, setUsers]             = useState<ManagedUser[]>([]);
  const [regions, setRegions]         = useState<Region[]>([]);
  const [dists, setDists]             = useState<Distributor[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [roleFilter, setRoleFilter]   = useState("all");
  const [savingId, setSavingId]       = useState<string | null>(null);
  const [error, setError]             = useState("");

  useEffect(() => {
    Promise.all([listUsers(), getRegions(), getDistributors()]).then(([u, r, d]) => {
      if (u.error) setError(u.error);
      setUsers(u.users);
      setRegions(r);
      setDists(d);
      setLoading(false);
    });
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      u.email.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  async function changeAccess(user: ManagedUser, role: string, scope: string) {
    setSavingId(user.id);
    setError("");

    const access =
      role === "gerente"
        ? ({ role: "gerente" } as const)
        : role === "editor"
        ? ({ role: "editor", regionSlug: scope } as const)
        : ({ role: "distribuidor", distributorSlug: scope } as const);

    const res = await setUserAccess(user.id, access);
    setSavingId(null);

    if (res.error) { setError(res.error); return; }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id
          ? {
              ...u,
              role: role as ManagedUser["role"],
              regionSlug: role === "editor" ? scope : "",
              distributorSlug: role === "distribuidor" ? scope : "",
            }
          : u
      )
    );
  }

  async function toggleEnabled(user: ManagedUser) {
    setSavingId(user.id);
    setError("");
    const res = await setUserEnabled(user.id, !user.enabled);
    setSavingId(null);
    if (res.error) { setError(res.error); return; }
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, enabled: !u.enabled } : u))
    );
  }

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-sm text-gray-500 mt-1">
          {users.filter((u) => u.enabled).length} habilitados ·{" "}
          {users.filter((u) => !u.enabled).length} deshabilitados
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <RiErrorWarningLine className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-56">
          <RiSearchLine className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o correo…"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">Todos los roles</option>
          <option value="gerente">Administrador</option>
          <option value="editor">Editor</option>
          <option value="distribuidor">Distribuidor</option>
          <option value="">Sin rol</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Alcance</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const scope = u.role === "editor" ? u.regionSlug : u.distributorSlug;
              const busy  = savingId === u.id;

              return (
                <tr
                  key={u.id}
                  className={cn(
                    "border-b border-gray-50 last:border-0",
                    busy && "opacity-50",
                    !u.enabled && "bg-gray-50/60"
                  )}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{u.displayName || u.email}</p>
                    {u.displayName && <p className="text-xs text-gray-400">{u.email}</p>}
                  </td>

                  <td className="px-4 py-3">
                    <select
                      disabled={busy}
                      value={u.role}
                      onChange={(e) => changeAccess(u, e.target.value, "")}
                      className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="" disabled>Sin rol</option>
                      <option value="gerente">{ROLE_LABELS.gerente}</option>
                      <option value="editor">{ROLE_LABELS.editor}</option>
                      <option value="distribuidor">{ROLE_LABELS.distribuidor}</option>
                    </select>
                  </td>

                  <td className="px-4 py-3">
                    {u.role === "editor" && (
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-sm flex-shrink-0"
                          style={{
                            backgroundColor:
                              REGION_COLORS[
                                regions.find((r) => r.slug === u.regionSlug)?.name ?? ""
                              ] ?? "#CBD5E1",
                          }}
                        />
                        <select
                          disabled={busy}
                          value={scope}
                          onChange={(e) => changeAccess(u, "editor", e.target.value)}
                          className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Sin región</option>
                          {regions.map((r) => (
                            <option key={r.id} value={r.slug}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {u.role === "distribuidor" && (
                      <select
                        disabled={busy}
                        value={scope}
                        onChange={(e) => changeAccess(u, "distribuidor", e.target.value)}
                        className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Sin distribuidor</option>
                        {dists.map((d) => (
                          <option key={d.id} value={d.slug}>{d.name}</option>
                        ))}
                      </select>
                    )}

                    {u.role === "gerente" && (
                      <span className="text-xs text-gray-400">Todas las regiones</span>
                    )}

                    {!u.role && (
                      <span className="text-xs text-amber-600">Asignar un rol</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                        u.enabled ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          u.enabled ? "bg-green-500" : "bg-gray-400"
                        )}
                      />
                      {u.enabled ? "Habilitado" : "Deshabilitado"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      disabled={busy}
                      onClick={() => toggleEnabled(u)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer",
                        u.enabled
                          ? "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                          : "text-green-700 hover:bg-green-50"
                      )}
                    >
                      {u.enabled
                        ? <><RiForbidLine className="w-3.5 h-3.5" />Deshabilitar</>
                        : <><RiCheckLine className="w-3.5 h-3.5" />Habilitar</>}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-10">
            No hay usuarios que coincidan.
          </p>
        )}
      </div>
    </div>
  );
}
