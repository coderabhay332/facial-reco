// Card.tsx
import React from 'react';

type CardProps = {
  children: React.ReactNode;
};

export const Card: React.FC<CardProps> = ({ children }) => {
  return (
    <div className="border border-gray-200 rounded-lg shadow-lg overflow-hidden">
      {children}
    </div>
  );
};

type CardHeaderProps = {
  children: React.ReactNode;
};

export const CardHeader: React.FC<CardHeaderProps> = ({ children }) => {
  return (
    <div className="bg-gray-100 px-4 py-2 border-b">
      {children}
    </div>
  );
};

type CardTitleProps = {
  children: React.ReactNode;
};

export const CardTitle: React.FC<CardTitleProps> = ({ children }) => {
  return (
    <h2 className="text-lg font-semibold text-gray-800">
      {children}
    </h2>
  );
};

type CardContentProps = {
  children: React.ReactNode;
};

export const CardContent: React.FC<CardContentProps> = ({ children }) => {
  return (
    <div className="p-4">
      {children}
    </div>
  );
};
