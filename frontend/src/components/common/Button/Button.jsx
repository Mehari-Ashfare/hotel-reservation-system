/**
 * Button.jsx - Reusable button component
 */
import React from 'react';
import './Button.css';

const Button = ({ children, variant = 'primary', onClick, type = 'button', disabled = false, className = '' }) => {
  return (
    <button 
      className={`btn btn-${variant} ${className}`} 
      onClick={onClick} 
      type={type}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;
