import type React from 'react';
import { useMemo, useState } from 'react';
import {
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
  Zap,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';
import ThemeToggle from './ThemeToggle';

type ShellProps = {
  children: React.ReactNode;
};

type NavigationItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const navigation: NavigationItem[] = [
  { href: '/', label: '选股工作台', icon: LayoutDashboard },
  { href: '/chat', label: '策略问答', icon: MessageSquareText },
  { href: '/backtest', label: '策略回测', icon: FlaskConical },
  { href: '/settings', label: '系统配置', icon: Settings },
];

export const Shell: React.FC<ShellProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { authEnabled, loggedIn, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentNavigation = useMemo(
    () => navigation.find((item) => (item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href))) ?? navigation[0],
    [location.pathname],
  );

  const isCurrent = (href: string) => (href === '/' ? location.pathname === '/' : location.pathname.startsWith(href));

  const renderNav = (mobile = false) => (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-16 items-center border-b border-border px-4', !mobile && collapsed ? 'justify-center px-3' : 'justify-between')}>
        <button
          type="button"
          onClick={() => navigate('/')}
          className={cn('flex items-center gap-3 text-left', !mobile && collapsed && 'justify-center')}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Zap size={18} />
          </span>
          {mobile || !collapsed ? (
            <span>
              <span className="block text-sm font-semibold text-foreground">DSA Pro</span>
              <span className="block text-xs text-muted-foreground">Application workspace</span>
            </span>
          ) : null}
        </button>

        {mobile ? (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="inline-flex rounded-xl border border-border bg-background p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isCurrent(item.href);

          return (
            <button
              key={item.href}
              type="button"
              onClick={() => {
                navigate(item.href);
                setMobileMenuOpen(false);
              }}
              className={cn(
                'flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                collapsed && !mobile ? 'justify-center' : 'justify-start gap-3',
                active
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/15'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
              title={!mobile && collapsed ? item.label : undefined}
            >
              <Icon size={18} className={cn(active ? 'text-primary' : 'text-muted-foreground')} />
              {mobile || !collapsed ? <span>{item.label}</span> : null}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="space-y-3">
          {mobile || !collapsed ? (
            <div className="rounded-2xl border border-border bg-background px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Current</p>
              <p className="mt-1 text-sm font-medium text-foreground">{currentNavigation.label}</p>
            </div>
          ) : null}

          {!mobile ? (
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className={cn(
                'inline-flex h-10 items-center rounded-xl border border-border bg-background text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                collapsed ? 'w-full justify-center' : 'w-full justify-start gap-2 px-3',
              )}
              title={collapsed ? '展开侧栏' : '折叠侧栏'}
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              {!collapsed ? <span>收起侧栏</span> : null}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      <div className="hidden md:fixed md:inset-y-0 md:z-40 md:flex">
        <aside className={cn('border-r border-border bg-card/95 backdrop-blur transition-all duration-200', collapsed ? 'w-20' : 'w-72')}>
          {renderNav(false)}
        </aside>
      </div>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm dark:bg-slate-950/45" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[88vw] max-w-xs border-r border-border bg-card shadow-2xl">{renderNav(true)}</aside>
        </div>
      ) : null}

      <div className={cn('min-h-screen', collapsed ? 'md:pl-20' : 'md:pl-72')}>
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex rounded-xl border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
              >
                <Menu size={16} />
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
                <p className="text-sm font-medium text-foreground">{currentNavigation.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <ThemeToggle />
              <span className="hidden rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
                Admin
              </span>
              {authEnabled && loggedIn ? (
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  title="退出登录"
                >
                  <LogOut size={16} />
                  <span className="ml-2 hidden sm:inline">退出登录</span>
                </button>
              ) : null}
            </div>
          </div>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
};
