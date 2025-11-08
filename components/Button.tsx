
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ children, className, variant = 'primary', ...props }) => {
  const baseStyles = 'px-6 py-3 font-semibold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-bg';
  const variantStyles = {
    primary: 'bg-brand-secondary text-white hover:bg-opacity-90 focus:ring-brand-secondary disabled:bg-gray-400 disabled:cursor-not-allowed',
    secondary: 'bg-brand-primary text-brand-text hover:bg-opacity-80 focus:ring-brand-primary disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
