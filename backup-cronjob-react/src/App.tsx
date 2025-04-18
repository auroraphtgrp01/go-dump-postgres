import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import viVN from 'antd/lib/locale/vi_VN';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ConfigPage from './pages/ConfigPage';
import GoogleAuthPage from './pages/GoogleAuthPage';
import ProfilesPage from './pages/ProfilesPage';
import './App.css';

function App() {
  return (
    <ConfigProvider locale={viVN}>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/settings" element={<ConfigPage />} />
          <Route path="/profiles" element={<ProfilesPage />} />
          <Route path="/google-auth" element={<GoogleAuthPage />} />
          {/* Route mặc định cho các URL không tồn tại */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>

        {/* Container cho React Toastify */}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </Router>
    </ConfigProvider>
  );
}

export default App;
