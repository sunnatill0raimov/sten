import React, { useState } from 'react';
import Navbar from './Navbar.tsx';
import { NotificationContext } from '../../contexts/NotificationContext';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [unclaimedPrizes, setUnclaimedPrizes] = useState(0);

  return (
    <NotificationContext.Provider value={{ unclaimedPrizes, setUnclaimedPrizes }}>
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <main>
          {children}
        </main>
      </div>
    </NotificationContext.Provider>
  );
};

export default MainLayout;

