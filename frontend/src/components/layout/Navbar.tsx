import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isAuthenticated, getUser, logout } from "@/utils/auth";
import { User, LogOut, Database, Settings, Github } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      const auth = isAuthenticated();
      setIsLoggedIn(auth);

      if (auth) {
        const user = getUser();
        if (user) {
          setUsername(user.username);
        }
      }
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const navigateTo = (path: string) => {
    navigate(path);
  };

  const navigateToGithub = () => {
    window.open('https://github.com/auroraphtgrp01', '_blank');
  };

  return (
    <header className="bg-white/50 dark:bg-zinc-900/50 shadow-sm sticky top-0 z-50 backdrop-blur-md">
      <div className="container mx-auto px-4 flex justify-between items-center h-16">
        <Link to="/" className="flex items-center gap-2">
          <Database className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">PostgreSQL Dump</span>
        </Link>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={navigateToGithub}
            title="GitHub"
          >
            <Github className="h-5 w-5" />
          </Button>
          
          <ModeToggle />

          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost"  className="p-3">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm font-medium text-center">
                  {username}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer focus:text-indigo-400" onClick={() => {
                  navigateTo('/settings');
                }}>
                  <Settings className="h-4 w-4 mr-2" />
                  <span>Cấu hình</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-red-500 focus:text-red-500" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => navigateTo('/auth/login')} size="sm">
              Đăng nhập
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar; 