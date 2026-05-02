"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type AdminGuardProps = {
  children: ReactNode;
};

export default function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();

  const [isChecking, setIsChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkAdminAccess() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        setMessage(`Erreur profil : ${profileError.message}`);
        setIsChecking(false);
        return;
      }

      if (profile?.role !== "admin") {
        setMessage("Accès refusé. Cette page est réservée aux administrateurs.");
        setIsAdmin(false);
        setIsChecking(false);
        return;
      }

      setIsAdmin(true);
      setIsChecking(false);
    }

    checkAdminAccess();
  }, [router]);

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-slate-300">Vérification des droits admin...</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="max-w-md rounded-3xl border border-red-400/30 bg-red-400/10 p-8 text-center">
          <h1 className="text-2xl font-bold text-red-100">Accès refusé</h1>
          <p className="mt-3 text-red-100">{message}</p>

          <a
            href="/dashboard"
            className="mt-6 inline-flex rounded-full bg-white px-6 py-3 font-semibold text-slate-950"
          >
            Retour au dashboard
          </a>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}