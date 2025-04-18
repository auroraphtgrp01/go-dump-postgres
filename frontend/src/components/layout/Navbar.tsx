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
import { Menu, User, LogOut, Database, Settings, LayoutDashboard, Users } from "lucide-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <header className="bg-white dark:bg-gray-950 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 flex justify-between items-center h-16">
        <Link to="/" className="flex items-center gap-2">
          <Database className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">PostgreSQL Backup</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {isLoggedIn && (
            <>
              <Link to="/" className="text-sm font-medium text-gray-700 hover:text-primary dark:text-gray-300 dark:hover:text-primary transition flex items-center gap-1">
                <LayoutDashboard className="h-4 w-4" />
                <span>Trang chủ</span>
              </Link>
              <Link to="/settings" className="text-sm font-medium text-gray-700 hover:text-primary dark:text-gray-300 dark:hover:text-primary transition flex items-center gap-1">
                <Settings className="h-4 w-4" />
                <span>Cấu hình</span>
              </Link>
              <Link to="/profiles" className="text-sm font-medium text-gray-700 hover:text-primary dark:text-gray-300 dark:hover:text-primary transition flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>Profiles</span>
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative rounded-full h-8 w-8 p-0">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm font-medium">
                  {username}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigateTo('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Cấu hình</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigateTo('/profiles')}>
                  <Users className="mr-2 h-4 w-4" />
                  <span>Profiles</span>
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

          <button
            className="md:hidden p-2 text-gray-500 hover:text-primary transition"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-white dark:bg-gray-950 border-t dark:border-gray-800 py-4 px-4">
          <nav className="flex flex-col space-y-3">
            {isLoggedIn && (
              <>
                <Link
                  to="/"
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary dark:text-gray-300"
                  onClick={() => setIsOpen(false)}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Trang chủ</span>
                </Link>
                <Link
                  to="/settings"
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary dark:text-gray-300"
                  onClick={() => setIsOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  <span>Cấu hình</span>
                </Link>
                <Link
                  to="/profiles"
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary dark:text-gray-300"
                  onClick={() => setIsOpen(false)}
                >
                  <Users className="h-4 w-4" />
                  <span>Profiles</span>
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600 dark:text-red-400"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Đăng xuất</span>
                </button>
              </>
            )}

            {!isLoggedIn && (
              <Link
                to="/auth/login"
                className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
                onClick={() => setIsOpen(false)}
              >
                <User className="h-4 w-4" />
                <span>Đăng nhập</span>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar; 