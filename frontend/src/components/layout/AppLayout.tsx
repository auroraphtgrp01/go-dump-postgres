import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        <Outlet />
      </main>

      <Footer className="sticky bottom-0 z-50" />
    </div>
  );
};

export default AppLayout; 