"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, KeyRound, LoaderCircle, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";

type ManagedUser = { id: number; name: string; username: string; role: string; active: boolean; createdAt: number };

export default function UsersManager({ currentUserId }: { currentUserId: number }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [role, setRole] = useState("operador");

  const load = useCallback(async () => {
    const response = await fetch("/api/users", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar os usuários.");
    setUsers(result.users);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load().catch((error) => { toast.error(error.message); setLoading(false); }), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function action(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const response = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível concluir a ação.");
      toast.success(result.message);
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha na operação."); }
    finally { setBusy(false); }
  }

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void action({ action: "create", name: form.get("name"), username: form.get("username"), password: form.get("password"), role }).then(() => { setCreateOpen(false); setRole("operador"); });
  }

  function reset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get("password");
    void action({ action: "reset_password", id: resetTarget?.id, password }).then(() => setResetTarget(null));
  }

  return (
    <main className="users-page">
      <header className="users-header"><div><Button variant="ghost" onClick={() => window.location.assign("/dashboard")}><ArrowLeft />Voltar ao painel</Button><p className="eyebrow">Administração</p><h1>Usuários e permissões</h1><p>Crie acessos individuais e escolha entre administrador e operador.</p></div><Button onClick={() => setCreateOpen(true)}><Plus />Novo usuário</Button></header>
      <section className="panel table-panel">
        {loading ? <div className="loading-line"><LoaderCircle className="spin" />Carregando usuários...</div> : (
          <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Usuário</TableHead><TableHead>Perfil</TableHead><TableHead>Situação</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
            {users.map((user) => <TableRow key={user.id}><TableCell className="font-semibold">{user.name}{user.id === currentUserId && <small className="block text-muted-foreground">Sua conta</small>}</TableCell><TableCell>@{user.username}</TableCell><TableCell><Select value={user.role} disabled={busy || user.id === currentUserId} onValueChange={(value) => void action({ action: "update", id: user.id, role: value, active: user.active })}><SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="administrador">Administrador</SelectItem><SelectItem value="operador">Operador</SelectItem></SelectContent></Select></TableCell><TableCell><div className="status-switch"><Switch checked={user.active} disabled={busy || user.id === currentUserId} onCheckedChange={(active) => void action({ action: "update", id: user.id, role: user.role, active })}/><Badge className={user.active ? "badge-ok" : "action-arquivamento"}>{user.active ? "Ativo" : "Inativo"}</Badge></div></TableCell><TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => setResetTarget(user)}><KeyRound />Redefinir senha</Button></TableCell></TableRow>)}
          </TableBody></Table>
        )}
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent><DialogHeader><DialogTitle>Criar novo usuário</DialogTitle><DialogDescription>A pessoa entrará com o usuário e a senha definidos aqui.</DialogDescription></DialogHeader><form className="form-grid" onSubmit={create}><label className="field full"><span>Nome completo</span><Input name="name" required /></label><label className="field full"><span>Usuário</span><Input name="username" placeholder="letras minúsculas e números" required /></label><label className="field"><span>Senha inicial</span><Input name="password" type="password" minLength={8} required /></label><label className="field"><span>Perfil</span><Select value={role} onValueChange={setRole}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="operador">Operador</SelectItem><SelectItem value="administrador">Administrador</SelectItem></SelectContent></Select></label><DialogFooter className="full"><Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button disabled={busy}>{busy ? "Criando..." : "Criar usuário"}</Button></DialogFooter></form></DialogContent></Dialog>
      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}><DialogContent><DialogHeader><DialogTitle>Redefinir senha</DialogTitle><DialogDescription>Defina uma nova senha para {resetTarget?.name}. As sessões atuais serão encerradas.</DialogDescription></DialogHeader><form className="form-grid" onSubmit={reset}><label className="field full"><span>Nova senha</span><Input name="password" type="password" minLength={8} required autoFocus /></label><DialogFooter className="full"><Button type="button" variant="outline" onClick={() => setResetTarget(null)}>Cancelar</Button><Button disabled={busy}><ShieldCheck />Salvar nova senha</Button></DialogFooter></form></DialogContent></Dialog>
      <Toaster richColors position="top-right" />
    </main>
  );
}
