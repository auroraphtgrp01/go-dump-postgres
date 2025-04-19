import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { IScheduleOption } from '@/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import Toast from '@/components/Toast';

interface ScheduleSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const ScheduleSelector = ({ value, onChange }: ScheduleSelectorProps) => {
  const [scheduleOptions, setScheduleOptions] = useState<IScheduleOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [customCron, setCustomCron] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch lịch trình từ API
  useEffect(() => {
    const fetchScheduleOptions = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/schedule/options', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Đảm bảo có tùy chọn "custom"
            const options = [...data.options];
            if (!options.some(opt => opt.value === 'custom')) {
              options.push({
                value: 'custom',
                label: 'Tùy chỉnh',
                description: 'Tự định nghĩa lịch trình với biểu thức cron'
              });
            }
            setScheduleOptions(options);

            // Nếu đã có giá trị, tìm option tương ứng
            if (value) {
              const option = options.find((opt: IScheduleOption) => opt.value === value);
              if (option) {
                setSelectedOption(option.value);
              } else {
                // Nếu không tìm thấy, đây là giá trị tùy chỉnh
                setSelectedOption('custom');
                setCustomCron(value);
              }
            }
          } else {
            Toast.error(data.message || 'Không thể tải tùy chọn lịch trình');
          }
        } else {
          Toast.error('Không thể tải tùy chọn lịch trình');
        }
      } catch (error) {
        console.error('Error fetching schedule options:', error);
        Toast.error('Lỗi kết nối máy chủ');
      } finally {
        setIsLoading(false);
      }
    };

    fetchScheduleOptions();
  }, [value]);

  // Xử lý khi thay đổi tùy chọn
  const handleOptionChange = (optionValue: string) => {
    setSelectedOption(optionValue);

    // Nếu chọn tùy chỉnh, không gọi onChange
    if (optionValue === 'custom') {
      // Khi chọn tùy chỉnh, không setSelectedOption thành rỗng
      return;
    }

    // Gọi callback với giá trị mới
    onChange(optionValue);
  };

  // Xử lý khi thay đổi cron tùy chỉnh
  const handleCustomCronChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cronValue = e.target.value;
    setCustomCron(cronValue);

    // Gọi callback với giá trị mới
    if (cronValue.trim()) {
      onChange(cronValue);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center">
          <Select
            value={selectedOption}
            onValueChange={handleOptionChange}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn lịch backup" />
            </SelectTrigger>
            <SelectContent>
              {scheduleOptions.map((option) => (
                <SelectItem key={option.value || 'custom'} value={option.value || 'custom'}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="ml-2">
                  <HelpCircle size={16} className="text-gray-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Chọn tần suất backup tự động</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Hiển thị input tùy chỉnh khi chọn "Tùy chỉnh" */}
      {selectedOption === 'custom' && (
        <div className="mt-3">
          <div className="flex items-center">
            <Input
              id="custom-cron"
              value={customCron}
              onChange={handleCustomCronChange}
              placeholder="Nhập biểu thức cron (VD: 0 2 * * *)"
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="ml-2">
                    <HelpCircle size={16} className="text-gray-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Định dạng: phút giờ ngày tháng thứ</p>
                  <p>VD: 0 2 * * * = 2h sáng hàng ngày</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-xs text-gray-500 mt-1">Định dạng cron: phút giờ ngày tháng thứ</p>
        </div>
      )}

      {/* Hiển thị mô tả cho tùy chọn đã chọn */}
      {selectedOption && selectedOption !== 'custom' && (
        <div className="text-sm text-gray-500">
          {scheduleOptions.find(opt => opt.value === selectedOption)?.description}
        </div>
      )}
    </div>
  );
};

export default ScheduleSelector; 