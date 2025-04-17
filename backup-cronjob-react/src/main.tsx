import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Thêm định dạng tiếng Việt cho ngày tháng
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
dayjs.locale('vi');

const root = document.getElementById('root');

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
