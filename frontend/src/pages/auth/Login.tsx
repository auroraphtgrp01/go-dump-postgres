import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { isAuthenticated } from "../../utils/auth";
import Toast from "../../components/Toast";

export default function Login() {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const navigate = useNavigate();

    // Redirect if already logged in
    useEffect(() => {
        if (isAuthenticated()) {
            navigate('/');
        }
    }, [navigate]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        
        // Hiển thị thông báo loading
        const loadingMessage = Toast.loading('Đang đăng nhập...');
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });
            
            // Đóng thông báo loading
            loadingMessage();
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Save auth token
                    localStorage.setItem('auth_token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    // Hiển thị thông báo thành công rõ ràng
                    Toast.success('Đăng nhập thành công!');
                    
                    // Đợi 1 giây cho người dùng thấy thông báo trước khi chuyển trang
                    setTimeout(() => {
                        navigate('/');
                    }, 1000);
                } else {
                    Toast.error(data.message || 'Đăng nhập thất bại');
                }
            } else {
                Toast.error('Đăng nhập thất bại');
            }
        } catch (error) {
            console.error('Login error:', error);
            // Đóng thông báo loading nếu có lỗi (phòng trường hợp chưa đóng)
            loadingMessage();
            Toast.error('Lỗi kết nối máy chủ');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-violet-50 dark:from-slate-900 dark:to-slate-800 p-4">
            <div className="w-full max-w-md">
                <Card className="border-none shadow-xl backdrop-blur-sm bg-white/90 dark:bg-slate-900/90">
                    <CardHeader className="space-y-2 text-center pb-6">
                        <div className="mx-auto bg-primary/10 p-2 rounded-full w-12 h-12 flex items-center justify-center mb-2">
                            <User className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight">Đăng nhập</CardTitle>
                        <CardDescription>
                            Nhập thông tin đăng nhập của bạn để tiếp tục
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-sm font-medium">Tên đăng nhập</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="username"
                                        placeholder="Tên đăng nhập"
                                        type="text"
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        className="pl-10 h-10 transition-all focus:ring-2 focus:ring-primary/20"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium">Mật khẩu</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        placeholder="••••••••"
                                        type={showPassword ? "text" : "password"}
                                        className="pl-10 pr-10 h-10 transition-all focus:ring-2 focus:ring-primary/20"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-10 transition-all hover:shadow-md"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-background border-t-transparent rounded-full"></div>
                                        <span>Đang đăng nhập...</span>
                                    </div>
                                ) : "Đăng nhập"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
