import { useEffect } from 'react';
import { IOperationResult } from '../types';
import Toast from './Toast';

interface OperationAlertProps {
  operation: IOperationResult | null;
}

const OperationAlert: React.FC<OperationAlertProps> = ({ operation }) => {
  useEffect(() => {
    // Hiển thị thông báo khi operation thay đổi
    if (operation) {
      if (operation.success) {
        Toast.success(operation.message);
      } else {
        Toast.error(operation.message);
      }
    }
  }, [operation]);
  
  // Component không render gì cả, chỉ hiển thị toast
  return null;
};

export default OperationAlert; 