import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Component Toast để quản lý các thông báo
const Toast = {
  /**
   * Hiển thị thông báo thành công
   * @param content Nội dung thông báo
   * @param duration Thời gian hiển thị (giây)
   */
  success: (content: string, duration = 3) => {
    return toast.success(content, {
      position: "top-right",
      autoClose: duration * 500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  },

  /**
   * Hiển thị thông báo lỗi
   * @param content Nội dung thông báo
   * @param duration Thời gian hiển thị (giây)
   */
  error: (content: string, duration = 5) => {
    return toast.error(content, {
      position: "top-right",
      autoClose: duration * 1000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  },

  /**
   * Hiển thị thông báo cảnh báo
   * @param content Nội dung thông báo
   * @param duration Thời gian hiển thị (giây)
   */
  warning: (content: string, duration = 4) => {
    return toast.warning(content, {
      position: "top-right",
      autoClose: duration * 1000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  },

  /**
   * Hiển thị thông báo thông tin
   * @param content Nội dung thông báo
   * @param duration Thời gian hiển thị (giây)
   */
  info: (content: string, duration = 3) => {
    return toast.info(content, {
      position: "top-right",
      autoClose: duration * 1000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  },

  /**
   * Hiển thị thông báo đang tải
   * @param content Nội dung thông báo
   * @returns hàm để đóng thông báo loading
   */
  loading: (content: string) => {
    const toastId = toast.loading(content, {
      position: "top-right",
      closeOnClick: false,
      pauseOnHover: true,
      draggable: false,
    });
    
    return () => toast.dismiss(toastId);
  },

  /**
   * Cập nhật một toast đang hiển thị
   * @param toastId ID của toast cần cập nhật
   * @param content Nội dung mới
   * @param options Tùy chọn mới
   */
  update: (toastId: string | number, content: string, options: { type: 'success' | 'error' | 'info' | 'warning' }) => {
    toast.update(toastId, {
      render: content,
      type: options.type,
      autoClose: 3000,
      isLoading: false,
    });
  },

  /**
   * Đóng tất cả các toast đang hiển thị
   */
  dismissAll: () => toast.dismiss()
};

export default Toast; 