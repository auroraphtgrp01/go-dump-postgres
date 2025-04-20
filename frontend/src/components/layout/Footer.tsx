import React from 'react';

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  return (
    <footer className={`bg-white/50 dark:bg-zinc-900/50 border-t dark:border-zinc-800 py-4 px-4 backdrop-blur-md ${className}`}>
      <div className="container mx-auto flex items-center justify-center text-sm text-gray-600 dark:text-gray-400">
        <p>© {new Date().getFullYear()} Developed by @auroraphtgrp01</p>
      </div>
    </footer>
  );
};

export default Footer; 