// components/Button.tsx

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // Fix: Added 'danger' to the variant prop to support it in the Modal component.
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  ...rest
}) => {
  const baseStyles = 'font-semibold rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transform hover:-translate-y-0.5';
  
  const variantStyles = {
    primary: 'bg-gradient-to-r from-orange-400 to-red-500 text-white shadow-lg hover:shadow-xl focus:ring-orange-500',
    secondary: 'bg-white text-gray-800 shadow-md hover:bg-gray-50 focus:ring-orange-400',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-300 shadow-none',
    // Fix: Added styles for the new 'danger' variant.
    danger: 'bg-red-600 text-white shadow-lg hover:bg-red-700 focus:ring-red-500',
  };

  const sizeStyles = {
    sm: 'px-5 py-2 text-sm',
    md: 'px-7 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const combinedStyles = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className || ''}`;

  return (
    <button
      type={type}
      onClick={onClick}
      className={combinedStyles}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;
