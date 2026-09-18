"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileDown,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  PackagePlus,
  Pencil,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  TriangleAlert,
  UserCog,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";

type View = "inicio" | "estoque" | "movimentar" | "historico" | "agenda" | "arquivados";

type Item = {
  id: number;
  name: string;
  category: string;
  quantity: number;
  minStock: number;
  archivedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

type Movement = {
  id: number;
  itemId: number | null;
  itemName: string;
  action: string;
  quantity: number;
  sector: string | null;
  recipient: string | null;
  notes: string | null;
  actorName: string;
  createdAt: number;
};

type CurrentUser = { id: number; name: string; username: string; role: "administrador" | "operador" };

type Visit = {
  id: number;
  visitDate: string;
  startTime: string;
  endTime: string;
  institution: string;
  responsible: string;
  visitors: number;
  status: "agendada" | "realizada" | "cancelada";
  notes: string | null;
  createdAt: number;
  updatedAt: number;
};

type DataSet = { items: Item[]; movements: Movement[]; visits: Visit[] };

const emptyData: DataSet = { items: [], movements: [], visits: [] };
const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const weekNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const navItems: { value: View; label: string; icon: typeof LayoutDashboard }[] = [
  { value: "inicio", label: "Visão geral", icon: LayoutDashboard },
  { value: "estoque", label: "Estoque", icon: Boxes },
  { value: "movimentar", label: "Entradas e saídas", icon: ArrowDownToLine },
  { value: "historico", label: "Movimentações", icon: History },
  { value: "agenda", label: "Agenda de visitas", icon: CalendarDays },
  { value: "arquivados", label: "Arquivados", icon: Archive },
];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    .format(parseDate(value))
    .replace(" de ", " ");
}

function formatDateTime(value: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function todayLabel() {
  const value = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  }).format(new Date());
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function statusLabel(status: Visit["status"]) {
  return { agendada: "Agendada", realizada: "Realizada", cancelada: "Cancelada" }[status];
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    cadastro: "Cadastro",
    entrada: "Entrada",
    saida: "Saída",
    edicao: "Edição",
    arquivamento: "Arquivamento",
    desarquivamento: "Desarquivamento",
  };
  return labels[action] ?? action;
}

async function postAction(payload: Record<string, unknown>) {
  const response = await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = (await response.json()) as { error?: string; message?: string };
  if (response.status === 401) window.location.assign("/");
  if (!response.ok) throw new Error(result.error || "Não foi possível concluir a ação.");
  return result;
}

function EmptyState({ icon: Icon, title, text }: { icon: typeof Boxes; title: string; text: string }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon /></span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, detail, tone = "cyan" }: {
  icon: typeof Boxes; label: string; value: string | number; detail: string; tone?: "cyan" | "amber" | "violet" | "red";
}) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <div className="stat-top"><span className="stat-icon"><Icon /></span><span>{label}</span></div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

