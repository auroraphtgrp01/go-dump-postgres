import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import viVN from 'antd/lib/locale/vi_VN';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ConfigPage from './pages/ConfigPage';
import './App.css';

function App() {
  return (
    <ConfigProvider locale={viVN}>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/settings" element={<ConfigPage />} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;
