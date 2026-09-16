import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight, LogOut, Menu, X } from "lucide-react";
import compactLogo from "../../../assets/brand/logo-rh.svg";
import { RHConnectLogo } from "../brand/rh-connect-logo";
import { AccountDropdown, NotificationDropdown } from "../header-popovers";

type ProfileShellAccount = ComponentProps<typeof AccountDropdown>["config"];
type ProfileShellNotifications = ComponentProps<typeof NotificationDropdown>["notifs"];

export type ProfileShellNavItem = {
  icon: LucideIcon;
  label: string;
  screen: string;
};

type ProfileShellProps = {
  current: string;
  navItems: ProfileShellNavItem[];
  profileLabel: string;
  account: ProfileShellAccount;
  notifications: ProfileShellNotifications;
  notificationViewAllScreen?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  onNavigate: (screen: string) => void;
};

function getInitialCollapsedState() {
  const saved = sessionStorage.getItem("sb-collapsed");

  if (saved) {
    return saved === "1";
  }

  return window.matchMedia("(min-width: 1024px) and (max-width: 1365px)").matches;
}

function ProfileSidebarContent({
  current,
  navItems,
  profileLabel,
  account,
  collapsed,
  isMobile = false,
  onNavigate,
  onClose,
  onToggleCollapse,
}: {
  current: string;
  navItems: ProfileShellNavItem[];
  profileLabel: string;
  account: ProfileShellAccount;
  collapsed: boolean;
  isMobile?: boolean;
  onNavigate: (screen: string) => void;
  onClose: () => void;
  onToggleCollapse: () => void;
}) {
  const [showLogout, setShowLogout] = useState(false);

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden" style={{ backgroundColor: "#021025" }}>
      {showLogout && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(15,38,82,0.92)" }}>
          <div className="w-full max-w-[240px] rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <LogOut className="h-6 w-6 text-red-500" />
            </div>
            <p className="mb-1 text-sm font-bold text-foreground">Sair da conta?</p>
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">Você precisará fazer login novamente para acessar o sistema.</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowLogout(false);
                  onNavigate("auth");
                }}
                className="w-full rounded-xl bg-red-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
              >
                Sair
              </button>
              <button
                type="button"
                onClick={() => setShowLogout(false)}
                className="w-full rounded-xl bg-muted py-2 text-sm font-semibold text-foreground transition-colors hover:bg-slate-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`flex items-center border-b border-white/10 ${collapsed ? "justify-center px-2 py-4" : "px-5 py-4"}`}>
        {collapsed ? (
          <img
            src={compactLogo}
            alt="RH"
            className="h-10 w-10 shrink-0 object-contain"
            draggable={false}
          />
        ) : (
          <div className={isMobile ? "flex min-w-0 flex-1 items-center justify-between gap-3" : "flex min-w-0 flex-col gap-0.5"}>
            <div className={isMobile ? "flex min-w-[160px] flex-col gap-0.5 overflow-hidden" : "flex min-w-0 flex-col gap-0.5"}>
              <RHConnectLogo variant="inverse" className="h-7 w-auto max-w-[150px]" />
              <p className="text-[11px] text-white/40">{profileLabel}</p>
            </div>

            {isMobile && (
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                aria-label="Fechar menu"
                title="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden p-3">
        {navItems.map((item) => {
          const active = current === item.screen;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                onNavigate(item.screen);
                onClose();
              }}
              title={collapsed ? item.label : undefined}
              className={`flex w-full items-center overflow-hidden rounded-xl text-left text-sm font-medium transition-all
                ${collapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2.5"}
                ${active ? "bg-white/15 text-white" : "text-white/55 hover:bg-white/10 hover:text-white/80"}`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
              {active && !collapsed && <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />}
            </button>
          );
        })}
      </nav>

      {!isMobile && (
        <div className="shrink-0 border-t border-white/10 p-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? "Expandir menu" : undefined}
            className={`flex w-full items-center overflow-hidden rounded-xl py-2 text-white/40 transition-all duration-[220ms] hover:bg-white/10 hover:text-white/70
              ${collapsed ? "justify-center px-2" : "gap-2 px-3"}`}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs">Recolher menu</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className={`shrink-0 overflow-hidden border-t border-white/10 p-3 ${collapsed ? "flex justify-center" : ""}`}>
        {collapsed ? (
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${account.avatarClass}`}>
            {account.initials}
          </div>
        ) : (
          <div className="flex items-center gap-3 px-2">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${account.avatarClass}`}>
              {account.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{account.name}</p>
              <p className="truncate text-xs text-white/40">{account.email}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowLogout(true)}
              className="shrink-0 text-white/30 transition-colors hover:text-white/60"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileTopBar({
  title,
  subtitle,
  actions,
  account,
  notifications,
  notificationViewAllScreen,
  onNavigate,
  onOpenMenu,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  account: ProfileShellAccount;
  notifications: ProfileShellNotifications;
  notificationViewAllScreen?: string;
  onNavigate: (screen: string) => void;
  onOpenMenu: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-white px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Abrir menu"
          title="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-foreground sm:text-lg">{title}</h1>
          {subtitle && <p className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">{subtitle}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {actions && <div className="hidden items-center gap-2 sm:flex">{actions}</div>}
        <NotificationDropdown
          notifs={notifications}
          viewAllScreen={notificationViewAllScreen}
          onNavigate={onNavigate}
        />
        <AccountDropdown config={account} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

export function ProfileShell({
  current,
  navItems,
  profileLabel,
  account,
  notifications,
  notificationViewAllScreen,
  title,
  subtitle,
  actions,
  children,
  onNavigate,
}: ProfileShellProps) {
  const [collapsed, setCollapsed] = useState(getInitialCollapsedState);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed((currentCollapsed) => {
      sessionStorage.setItem("sb-collapsed", currentCollapsed ? "0" : "1");
      return !currentCollapsed;
    });
  };

  useEffect(() => {
    if (!drawerOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const closeDrawerOnDesktop = () => {
      if (mediaQuery.matches) {
        setDrawerOpen(false);
      }
    };

    closeDrawerOnDesktop();
    mediaQuery.addEventListener("change", closeDrawerOnDesktop);

    return () => {
      mediaQuery.removeEventListener("change", closeDrawerOnDesktop);
    };
  }, [drawerOpen]);

  return (
    <div className="relative min-h-dvh w-full lg:flex">
      <div
        className={`relative z-30 hidden h-dvh shrink-0 self-start overflow-hidden transition-[width] duration-[220ms] ease-in-out lg:sticky lg:top-0 lg:block ${
          collapsed ? "w-16" : "w-60"
        }`}
        style={{ backgroundColor: "#021025" }}
      >
        <aside
          className={`flex h-full min-h-0 w-full flex-col overflow-hidden ${collapsed ? "" : "shadow-2xl"}`}
          style={{ backgroundColor: "#021025" }}
        >
          <ProfileSidebarContent
            current={current}
            navItems={navItems}
            profileLabel={profileLabel}
            account={account}
            collapsed={collapsed}
            onNavigate={onNavigate}
            onClose={() => {}}
            onToggleCollapse={toggleCollapsed}
          />
        </aside>
      </div>

      <div
        aria-hidden={!drawerOpen}
        onClick={() => setDrawerOpen(false)}
        className={`fixed inset-0 top-0 z-40 bg-black/50 backdrop-blur-[1px] transition-opacity duration-200 lg:hidden ${drawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <aside
        className={`fixed bottom-0 left-0 top-0 z-50 flex w-[min(280px,85vw)] flex-col overflow-hidden bg-[#021025] shadow-2xl transition-transform duration-[220ms] ease-out lg:hidden ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <ProfileSidebarContent
          current={current}
          navItems={navItems}
          profileLabel={profileLabel}
          account={account}
          collapsed={false}
          isMobile
          onNavigate={onNavigate}
          onClose={() => setDrawerOpen(false)}
          onToggleCollapse={() => {}}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <ProfileTopBar
          title={title}
          subtitle={subtitle}
          actions={actions}
          account={account}
          notifications={notifications}
          notificationViewAllScreen={notificationViewAllScreen}
          onNavigate={onNavigate}
          onOpenMenu={() => setDrawerOpen(true)}
        />
        <main className="min-w-0 flex-1 overflow-x-hidden bg-background p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
