package auth

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/backup-cronjob/internal/config"
	"github.com/backup-cronjob/internal/database"
	"github.com/backup-cronjob/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var cfg *config.Config

// Init khởi tạo module xác thực
func Init(c *config.Config) {
	oldSecret := ""
	if cfg != nil {
		oldSecret = cfg.JWTSecret
	}

	cfg = c

	if oldSecret != cfg.JWTSecret {
		log.Printf("JWT Secret đã được cập nhật thành công")
	}

	// Kiểm tra JWT Secret hợp lệ
	if cfg.JWTSecret == "" {
		log.Printf("CẢNH BÁO: JWT Secret rỗng, điều này có thể gây lỗi xác thực!")
	} else {
		log.Printf("Auth module đã được khởi tạo với JWT Secret dài %d ký tự", len(cfg.JWTSecret))
	}
}

// GenerateJWT tạo JWT token cho người dùng đã xác thực
func GenerateJWT(user *models.User) (string, error) {
	// Thiết lập thời gian hết hạn (24 giờ)
	expirationTime := time.Now().Add(24 * time.Hour)

	// Tạo JWT claims
	claims := jwt.MapClaims{
		"username": user.Username,
		"user_id":  user.ID,
		"exp":      expirationTime.Unix(),
	}

	// Tạo token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Ký token với secret
	tokenString, err := token.SignedString([]byte(cfg.JWTSecret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// ValidateJWT kiểm tra và xác thực JWT token
func ValidateJWT(tokenString string) (*models.JWTClaims, error) {
	// Parse JWT token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Kiểm tra thuật toán
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(cfg.JWTSecret), nil
	})

	if err != nil {
		return nil, err
	}

	// Xác thực token và lấy claims
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		// Kiểm tra thời gian hết hạn
		if exp, ok := claims["exp"].(float64); ok {
			if time.Now().Unix() > int64(exp) {
				return nil, errors.New("token has expired")
			}
		}

		// Lấy thông tin từ claims
		userID, _ := claims["user_id"].(float64)
		username, _ := claims["username"].(string)

		return &models.JWTClaims{
			Username: username,
			UserID:   int64(userID),
		}, nil
	}

	return nil, errors.New("invalid token")
}

// Middleware xác thực JWT
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenString string
		var source string

		// 1. Kiểm tra header Authorization
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" && len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			tokenString = authHeader[7:]
			source = "header"
		}

		// 2. Kiểm tra cookie auth_token nếu không có header
		if tokenString == "" {
			authCookie, err := c.Cookie("auth_token")
			if err == nil && authCookie != "" {
				tokenString = authCookie
				source = "cookie"
			}
		}

		// 3. Kiểm tra query parameter token (cho các link trực tiếp)
		if tokenString == "" {
			queryToken := c.Query("token")
			if queryToken != "" {
				tokenString = queryToken
				source = "query"
			}
		}

		// Nếu không có token từ bất kỳ nguồn nào
		if tokenString == "" {
			// 4. Ghi log về truy cập không có token
			log.Printf("❌ Access denied: No authentication token found at %s", c.Request.URL.Path)

			// Chuyển hướng các request GET đến trang đăng nhập thay vì trả về JSON
			if c.Request.Method == "GET" && !strings.HasPrefix(c.Request.URL.Path, "/api/") {
				log.Printf("🔄 Redirecting to login page from %s", c.Request.URL.Path)
				c.Redirect(http.StatusFound, "/login")
				c.Abort()
				return
			}

			// Trả về lỗi JSON cho các request khác
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}

		// Xác thực token
		claims, err := ValidateJWT(tokenString)
		if err != nil {
			log.Printf("Token validation failed: %v (source: %s)", err, source)

			// Xóa cookie nếu token không hợp lệ
			if source == "cookie" {
				log.Printf("Removing invalid auth_token cookie")
				c.SetCookie("auth_token", "", -1, "/", "", false, true)
				c.SetCookie("logged_in", "", -1, "/", "", false, false)
			}

			// Chuyển hướng các request GET đến trang đăng nhập
			if c.Request.Method == "GET" && !strings.HasPrefix(c.Request.URL.Path, "/api/") {
				log.Printf("🔄 Redirecting to login page due to invalid token")
				c.Redirect(http.StatusFound, "/login")
				c.Abort()
				return
			}

			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}

		// Lưu thông tin người dùng vào context
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("auth_source", source)

		// Đảm bảo token được lưu trong cookie nếu chưa có
		if source != "cookie" {
			log.Printf("Setting auth cookies from %s source", source)
			c.SetSameSite(http.SameSiteLaxMode)
			c.SetCookie(
				"auth_token",
				tokenString,
				3600*24, // 1 day
				"/",
				"",
				false,
				true,
			)
			c.SetCookie(
				"logged_in",
				"true",
				3600*24, // 1 day
				"/",
				"",
				false,
				false,
			)
		}

		c.Next()
	}
}

// AuthenticateUser kiểm tra thông tin đăng nhập và trả về thông tin người dùng nếu hợp lệ
func AuthenticateUser(credentials *models.Auth) (*models.User, error) {
	// Ghi log thông tin đăng nhập để gỡ lỗi
	log.Printf("Đang xác thực người dùng: username=%s, config.AdminUsername=%s",
		credentials.Username, cfg.AdminUsername)

	// Thử xác thực từ database trước
	user, err := database.GetUserByUsername(credentials.Username)
	if err == nil {
		// Nếu tìm thấy người dùng, kiểm tra mật khẩu
		log.Printf("Tìm thấy người dùng trong DB: %s, kiểm tra mật khẩu", credentials.Username)
		if models.CheckPasswordHash(credentials.Password, user.Password) {
			log.Printf("Xác thực thành công qua database cho người dùng: %s", credentials.Username)
			return user, nil
		}
		log.Printf("Mật khẩu không chính xác cho người dùng: %s", credentials.Username)
	} else {
		log.Printf("Không tìm thấy người dùng trong DB: %s (%v), thử với cấu hình",
			credentials.Username, err)
	}

	// Thử với tài khoản admin từ cấu hình
	log.Printf("Kiểm tra mật khẩu admin: credentials.Password==cfg.AdminPassword? %v",
		credentials.Password == cfg.AdminPassword)

	// Kiểm tra thông tin đăng nhập với admin từ cấu hình
	if credentials.Username == cfg.AdminUsername && credentials.Password == cfg.AdminPassword {
		log.Printf("Xác thực thành công với admin từ cấu hình: %s", credentials.Username)
		return &models.User{
			ID:       1,
			Username: cfg.AdminUsername,
		}, nil
	}

	// Thất bại, trả về lỗi
	log.Printf("Xác thực thất bại cho người dùng: %s", credentials.Username)
	return nil, errors.New("Tên đăng nhập hoặc mật khẩu không chính xác")
}
