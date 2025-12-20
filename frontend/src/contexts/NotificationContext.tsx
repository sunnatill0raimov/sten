import React, { useContext } from 'react';

// Create a context for notification state
export const NotificationContext = React.createContext<{
  unclaimedPrizes: number;
  setUnclaimedPrizes: (count: number) => void;
}>({
  unclaimedPrizes: 0,
  setUnclaimedPrizes: () => {}
});

// Hook to use the notification context
export const useNotifications = () => useContext(NotificationContext);