export default function Dashboard({ user }: { user: CurrentUser }) {
  const [view, setView] = useState<View>("inicio");
  const [data, setData] = useState<DataSet>(emptyData);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [itemDialog, setItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Item | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [visitDialog, setVisitDialog] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [visitStatus, setVisitStatus] = useState<Visit["status"]>("agendada");
  const [monthCursor, setMonthCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [renderTime] = useState(() => Date.now());
  const isAdmin = user.role === "administrador";
  const initials = user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("pt-BR");

  const loadData = useCallback(async (showSuccess = false) => {
    try {
      setLoadError("");
      const response = await fetch("/api/data", { cache: "no-store" });
      const result = (await response.json()) as DataSet & { error?: string };
      if (response.status === 401) { window.location.assign("/"); return; }
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar os dados.");
      setData({ items: result.items ?? [], movements: result.movements ?? [], visits: result.visits ?? [] });
      if (showSuccess) toast.success("Dados atualizados.");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    type WebTool = {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: Record<string, unknown>) => Promise<unknown>;
    };
    const doc = document as Document & {
      modelContext?: { registerTool: (tool: WebTool, options?: { signal?: AbortSignal }) => void | Promise<void> };
    };
    if (!doc.modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    const register = async (tool: WebTool) => {
      try { await doc.modelContext?.registerTool(tool, { signal: lifecycle.signal }); } catch { /* recurso opcional */ }
    };
    void register({
      name: "create_ceicim_visit",
      title: "Agendar visita ao CEICIM",
      description: "Cria uma visita na agenda do CEICIM e atualiza a interface.",
      inputSchema: {
        type: "object",
        properties: {
          visitDate: { type: "string", description: "Data no formato AAAA-MM-DD" },
          startTime: { type: "string", description: "Horário inicial HH:MM" },
          endTime: { type: "string", description: "Horário final HH:MM" },
          institution: { type: "string" },
          responsible: { type: "string" },
          visitors: { type: "integer", minimum: 1 },
          notes: { type: "string" },
        },
        required: ["visitDate", "startTime", "endTime", "institution", "responsible", "visitors"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input) => {
        const result = await postAction({ action: "create_visit", status: "agendada", ...input });
        await loadData();
        return { success: true, message: result.message };
      },
    });
    void register({
      name: "record_inventory_movement",
      title: "Registrar movimentação de estoque",
      description: "Registra uma entrada ou saída de um item existente no estoque do CEICIM.",
      inputSchema: {
        type: "object",
        properties: {
          itemId: { type: "integer" },
          type: { type: "string", enum: ["entrada", "saida"] },
          quantity: { type: "integer", minimum: 1 },
          sector: { type: "string" },
          recipient: { type: "string" },
          notes: { type: "string" },
        },
        required: ["itemId", "type", "quantity"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input) => {
        const result = await postAction({ action: "movement", ...input });
        await loadData();
        return { success: true, message: result.message };
      },
    });
    return () => lifecycle.abort();
  }, [loadData]);

  const activeItems = useMemo(() => data.items.filter((item) => !item.archivedAt), [data.items]);
  const archivedItems = useMemo(() => data.items.filter((item) => item.archivedAt), [data.items]);
  const lowStockItems = useMemo(() => activeItems.filter((item) => item.quantity <= item.minStock), [activeItems]);
  const today = dateKey(new Date());
  const todayVisits = data.visits.filter((visit) => visit.visitDate === today && visit.status !== "cancelada");
  const upcomingVisits = data.visits
    .filter((visit) => visit.visitDate >= today && visit.status === "agendada")
    .slice(0, 5);
  const monthKey = `${monthCursor.getFullYear()}-${String(monthCursor.getMonth() + 1).padStart(2, "0")}`;
  const monthVisitors = data.visits
    .filter((visit) => visit.visitDate.startsWith(monthKey) && visit.status !== "cancelada")
    .reduce((total, visit) => total + visit.visitors, 0);

  const filteredItems = activeItems.filter((item) =>
    `${item.name} ${item.category}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))
  );

  const monthDays = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const previousLast = new Date(year, month, 0).getDate();
    const cells: { date: Date; current: boolean }[] = [];
    for (let i = firstDay - 1; i >= 0; i--) cells.push({ date: new Date(year, month - 1, previousLast - i), current: false });
    for (let day = 1; day <= lastDate; day++) cells.push({ date: new Date(year, month, day), current: true });
    while (cells.length < 42) cells.push({ date: new Date(year, month + 1, cells.length - firstDay - lastDate + 1), current: false });
    return cells;
  }, [monthCursor]);

  const selectedVisits = data.visits.filter((visit) => visit.visitDate === selectedDate);
  const historySize = 12;
  const historyPages = Math.max(1, Math.ceil(data.movements.length / historySize));
  const pagedMovements = data.movements.slice((historyPage - 1) * historySize, historyPage * historySize);

  async function runAction(payload: Record<string, unknown>, close?: () => void) {
    try {
      setBusy(true);
      const result = await postAction(payload);
      toast.success(result.message || "Ação concluída.");
      close?.();
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir a ação.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }

  function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void runAction(
      editingItem
        ? { action: "update_item", id: editingItem.id, name: form.get("name"), category: form.get("category"), minStock: form.get("minStock") }
        : { action: "create_item", name: form.get("name"), category: form.get("category"), quantity: form.get("quantity"), minStock: form.get("minStock") },
      () => { setItemDialog(false); setEditingItem(null); }
    );
  }

  function submitMovement(event: FormEvent<HTMLFormElement>, type: "entrada" | "saida") {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    void runAction({
      action: "movement",
      type,
      itemId: form.get("itemId"),
      quantity: form.get("quantity"),
      sector: form.get("sector"),
      recipient: form.get("recipient"),
      notes: form.get("notes"),
    }, () => formElement.reset());
  }

  function submitVisit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void runAction({
      action: editingVisit?.id ? "update_visit" : "create_visit",
      id: editingVisit?.id,
      visitDate: form.get("visitDate"),
      startTime: form.get("startTime"),
      endTime: form.get("endTime"),
      institution: form.get("institution"),
      responsible: form.get("responsible"),
      visitors: form.get("visitors"),
      status: visitStatus,
      notes: form.get("notes"),
    }, () => { setVisitDialog(false); setEditingVisit(null); setVisitStatus("agendada"); });
  }

  function openNewVisit(date = selectedDate) {
    setEditingVisit({
      id: 0,
      visitDate: date,
      startTime: "08:00",
      endTime: "09:30",
      institution: "",
      responsible: "",
      visitors: 1,
      status: "agendada",
      notes: "",
      createdAt: 0,
      updatedAt: 0,
    });
    setVisitStatus("agendada");
    setVisitDialog(true);
  }

  const headerTitle = navItems.find((item) => item.value === view)?.label ?? "CEICIM";

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas" className="ceicim-sidebar">
        <SidebarHeader className="brand-area">
          <div className="brand-mark" aria-hidden="true"><Sparkles /></div>
          <div><strong>CEICIM</strong><span>Gestão integrada</span></div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      isActive={view === item.value}
                      onClick={() => setView(item.value)}
                      tooltip={item.label}
                      className="nav-button"
                    >
                      <item.icon /><span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {isAdmin && <SidebarMenuItem><SidebarMenuButton onClick={() => window.location.assign("/usuarios")} tooltip="Usuários" className="nav-button"><UserCog /><span>Usuários</span></SidebarMenuButton></SidebarMenuItem>}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="sidebar-footer">
          <div className="profile-dot">{initials}</div>
          <div><strong>{user.name}</strong><span>{isAdmin ? "Administrador" : "Operador"}</span></div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="app-shell">
        <header className="topbar">
          <div className="topbar-title">
            <SidebarTrigger className="menu-trigger"><Menu /></SidebarTrigger>
            <div><span>Centro Educacional Inovação de Ciências</span><h1>{headerTitle}</h1></div>
          </div>
          <div className="topbar-actions">
            <span className="today-chip"><CalendarDays />{todayLabel()}</span>
            <Button variant="outline" onClick={() => window.location.assign("/api/inventory/pdf")}><FileDown /><span className="action-label">Baixar estoque PDF</span></Button>
            <Button variant="outline" size="icon" onClick={() => void loadData(true)} aria-label="Atualizar dados"><RefreshCw /></Button>
            <Button variant="ghost" size="icon" onClick={() => void logout()} aria-label="Sair"><LogOut /></Button>
          </div>
        </header>

        <main className="workspace">
          {loadError && (
            <div className="error-banner"><TriangleAlert /><div><strong>Dados indisponíveis</strong><span>{loadError}</span></div><Button variant="outline" size="sm" onClick={() => void loadData()}>Tentar novamente</Button></div>
          )}

          {view === "inicio" && (
            <section className="view-stack">
              <div className="welcome-row">
                <div><p className="eyebrow">Painel do dia</p><h2>Organização para receber, ensinar e inspirar.</h2><p>Acompanhe o estoque e as próximas visitas em um só lugar.</p></div>
                <Button onClick={() => openNewVisit(today)}><CalendarDays />Agendar visita</Button>
              </div>
              <div className="stats-grid">
                <StatCard icon={Boxes} label="Itens ativos" value={activeItems.length} detail="equipamentos e materiais" />
                <StatCard icon={TriangleAlert} label="Estoque baixo" value={lowStockItems.length} detail="itens pedem atenção" tone="red" />
                <StatCard icon={CalendarDays} label="Visitas hoje" value={todayVisits.length} detail="grupos previstos" tone="amber" />
                <StatCard icon={Users} label="Público no mês" value={monthVisitors} detail="visitantes programados" tone="violet" />
              </div>
              <div className="dashboard-grid">
                <article className="panel">
                  <div className="panel-heading"><div><p className="eyebrow">Agenda</p><h3>Próximas visitas</h3></div><Button variant="ghost" size="sm" onClick={() => setView("agenda")}>Ver agenda <ArrowRight /></Button></div>
                  {upcomingVisits.length ? (
                    <div className="visit-list">
                      {upcomingVisits.map((visit) => (
                        <button className="visit-row" key={visit.id} onClick={() => { setSelectedDate(visit.visitDate); setView("agenda"); }}>
                          <span className="date-block"><strong>{parseDate(visit.visitDate).getDate()}</strong><small>{monthNames[parseDate(visit.visitDate).getMonth()].slice(0, 3)}</small></span>
                          <span className="visit-main"><strong>{visit.institution}</strong><small><Clock3 /> {visit.startTime}–{visit.endTime} · <Users /> {visit.visitors} pessoas</small></span>
                          <ChevronRight />
                        </button>
                      ))}
                    </div>
                  ) : <EmptyState icon={CalendarDays} title="Nenhuma visita programada" text="Use “Agendar visita” para incluir o próximo grupo." />}
                </article>
                <article className="panel">
                  <div className="panel-heading"><div><p className="eyebrow">Atenção</p><h3>Estoque baixo</h3></div><Button variant="ghost" size="sm" onClick={() => setView("estoque")}>Ver estoque <ArrowRight /></Button></div>
                  {lowStockItems.length ? (
                    <div className="low-stock-list">
                      {lowStockItems.slice(0, 6).map((item) => (
                        <div className="stock-alert" key={item.id}><span><TriangleAlert /></span><div><strong>{item.name}</strong><small>{item.category}</small></div><b>{item.quantity}<small> / mín. {item.minStock}</small></b></div>
                      ))}
                    </div>
                  ) : <EmptyState icon={CheckCircle2} title="Estoque em dia" text="Nenhum item está abaixo do nível mínimo." />}
                </article>
              </div>
            </section>
          )}

          {view === "estoque" && (
            <section className="view-stack">
              <div className="section-actions">
                <div><p className="eyebrow">Controle de materiais</p><h2>Estoque ativo</h2><p>Os itens repetidos são somados automaticamente quando nome e categoria coincidem.</p></div>
                <Button onClick={() => { setEditingItem(null); setItemDialog(true); }}><PackagePlus />Cadastrar item</Button>
              </div>
              <article className="panel table-panel">
                <div className="table-tools"><label className="search-box"><Search /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome ou categoria" /></label><Badge variant="secondary">{filteredItems.length} itens</Badge></div>
                {loading ? <div className="loading-line"><RefreshCw className="spin" />Carregando estoque...</div> : filteredItems.length ? (
                  <Table>
                    <TableHeader><TableRow><TableHead>Categoria</TableHead><TableHead>Item</TableHead><TableHead className="text-center">Saldo</TableHead><TableHead className="text-center">Mínimo</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => {
                        const low = item.quantity <= item.minStock;
                        return <TableRow key={item.id}><TableCell><span className="category-pill">{item.category}</span></TableCell><TableCell className="font-semibold">{item.name}</TableCell><TableCell className="text-center text-base font-bold">{item.quantity}</TableCell><TableCell className="text-center">{item.minStock}</TableCell><TableCell><Badge className={low ? "badge-low" : "badge-ok"}>{low ? "Estoque baixo" : "Disponível"}</Badge></TableCell><TableCell><div className="row-actions">{isAdmin ? <><Button variant="ghost" size="icon-sm" aria-label={`Editar ${item.name}`} onClick={() => { setEditingItem(item); setItemDialog(true); }}><Pencil /></Button><Button variant="ghost" size="icon-sm" aria-label={`Arquivar ${item.name}`} onClick={() => setArchiveTarget(item)}><Archive /></Button></> : <span className="operator-note">Somente consulta</span>}</div></TableCell></TableRow>;
                      })}
                    </TableBody>
                  </Table>
                ) : <EmptyState icon={Boxes} title={query ? "Nenhum item encontrado" : "Estoque ainda vazio"} text={query ? "Tente buscar por outro nome ou categoria." : "Cadastre o primeiro equipamento ou material do CEICIM."} />}
              </article>
            </section>
          )}

          {view === "movimentar" && (
            <section className="view-stack narrow-view">
              <div className="section-actions"><div><p className="eyebrow">Movimentação</p><h2>Entrada e saída de materiais</h2><p>Cada operação fica registrada no histórico.</p></div></div>
              <Tabs defaultValue="entrada" className="movement-tabs">
                <TabsList className="movement-tab-list"><TabsTrigger value="entrada"><ArrowDownToLine />Entrada</TabsTrigger><TabsTrigger value="saida"><ArrowUpFromLine />Saída</TabsTrigger></TabsList>
                <TabsContent value="entrada"><MovementForm type="entrada" items={activeItems} busy={busy} onSubmit={submitMovement} /></TabsContent>
                <TabsContent value="saida"><MovementForm type="saida" items={activeItems} busy={busy} onSubmit={submitMovement} /></TabsContent>
              </Tabs>
            </section>
          )}

          {view === "historico" && (
            <section className="view-stack">
              <div className="section-actions"><div><p className="eyebrow">Rastreabilidade</p><h2>Histórico de movimentações</h2><p>Entradas, saídas, edições e arquivamentos registrados em ordem cronológica.</p></div></div>
              <article className="panel table-panel">
                {pagedMovements.length ? (
                  <><Table><TableHeader><TableRow><TableHead>Data e hora</TableHead><TableHead>Ação</TableHead><TableHead>Item</TableHead><TableHead className="text-center">Quantidade</TableHead><TableHead>Destino / responsável</TableHead><TableHead>Registrado por</TableHead><TableHead>Observação</TableHead></TableRow></TableHeader><TableBody>
                    {pagedMovements.map((movement) => <TableRow key={movement.id}><TableCell>{formatDateTime(movement.createdAt)}</TableCell><TableCell><Badge className={`action-${movement.action}`}>{actionLabel(movement.action)}</Badge></TableCell><TableCell className="font-semibold">{movement.itemName}</TableCell><TableCell className="text-center font-semibold">{movement.quantity || "—"}</TableCell><TableCell>{movement.sector ? <span>{movement.sector}<small className="block text-muted-foreground">{movement.recipient}</small></span> : "—"}</TableCell><TableCell>{movement.actorName}</TableCell><TableCell className="max-w-[260px] whitespace-normal text-muted-foreground">{movement.notes || "—"}</TableCell></TableRow>)}
                  </TableBody></Table><div className="pagination"><Button variant="outline" size="sm" disabled={historyPage === 1} onClick={() => setHistoryPage((page) => page - 1)}><ChevronLeft />Anterior</Button><span>Página {historyPage} de {historyPages}</span><Button variant="outline" size="sm" disabled={historyPage === historyPages} onClick={() => setHistoryPage((page) => page + 1)}>Próxima<ChevronRight /></Button></div></>
                ) : <EmptyState icon={History} title="Nenhuma movimentação registrada" text="As operações do estoque aparecerão aqui automaticamente." />}
              </article>
            </section>
          )}

          {view === "agenda" && (
            <section className="view-stack">
              <div className="section-actions"><div><p className="eyebrow">Organização das visitas</p><h2>Agenda do CEICIM</h2><p>Visualize horários, grupos e quantidade de visitantes.</p></div><Button onClick={() => openNewVisit(selectedDate)}><CalendarDays />Nova visita</Button></div>
              <div className="agenda-layout">
                <article className="panel calendar-panel">
                  <div className="calendar-header"><div><strong>{monthNames[monthCursor.getMonth()]}</strong><span>{monthCursor.getFullYear()}</span></div><div><Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}><ChevronLeft /></Button><Button variant="outline" size="sm" onClick={() => setMonthCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Hoje</Button><Button variant="ghost" size="icon" aria-label="Próximo mês" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}><ChevronRight /></Button></div></div>
                  <div className="calendar-grid week-header">{weekNames.map((day) => <span key={day}>{day}</span>)}</div>
                  <div className="calendar-grid days-grid">
                    {monthDays.map(({ date, current }) => {
                      const key = dateKey(date);
                      const visits = data.visits.filter((visit) => visit.visitDate === key);
                      const isToday = key === today;
                      return <button key={key} className={`calendar-day ${current ? "" : "outside"} ${selectedDate === key ? "selected" : ""}`} onClick={() => setSelectedDate(key)}><span className={isToday ? "today-number" : ""}>{date.getDate()}</span><div className="calendar-events">{visits.slice(0, 2).map((visit) => <small key={visit.id} className={`event-${visit.status}`}>{visit.startTime} {visit.institution}</small>)}{visits.length > 2 && <small className="more-events">+{visits.length - 2} visita(s)</small>}</div></button>;
                    })}
                  </div>
                </article>
                <aside className="panel day-panel">
                  <div className="day-heading"><div><p className="eyebrow">Dia selecionado</p><h3>{formatDate(selectedDate)}</h3></div><Button variant="ghost" size="icon" onClick={() => openNewVisit(selectedDate)} aria-label="Adicionar visita"><PackagePlus /></Button></div>
                  {selectedVisits.length ? <div className="day-visits">{selectedVisits.map((visit) => <button key={visit.id} className="day-visit-card" onClick={() => { setEditingVisit(visit); setVisitStatus(visit.status); setVisitDialog(true); }}><div><span>{visit.startTime}–{visit.endTime}</span><Badge className={`visit-${visit.status}`}>{statusLabel(visit.status)}</Badge></div><strong>{visit.institution}</strong><small><Users /> {visit.visitors} · Resp. {visit.responsible}</small><Pencil /></button>)}</div> : <EmptyState icon={CalendarDays} title="Dia livre" text="Não há visitas marcadas nesta data." />}
                </aside>
              </div>
            </section>
          )}

          {view === "arquivados" && (
            <section className="view-stack">
              <div className="section-actions"><div><p className="eyebrow">Administração</p><h2>Itens arquivados</h2><p>Itens podem ser restaurados a qualquer momento. A exclusão definitiva só é liberada após 21 dias.</p></div></div>
              <article className="panel table-panel">
                {archivedItems.length ? <Table><TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Categoria</TableHead><TableHead className="text-center">Saldo</TableHead><TableHead>Arquivado em</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{archivedItems.map((item) => {
                  const canDelete = renderTime - (item.archivedAt ?? renderTime) >= 21 * 24 * 60 * 60 * 1000;
                  return <TableRow key={item.id}><TableCell className="font-semibold">{item.name}</TableCell><TableCell>{item.category}</TableCell><TableCell className="text-center">{item.quantity}</TableCell><TableCell>{item.archivedAt ? formatDateTime(item.archivedAt) : "—"}</TableCell><TableCell><div className="row-actions">{isAdmin ? <><Button variant="outline" size="sm" onClick={() => void runAction({ action: "unarchive_item", id: item.id })}><RotateCcw />Restaurar</Button><Button variant="ghost" size="icon-sm" disabled={!canDelete} title={canDelete ? "Excluir definitivamente" : "Disponível após 21 dias"} onClick={() => setDeleteTarget(item)}><Trash2 /></Button></> : <span className="operator-note">Somente consulta</span>}</div></TableCell></TableRow>;
                })}</TableBody></Table> : <EmptyState icon={Archive} title="Nenhum item arquivado" text="Os itens retirados do estoque ativo aparecerão aqui." />}
              </article>
            </section>
          )}
        </main>

        <footer className="app-footer">Sistema de Gestão do CEICIM <span>•</span> Desenvolvido por Samuel Ladeia</footer>
      </SidebarInset>

      <Dialog open={itemDialog} onOpenChange={(open) => { setItemDialog(open); if (!open) setEditingItem(null); }}>
        <DialogContent className="form-dialog">
          <DialogHeader><DialogTitle>{editingItem ? "Editar item" : "Cadastrar novo item"}</DialogTitle><DialogDescription>{editingItem ? "Corrija o nome, a categoria ou o nível mínimo." : "Se o item já existir na mesma categoria, a quantidade será somada."}</DialogDescription></DialogHeader>
          <form key={editingItem?.id ?? "new"} onSubmit={submitItem} className="form-grid">
            <label className="field full"><span>Nome do item</span><Input name="name" defaultValue={editingItem?.name} placeholder="Ex.: Cabo HDMI" required autoFocus /></label>
            <label className="field full"><span>Categoria</span><Input name="category" defaultValue={editingItem?.category} placeholder="Ex.: Cabos e adaptadores" required /></label>
            {!editingItem && <label className="field"><span>Quantidade inicial</span><Input name="quantity" type="number" min="0" defaultValue="1" required /></label>}
            <label className="field"><span>Estoque mínimo</span><Input name="minStock" type="number" min="0" defaultValue={editingItem?.minStock ?? 4} required /></label>
            <DialogFooter className="full"><Button type="button" variant="outline" onClick={() => setItemDialog(false)}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? "Salvando..." : editingItem ? "Salvar alterações" : "Cadastrar item"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={visitDialog} onOpenChange={(open) => { setVisitDialog(open); if (!open) setEditingVisit(null); }}>
        <DialogContent className="form-dialog visit-dialog">
          <DialogHeader><DialogTitle>{editingVisit?.id ? "Editar visita" : "Agendar nova visita"}</DialogTitle><DialogDescription>Registre o grupo e o período reservado para a visita.</DialogDescription></DialogHeader>
          <form key={editingVisit?.id ?? `new-${editingVisit?.visitDate}`} onSubmit={submitVisit} className="form-grid">
            <label className="field"><span>Data</span><Input name="visitDate" type="date" defaultValue={editingVisit?.visitDate ?? selectedDate} required /></label>
            <label className="field"><span>Situação</span><Select value={visitStatus} onValueChange={(value) => setVisitStatus(value as Visit["status"])}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="agendada">Agendada</SelectItem><SelectItem value="realizada">Realizada</SelectItem><SelectItem value="cancelada">Cancelada</SelectItem></SelectContent></Select></label>
            <label className="field"><span>Horário inicial</span><Input name="startTime" type="time" defaultValue={editingVisit?.startTime ?? "08:00"} required /></label>
            <label className="field"><span>Horário final</span><Input name="endTime" type="time" defaultValue={editingVisit?.endTime ?? "09:30"} required /></label>
            <label className="field full"><span>Escola ou instituição</span><Input name="institution" defaultValue={editingVisit?.institution} placeholder="Nome da escola ou grupo" required /></label>
            <label className="field"><span>Responsável pelo grupo</span><Input name="responsible" defaultValue={editingVisit?.responsible} placeholder="Nome do responsável" required /></label>
            <label className="field"><span>Número de visitantes</span><Input name="visitors" type="number" min="1" defaultValue={editingVisit?.visitors ?? 1} required /></label>
            <label className="field full"><span>Observações</span><Textarea name="notes" defaultValue={editingVisit?.notes ?? ""} placeholder="Informações importantes para a equipe" /></label>
            <DialogFooter className="full"><Button type="button" variant="outline" onClick={() => setVisitDialog(false)}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? "Salvando..." : editingVisit?.id ? "Salvar alterações" : "Agendar visita"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Arquivar {archiveTarget?.name}?</AlertDialogTitle><AlertDialogDescription>O item sairá do estoque ativo, mas poderá ser restaurado na página de arquivados.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => archiveTarget && void runAction({ action: "archive_item", id: archiveTarget.id }, () => setArchiveTarget(null))}>Arquivar item</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir definitivamente?</AlertDialogTitle><AlertDialogDescription>Esta ação removerá {deleteTarget?.name} do cadastro e não poderá ser desfeita. O histórico das movimentações será preservado.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => deleteTarget && void runAction({ action: "delete_archived_item", id: deleteTarget.id }, () => setDeleteTarget(null))}>Excluir item</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <Toaster richColors position="top-right" />
    </SidebarProvider>
  );
}

function MovementForm({ type, items, busy, onSubmit }: {
  type: "entrada" | "saida";
  items: Item[];
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>, type: "entrada" | "saida") => void;
}) {
  return (
    <article className="panel movement-card">
      <div className={`movement-heading ${type}`}><span>{type === "entrada" ? <ArrowDownToLine /> : <ArrowUpFromLine />}</span><div><h3>{type === "entrada" ? "Registrar entrada" : "Registrar saída"}</h3><p>{type === "entrada" ? "Aumente o saldo de um item existente." : "Informe também o destino e quem recebeu o material."}</p></div></div>
      <form onSubmit={(event) => onSubmit(event, type)} className="form-grid">
        <label className="field full"><span>Item do estoque</span><select name="itemId" className="native-select" required defaultValue=""><option value="" disabled>Selecione um item</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name} — saldo {item.quantity}</option>)}</select></label>
        <label className="field"><span>Quantidade</span><Input name="quantity" type="number" min="1" defaultValue="1" required /></label>
        {type === "saida" && <><label className="field"><span>Setor de destino</span><Input name="sector" placeholder="Ex.: Astronomia" required /></label><label className="field full"><span>Entregue para</span><Input name="recipient" placeholder="Nome de quem recebeu" required /></label></>}
        <label className="field full"><span>Observação</span><Textarea name="notes" placeholder="Opcional" /></label>
        <div className="full form-submit"><Button type="submit" disabled={busy || items.length === 0}>{busy ? "Registrando..." : type === "entrada" ? "Confirmar entrada" : "Confirmar saída"}</Button>{items.length === 0 && <small>Cadastre um item antes de registrar movimentações.</small>}</div>
      </form>
    </article>
  );
}
