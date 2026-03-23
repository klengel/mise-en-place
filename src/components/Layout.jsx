import { NavLink, Outlet } from 'react-router-dom';
import { BookOpen, CalendarDays, Calendar, Sparkles, Settings, ChefHat, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { to: '/', icon: BookOpen, label: 'Recipe Library' },
  { to: '/daily', icon: CalendarDays, label: 'Daily Planning' },
  { to: '/weekly', icon: Calendar, label: 'Weekly Planning' },
  { to: '/cleaning', icon: Sparkles, label: 'Cleaning Tasks' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-card border-r border-border shrink-0">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <ChefHat className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground leading-tight">Mise en Place</p>
            <p className="text-xs text-muted-foreground">AI Kitchen</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User / logout */}
        <div className="px-3 py-3 border-t border-border">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-primary">
                {user?.email?.[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate flex-1">{user?.email}</p>
            <button
              onClick={signOut}
              title="Sign out"
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex justify-around px-2 py-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn('flex flex-col items-center gap-1 px-2 py-1 rounded-lg text-xs',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            <Icon className="w-5 h-5" />
            <span className="hidden sm:block">{label.split(' ')[0]}</span>
          </NavLink>
        ))}
        <button
          onClick={signOut}
          className="flex flex-col items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground"
        >
          <LogOut className="w-5 h-5" />
          <span className="hidden sm:block">Logout</span>
        </button>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}