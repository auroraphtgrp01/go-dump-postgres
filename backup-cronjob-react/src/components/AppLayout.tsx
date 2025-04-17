import { ReactNode } from 'react';
import { Layout, theme } from 'antd';
import AppHeader from './AppHeader';

const { Content } = Layout;

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { token } = theme.useToken();

  return (
    <Layout className="min-h-screen">
      <AppHeader />
      <Content style={{ background: token.colorBgContainer }}>
        {children}
      </Content>
    </Layout>
  );
};

export default AppLayout; 