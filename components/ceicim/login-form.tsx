"use client";

import { FormEvent, useEffect, useState } from "react";
import { Boxes, KeyRound, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginForm() {
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/setup-status", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Não foi possível verificar o acesso.");
        setNeedsSetup(Boolean(result.needsSetup));
      })
      .catch((value) => setError(value instanceof Error ? value.message : "Falha ao verificar o acesso."))
      .finally(() => setChecking(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch(needsSetup ? "/api/auth/setup" : "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível entrar.");
      window.location.assign("/dashboard");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-brand"><span><Sparkles /></span><div><strong>CEICIM</strong><small>Gestão integrada</small></div></div>
        <div className="login-copy"><p className="eyebrow">Acesso interno</p><h1>Estoque e visitas, organizados em um só lugar.</h1><p>Entre com suas credenciais individuais para acessar o sistema.</p></div>
        <div className="login-features"><span><Boxes /> Controle de materiais</span><span><ShieldCheck /> Perfis protegidos</span></div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <span className="login-icon"><KeyRound /></span>
          <p className="eyebrow">{needsSetup ? "Configuração inicial" : "Bem-vindo"}</p>
          <h2>{needsSetup ? "Criar administrador" : "Entrar no sistema"}</h2>
          <p>{needsSetup ? "Crie a primeira conta administrativa usando o código de ativação." : "Use seu usuário e sua senha próprios."}</p>
          {checking ? <div className="login-loading"><LoaderCircle className="spin" /> Verificando sistema...</div> : (
            <form onSubmit={submit} className="login-form">
              {needsSetup && <><label className="field"><span>Nome completo</span><Input name="name" autoComplete="name" required /></label><label className="field"><span>Código de ativação</span><Input name="setupKey" type="password" required /></label></>}
              <label className="field"><span>Usuário</span><Input name="username" autoComplete="username" placeholder="ex.: samuel" required autoFocus={!needsSetup} /></label>
              <label className="field"><span>Senha</span><Input name="password" type="password" minLength={needsSetup ? 10 : undefined} maxLength={128} autoComplete={needsSetup ? "new-password" : "current-password"} required /></label>
              {error && <div className="login-error">{error}</div>}
              <Button type="submit" size="lg" disabled={busy}>{busy ? <><LoaderCircle className="spin" /> Aguarde...</> : needsSetup ? "Criar conta e entrar" : "Entrar"}</Button>
            </form>
          )}
        </div>
        <footer>Sistema de Gestão do CEICIM <span>•</span> Desenvolvido por Samuel Ladeia</footer>
      </section>
    </main>
  );
}
