import { useState } from 'react';
import { Search, Bell, Plus, User, Settings, LogOut, Menu } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';

export function Topbar() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 gap-4">
      {/* Left: Breadcrumbs & Search */}
      <div className="flex items-center gap-4 flex-1">
        <div className="text-sm text-muted-foreground">
          Dashboard
        </div>
        
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Search employees, assets... (Ctrl+K)"
            className="pl-10 bg-secondary border-0"
            onFocus={() => setSearchOpen(true)}
          />
        </div>
      </div>

      {/* Right: Actions & User Menu */}
      <div className="flex items-center gap-3">
        {/* Quick Create */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="sm" className="gap-2">
              <Plus size={16} />
              <span className="hidden sm:inline">New</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <Plus size={16} className="mr-2" />
              Employee
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Plus size={16} className="mr-2" />
              Leave Request
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Plus size={16} className="mr-2" />
              Payroll Run
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell size={20} />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                3
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-96 overflow-y-auto">
              <div className="p-3 hover:bg-secondary cursor-pointer border-b">
                <div className="font-medium text-sm">Pending Leave Approval</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Rajesh Kumar has applied for leave
                </div>
                <div className="text-xs text-muted-foreground mt-1">2 hours ago</div>
              </div>
              <div className="p-3 hover:bg-secondary cursor-pointer border-b">
                <div className="font-medium text-sm">Payroll Due</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Monthly payroll processing due in 3 days
                </div>
                <div className="text-xs text-muted-foreground mt-1">5 hours ago</div>
              </div>
              <div className="p-3 hover:bg-secondary cursor-pointer">
                <div className="font-medium text-sm">New Employee Joined</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Vikram Singh joined Engineering team
                </div>
                <div className="text-xs text-muted-foreground mt-1">1 day ago</div>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                PS
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium">Priya Sharma</div>
                <div className="text-xs text-muted-foreground">HR Manager</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User size={16} className="mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings size={16} className="mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <LogOut size={16} className="mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
