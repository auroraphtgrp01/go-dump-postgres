package handlers

import (
	"net/http"

	"log"

	"github.com/backup-cronjob/internal/auth"
	"github.com/backup-cronjob/internal/database"
	"github.com/backup-cronjob/internal/models"
	"github.com/gin-gonic/gin"
)

// GetConfigsHandler trả về tất cả cấu hình
func (h *Handler) GetConfigsHandler(c *gin.Context) {
	configs, err := database.GetAllConfigs()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Nhóm cấu hình theo group
	configsByGroup := make(map[string][]models.AppConfig)
	for _, cfg := range configs {
		// Ẩn giá trị của các trường nhạy cảm
		if cfg.Type == "password" && cfg.Value != "" {
			cfg.Value = "••••••••" // Ẩn giá trị thực
		}
		configsByGroup[cfg.Group] = append(configsByGroup[cfg.Group], cfg)
	}

	// Sắp xếp các nhóm
	groups := models.ConfigGroups()
	groupLabels := models.ConfigGroupLabels()

	// Tạo kết quả với thứ tự nhóm
	result := make([]gin.H, 0)
	for _, group := range groups {
		result = append(result, gin.H{
			"group":   group,
			"label":   groupLabels[group],
			"configs": configsByGroup[group],
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// GetConfigsByGroupHandler trả về cấu hình theo nhóm
func (h *Handler) GetConfigsByGroupHandler(c *gin.Context) {
	group := c.Param("group")
	if group == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Nhóm cấu hình không được để trống",
		})
		return
	}

	configs, err := database.GetConfigsByGroup(group)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Ẩn giá trị của các trường nhạy cảm
	for i := range configs {
		if configs[i].Type == "password" && configs[i].Value != "" {
			configs[i].Value = "••••••••" // Ẩn giá trị thực
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"group":   group,
		"configs": configs,
	})
}

// UpdateConfigsHandler cập nhật cấu hình
func (h *Handler) UpdateConfigsHandler(c *gin.Context) {
	var configUpdates map[string]string

	if err := c.ShouldBindJSON(&configUpdates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Dữ liệu không hợp lệ",
		})
		return
	}

	// Cập nhật từng cấu hình
	for key, value := range configUpdates {
		log.Printf("Cập nhật cấu hình '%s' = '%s'", key, value)
		if err := database.UpdateConfig(key, value); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Lỗi khi cập nhật cấu hình: " + err.Error(),
			})
			return
		}
	}

	// Tải lại cấu hình cho ứng dụng
	if err := h.Config.LoadConfigFromDB(database.GetConfigValue); err != nil {
		log.Printf("Warning: Không thể tải lại cấu hình: %v", err)
	} else {
		log.Printf("Đã tải lại cấu hình sau khi cập nhật thành công")
	}

	// Cập nhật JWT secret nếu đã thay đổi
	if _, ok := configUpdates["JWT_SECRET"]; ok {
		log.Printf("JWT Secret đã được cập nhật thành công")
		log.Printf("Khởi tạo lại module auth với JWT secret mới")
		auth.Init(h.Config)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Cập nhật cấu hình thành công",
	})
}
