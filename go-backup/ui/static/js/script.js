/**
 * Hệ thống quản lý xác thực client-side
 */

// Hàm kiểm tra trạng thái đăng nhập
function isAuthenticated() {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('user');
    return !!token && !!user;
}

// Hàm lấy thông tin người dùng từ server
async function fetchUserInfo() {
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) return null;

        const response = await fetch('/me', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
                // Lưu thông tin user vào localStorage
                localStorage.setItem('user', JSON.stringify(data.user));
                return data.user;
            }
        }
        return null;
    } catch (error) {
        console.error("Lỗi khi lấy thông tin người dùng:", error);
        return null;
    }
}

// Biến toàn cục để theo dõi quá trình xác thực
let authCheckInProgress = false;

// Hàm đồng bộ thông tin xác thực
async function syncAuthState() {
    // Nếu chưa đăng nhập, không cần đồng bộ
    if (!localStorage.getItem('auth_token')) {
        return false;
    }

    // Nếu thiếu thông tin user, thử lấy từ server
    if (!localStorage.getItem('user')) {
        const user = await fetchUserInfo();
        return !!user;
    }

    return true;
}

// Lấy giá trị cookie theo tên
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Đăng xuất
async function logout() {
    try {
        const token = localStorage.getItem('auth_token');
        
        // Gọi API đăng xuất
        await fetch('/logout', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
    } catch (error) {
        console.error('Lỗi khi đăng xuất:', error);
    } finally {
        // Xóa dữ liệu xác thực client-side dù có lỗi hay không
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        
        // Chuyển về trang đăng nhập
        window.location.href = '/login';
    }
}

// Thiết lập trạng thái UI dựa trên trạng thái đăng nhập
function setupAuthUI() {
    const isLoggedIn = isAuthenticated();
    const userSection = document.getElementById('logged-in');
    const loginSection = document.getElementById('logged-out');
    
    if (!userSection || !loginSection) {
        console.log("Các phần tử UI xác thực không tồn tại trong trang này");
        return;
    }
    
    if (isLoggedIn) {
        // Đã đăng nhập, hiển thị phần logged-in
        userSection.classList.remove('d-none');
        loginSection.classList.add('d-none');
        
        // Hiển thị tên người dùng
        const user = JSON.parse(localStorage.getItem('user'));
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay && user && user.username) {
            usernameDisplay.textContent = user.username;
        }
        
        // Bật các phần tử yêu cầu xác thực
        document.querySelectorAll('.auth-required-form button').forEach(btn => {
            btn.disabled = false;
        });
    } else {
        // Chưa đăng nhập, hiển thị phần logged-out
        userSection.classList.add('d-none');
        loginSection.classList.remove('d-none');
        
        // Tắt các phần tử yêu cầu xác thực
        document.querySelectorAll('.auth-required-form button').forEach(btn => {
            btn.disabled = true;
        });
    }
}

// Thiết lập trình xử lý sự kiện đăng xuất
function setupLogoutHandler() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
}

// Thiết lập xác thực cho toàn bộ trang
async function initAuth() {
    // Tránh chạy nhiều lần đồng thời
    if (authCheckInProgress) {
        console.log('Auth check already in progress, skipping');
        return true; // Trả về true để tránh redirect loop
    }
    
    authCheckInProgress = true;
    
    try {
        // Đồng bộ trạng thái xác thực
        const isLoggedIn = await syncAuthState();
        
        // Cập nhật UI
        setupAuthUI();
        
        // Thiết lập sự kiện đăng xuất
        setupLogoutHandler();
        
        // Không chuyển hướng từ phía client, để server kiểm soát
        return true;
    } catch (error) {
        console.error('Error during auth initialization:', error);
        return true; // Trả về true để tránh redirect khi có lỗi
    } finally {
        // Đảm bảo luôn reset flag
        authCheckInProgress = false;
    }
}

// Khởi tạo xác thực khi trang tải
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing authentication...');
    await initAuth();
    // Không thực hiện chuyển hướng ở đây - để server kiểm soát việc này
});

// JavaScript for the backup application
document.addEventListener('DOMContentLoaded', function() {
    // Tự động đóng thông báo alert sau 5 giây
    const alerts = document.querySelectorAll('.alert');
    if (alerts.length > 0) {
        setTimeout(function() {
            alerts.forEach(function(alert) {
                const closeButton = alert.querySelector('.btn-close');
                if (closeButton) {
                    closeButton.click();
                }
            });
        }, 5000);
    }

    // Thêm xác nhận trước khi upload tất cả
    const uploadAllForm = document.querySelector('form[action="/upload-all"]');
    if (uploadAllForm) {
        uploadAllForm.addEventListener('submit', function(e) {
            if (!confirm('Bạn có chắc chắn muốn upload tất cả các file backup lên Google Drive?')) {
                e.preventDefault();
            }
        });
    }

    // Format file size ở UI
    const fileSizeCells = document.querySelectorAll('td:nth-child(3)');
    fileSizeCells.forEach(function(cell) {
        const sizeInBytes = parseInt(cell.textContent);
        if (!isNaN(sizeInBytes)) {
            if (sizeInBytes < 1024) {
                cell.textContent = sizeInBytes + ' B';
            } else if (sizeInBytes < 1024 * 1024) {
                cell.textContent = (sizeInBytes / 1024).toFixed(2) + ' KB';
            } else if (sizeInBytes < 1024 * 1024 * 1024) {
                cell.textContent = (sizeInBytes / (1024 * 1024)).toFixed(2) + ' MB';
            } else {
                cell.textContent = (sizeInBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
            }
        }
    });
    
    // Xử lý đóng cửa sổ callback OAuth tự động
    // Kiểm tra URL để biết chúng ta có ở trang callback không
    if (window.location.pathname === '/callback') {
        // Lấy query parameter 'success'
        const urlParams = new URLSearchParams(window.location.search);
        const hasSuccess = urlParams.has('success');
        
        if (hasSuccess) {
            // Thông báo cho cửa sổ chính làm mới
            if (window.opener && !window.opener.closed) {
                window.opener.postMessage('auth-success', '*');
            }
            
            // Đóng cửa sổ callback sau một khoảng thời gian ngắn
            setTimeout(function() {
                window.close();
            }, 500);
        }
    }
    
    // Lắng nghe tin nhắn từ cửa sổ callback
    window.addEventListener('message', function(event) {
        if (event.data === 'auth-success') {
            // Làm mới trang để cập nhật trạng thái xác thực
            window.location.reload();
        }
    });
}); 