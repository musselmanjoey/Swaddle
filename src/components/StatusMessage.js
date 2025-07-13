import React from 'react';
import './StatusMessage.css';

const StatusMessage = ({ 
  children, 
  type = 'info', 
  className = '',
  ...props 
}) => {
  const messageClass = `status-message status-message--${type} ${className}`.trim();

  return (
    <div className={messageClass} {...props}>
      {children}
    </div>
  );
};

export default StatusMessage;