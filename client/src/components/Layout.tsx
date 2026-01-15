import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  LogOut, 
  LayoutDashboard, 
  PieChart, 
  TrendingUp,
  Database,
  Settings,
  Activity,
  ChevronRight,
  Lightbulb
} from "lucide-react";
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from "@/components/ui/sidebar";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const menuItems = [
    { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard" },
    { title: "Models", icon: Database, url: "/repository" },
    { title: "Analysis", icon: TrendingUp, url: "/analysis" },
    { title: "Portfolio", icon: PieChart, url: "/portfolio" },
    { title: "Executive Insights", icon: Lightbulb, url: "/insights" },
  ];

  const adminItems = [
    { title: "Settings", icon: Settings, url: "/settings" },
  ];

  const style = {
    "--sidebar-width": "260px",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background">
        <Sidebar className="border-r border-border/50 bg-card/50 backdrop-blur-xl">
          <SidebarHeader className="p-5 border-b border-border/50">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight">Bottomline</span>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Financial Modeling</p>
              </div>
            </Link>
          </SidebarHeader>

          <SidebarContent className="px-3 py-6">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">Navigation</p>
              <SidebarMenu>
                {menuItems.map((item) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive}
                        className={`h-11 rounded-xl px-3 font-medium text-sm transition-all duration-200 ${
                          isActive 
                            ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' 
                            : 'text-muted-foreground hover:bg-muted dark:hover:bg-white/5 hover:text-foreground'
                        }`}
                      >
                        <Link href={item.url}>
                          <item.icon className={`h-4 w-4 mr-3 ${isActive ? 'text-primary' : ''}`} />
                          <span className="flex-1">{item.title}</span>
                          {isActive && <ChevronRight className="h-4 w-4 text-primary/60" />}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </div>

            <div className="mt-10 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">System</p>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      className="h-11 rounded-xl px-3 font-medium text-sm text-muted-foreground hover:bg-muted dark:hover:bg-white/5 hover:text-foreground transition-all duration-200"
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4 mr-3" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-border/50 mt-auto">
            <div className="bg-muted/50 dark:bg-muted/30 border border-border/50 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary font-semibold text-sm">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{user?.firstName} {user?.lastName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">Premium Account</p>
                </div>
                <Button 
                  onClick={() => logout()} 
                  variant="ghost" 
                  size="icon"
                  className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-white/10"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
          <div className="flex-1 overflow-auto">
            <div className="p-8 max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
