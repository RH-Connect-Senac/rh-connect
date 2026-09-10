/** RH Connect — Header Popovers: Account Menu & Notification Dropdown */

import { useState, useRef, useEffect } from "react";
import { Bell, User, Settings, LogOut, CheckCheck } from "lucide-react";

type NavFn = (s: string) => void;

// ─── Types ────────────────────────────────────────────────────────────────────

export type AccountConfig = {
  name: string;
  email: string;
  initials: string;
  avatarClass: string;
  profileLabel: string;
  profileScreen: string;
  settingsScreen: string;
};

export type NotifItem = {
  id: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  screen?: string;
};

export type NotifConfig = {
  items: NotifItem[];
  viewAllScreen?: string;
};

// ─── Per-profile configs ──────────────────────────────────────────────────────

export const CANDIDATE_ACCOUNT: AccountConfig = {
  name: "João Lima",
  email: "joao.lima@gmail.com",
  initials: "JL",
  avatarClass: "bg-gradient-to-br from-blue-500 to-blue-700",
  profileLabel: "Meu perfil",
  profileScreen: "profile",
  settingsScreen: "settings",
};

export const EVAL_ACCOUNT: AccountConfig = {
  name: "Carlos Andrade",
  email: "carlos.andrade@gmail.com",
  initials: "CA",
  avatarClass: "bg-gradient-to-br from-teal-500 to-teal-700",
  profileLabel: "Minha conta",
  profileScreen: "eval-settings",
  settingsScreen: "eval-settings",
};

export const ADMIN_ACCOUNT: AccountConfig = {
  name: "Ana Martins",
  email: "ana.martins@gmail.com",
  initials: "AM",
  avatarClass: "bg-gradient-to-br from-violet-500 to-violet-700",
  profileLabel: "Minha conta",
  profileScreen: "admin-settings",
  settingsScreen: "admin-settings",
};

export const CANDIDATE_NOTIFS: NotifItem[] = [
  { id: "n1", title: "Avaliação concluída",     desc: "Sua entrevista para Desenvolvedor Full Stack foi avaliada.", time: "Agora",   unread: true,  screen: "report" },
  { id: "n2", title: "Feedback disponível",      desc: "Confira o relatório detalhado do seu desempenho.",       time: "2h",     unread: true,  screen: "report" },
  { id: "n3", title: "Entrevista atualizada",    desc: "Status da entrevista para Dev Full Stack foi alterado.", time: "Ontem",  unread: false, screen: "pending" },
  { id: "n4", title: "Aviso da plataforma",      desc: "Novas vagas disponíveis nas áreas oficiais da V1.",      time: "2 dias", unread: false },
];

export const EVAL_NOTIFS: NotifItem[] = [
  { id: "n1", title: "Nova avaliação atribuída", desc: "Fernanda Oliveira — Desenvolvedor Full Stack.",         time: "Agora",   unread: true,  screen: "eval-queue" },
  { id: "n2", title: "Prazo se aproximando",     desc: "Avaliação #E-0040 vence em 24 horas.",                 time: "3h",     unread: true,  screen: "eval-queue" },
  { id: "n3", title: "Critérios atualizados",    desc: "Os critérios de Comunicação foram revisados.",         time: "Ontem",  unread: false, screen: "eval-criteria" },
  { id: "n4", title: "Aviso administrativo",     desc: "Manutenção programada nesta sexta às 22h.",            time: "2 dias", unread: false },
];

export const ADMIN_NOTIFS: NotifItem[] = [
  { id: "n1", title: "Convite aceito",               desc: "Beatriz Lima ativou sua conta de avaliadora.",     time: "Agora",   unread: true,  screen: "admin-evaluators" },
  { id: "n2", title: "Entrevista sem atribuição",    desc: "#E-0041 aguarda um avaliador há 6 horas.",         time: "6h",     unread: true,  screen: "admin-assign" },
  { id: "n3", title: "Novo candidato registrado",   desc: "Lucas Ferreira concluiu o cadastro.",              time: "Ontem",  unread: false, screen: "admin-candidates" },
  { id: "n4", title: "Aviso do sistema",             desc: "Backup automático realizado com sucesso.",         time: "2 dias", unread: false, screen: "admin-audit" },
];

// ─── Hook: click outside ──────────────────────────────────────────────────────

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [enabled, onClose, ref]);
}

// ─── AccountDropdown ──────────────────────────────────────────────────────────

export function AccountDropdown({ config, onNavigate }: { config: AccountConfig; onNavigate: NavFn }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const go = (screen: string) => { setOpen(false); onNavigate(screen); };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-8 h-8 ${config.avatarClass} rounded-full flex items-center justify-center text-white text-xs font-bold transition-all ${open ? "ring-2 ring-white/40" : "hover:ring-2 hover:ring-white/30"}`}
        title={config.name}
      >
        {config.initials}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* User info */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 ${config.avatarClass} rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                {config.initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{config.name}</p>
                <p className="text-xs text-muted-foreground truncate">{config.email}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-1.5 space-y-0.5">
            <button onClick={() => go(config.profileScreen)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-foreground hover:bg-muted transition-colors text-left">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              {config.profileLabel}
            </button>
            <button onClick={() => go(config.settingsScreen)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-foreground hover:bg-muted transition-colors text-left">
              <Settings className="w-4 h-4 text-muted-foreground shrink-0" />
              Configurações
            </button>
          </div>

          {/* Logout */}
          <div className="p-1.5 border-t border-border">
            <button onClick={() => { setOpen(false); onNavigate("auth"); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
              <LogOut className="w-4 h-4 shrink-0" />
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NotificationDropdown ─────────────────────────────────────────────────────

export function NotificationDropdown({ notifs, viewAllScreen, onNavigate }: {
  notifs: NotifItem[];
  viewAllScreen?: string;
  onNavigate: NavFn;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(notifs);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const unreadCount = items.filter(n => n.unread).length;

  const markAllRead = () => setItems(prev => prev.map(n => ({ ...n, unread: false })));

  const handleItem = (item: NotifItem) => {
    setItems(prev => prev.map(n => n.id === item.id ? { ...n, unread: false } : n));
    if (item.screen) { setOpen(false); onNavigate(item.screen); }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative p-2 text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-muted ${open ? "bg-muted text-foreground" : ""}`}
        title="Notificações"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-[9px] text-white font-bold leading-none px-0.5">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden max-h-[420px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <p className="text-sm font-bold text-foreground">Notificações</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-blue-700 font-semibold transition-colors">
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar como lidas
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Você não possui novas notificações.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {items.map(item => (
                  <button key={item.id} onClick={() => handleItem(item)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-3 ${item.unread ? "bg-blue-50/60" : ""}`}>
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 transition-colors"
                      style={{ backgroundColor: item.unread ? "rgb(59 130 246)" : "transparent", border: item.unread ? "none" : "1.5px solid #cbd5e1" }} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold truncate ${item.unread ? "text-foreground" : "text-muted-foreground"}`}>{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{item.desc}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{item.time}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {viewAllScreen && (
            <div className="border-t border-border shrink-0">
              <button onClick={() => { setOpen(false); onNavigate(viewAllScreen); }}
                className="w-full px-4 py-3 text-xs font-semibold text-primary hover:text-blue-700 hover:bg-muted/30 transition-colors text-center">
                Ver todas as notificações
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
