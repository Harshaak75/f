import { useEffect, useState } from "react";
import { Search, Bell, User, Menu } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { useAuth } from "../../AuthContext";
import { NotificationAPI } from "../../utils/api/admin.notification";

export function Topbar() {
  const { user } = useAuth(); // 🔥 Fetch logged-in user
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await NotificationAPI.getMy();
        setNotifications(data);
      } catch (e) {
        console.error("Failed to load notifications", e);
      }
    }
    load();
  }, []);

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "U";

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6">
      {/* LEFT */}
      <div className="flex items-center gap-4 flex-1">
        <div className="text-sm text-muted-foreground">Dashboard</div>

        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <Input
            placeholder="Search employees, assets..."
            className="pl-10 bg-secondary border-0"
          />
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-3">
        {/* 🔔 Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell size={20} />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">
                  No notifications
                </div>
              )}

              {notifications.map((n: any) => (
                <div
                  key={n.id}
                  className="p-3 hover:bg-secondary cursor-pointer border-b"
                >
                  <div className="font-medium text-sm">{n.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {n.message}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 👤 User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                {initials}
              </div>

              <div className="hidden md:block text-left">
                <div className="text-sm font-medium">
                  {user?.name ?? "Unknown User"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {user?.role ?? "Role"}
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => (window.location.href = "/admin/profile")}
            >
              <User size={16} className="mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
