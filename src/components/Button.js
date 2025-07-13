import React from 'react';
import './Button.css';

const Button = ({ 
  children, 
  onClick, 
  disabled = false, 
  loading = false, 
  variant = 'primary', 
  size = 'medium',
  className = '',
  ...props 
}) => {
  const buttonClass = `
    button 
    button--${variant} 
    button--${size}
    ${loading ? 'button--loading' : ''}
    ${disabled ? 'button--disabled' : ''}
    ${className}
  `.trim();

  return (
    <button
      className={buttonClass}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="button-content">
          <span className="spinner" />
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;