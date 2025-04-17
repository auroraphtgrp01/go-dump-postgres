import { Alert } from 'antd';
import { useEffect, useState } from 'react';
import { IOperationResult } from '../types';

interface OperationAlertProps {
  operation: IOperationResult | null;
}

const OperationAlert: React.FC<OperationAlertProps> = ({ operation }) => {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    // Reset visibility when operation changes
    if (operation) {
      setVisible(true);
      
      // Auto hide after 5 seconds
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [operation]);
  
  if (!operation || !visible) return null;
  
  return (
    <Alert
      message={operation.success ? 'Thành công!' : 'Lỗi!'}
      description={operation.message}
      type={operation.success ? 'success' : 'error'}
      showIcon
      closable
      onClose={() => setVisible(false)}
      className="mb-4"
    />
  );
};

export default OperationAlert; 