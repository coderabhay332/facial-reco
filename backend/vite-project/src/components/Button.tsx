// Button.tsx
import React from 'react';

type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'destructive';  // You can add more variants as needed
  className?: string;
};

const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'primary', className }) => {
  const baseStyles = 'px-4 py-2 font-semibold rounded';
  const variantStyles =
    variant === 'primary'
      ? 'bg-blue-500 text-white hover:bg-blue-600'
      : 'bg-red-500 text-white hover:bg-red-600';

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${variantStyles} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
