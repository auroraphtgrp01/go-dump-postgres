package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

// ServeFrontend thiết lập các route cần thiết để phục vụ SPA React
func (h *Handler) ServeFrontend(router *gin.Engine) {
	// Xác định thư mục chứa tài nguyên frontend
	publicDir := "./public"

	// Kiểm tra xem thư mục có tồn tại không
	if _, err := os.Stat(publicDir); !os.IsNotExist(err) {
		// Phục vụ các tài nguyên tĩnh như JS, CSS, images
		router.Static("/assets", filepath.Join(publicDir, "assets"))
		router.StaticFile("/favicon.ico", filepath.Join(publicDir, "favicon.ico"))

		// Xử lý các route SPA
		// Trả về index.html cho tất cả các route frontend
		router.NoRoute(func(c *gin.Context) {
			// Chỉ phục vụ index.html nếu đường dẫn không bắt đầu bằng /api
			path := c.Request.URL.Path
			if !strings.HasPrefix(path, "/api") {
				c.File(filepath.Join(publicDir, "index.html"))
				return
			}

			// Đối với các API route không được tìm thấy, trả về 404
			c.JSON(http.StatusNotFound, gin.H{"error": "API endpoint not found"})
		})
	} else {
		// Log warning thay vì sử dụng logger
		fmt.Println("Warning: Không tìm thấy thư mục frontend build tại " + publicDir)
	}
}
