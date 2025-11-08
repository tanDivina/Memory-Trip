
import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input: React.FC<InputProps> = ({ className, ...props }) => {
  return (
    <input
      className={`w-full bg-brand-bg border border-brand-primary rounded-lg px-4 py-3 text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary transition-shadow duration-200 ${className}`}
      {...props}
    />
  );
};

export default Input;
