"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (err) {
      setError("Correo o contraseña incorrectos.");
      return;
    }

    const role = data.user.app_metadata?.role;
    const distSlug = data.user.app_metadata?.distributor_slug;
    const regionSlug = data.user.app_metadata?.region_slug;

    if (role === "gerente") {
      router.push("/dashboard");
    } else if (role === "editor" && regionSlug) {
      router.push(`/dashboard/region/${regionSlug}`);
    } else if (role === "editor") {
      setError("Tu cuenta no tiene una región asignada. Contacta al administrador.");
    } else if (role === "distribuidor" && distSlug) {
      router.push(`/distribuidor/${distSlug}`);
    } else {
      setError("Tu cuenta no tiene un rol configurado. Contacta al administrador.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">G</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Grow Path</h1>
          <p className="text-gray-500 mt-1 text-sm">Portal de métricas para distribuidores</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Iniciar sesión</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-xl transition text-sm"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="text-center mt-4">
            <Link
              href="/auth/reset-password"
              className="text-xs text-gray-400 hover:text-primary-600 transition"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
