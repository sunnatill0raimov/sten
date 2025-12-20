import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg p-6 ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-gray-100">{title}</h3>
      )}
      {children}
    </div>
  );
};

export default Card;
