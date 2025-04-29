package handlers

import (
	"net/http"

	"log"

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
		// Bỏ qua JWT_SECRET, không hiển thị trong API
		if cfg.Key == "JWT_SECRET" {
			continue
		}

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

	// Xử lý và lọc configs
	filteredConfigs := make([]models.AppConfig, 0)
	for _, cfg := range configs {
		// Bỏ qua JWT_SECRET
		if cfg.Key == "JWT_SECRET" {
			continue
		}

		// Ẩn giá trị của các trường nhạy cảm
		if cfg.Type == "password" && cfg.Value != "" {
			cfg.Value = "••••••••" // Ẩn giá trị thực
		}

		filteredConfigs = append(filteredConfigs, cfg)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"group":   group,
		"configs": filteredConfigs,
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

	// Ngăn chặn cập nhật JWT_SECRET
	if _, exists := configUpdates["JWT_SECRET"]; exists {
		delete(configUpdates, "JWT_SECRET")
		log.Printf("WARNING: Nỗ lực cập nhật JWT_SECRET bị từ chối vì lý do bảo mật")
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

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Cập nhật cấu hình thành công",
	})
}
