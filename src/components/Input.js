import React from 'react';
import './Input.css';

const Input = ({ 
  label, 
  value, 
  onChange, 
  placeholder = '', 
  disabled = false, 
  type = 'text',
  className = '',
  ...props 
}) => {
  return (
    <div className={`input-wrapper ${className}`}>
      {label && (
        <label className="input-label">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="input-field"
        {...props}
      />
    </div>
  );
};

export default Input;