/**
 * Input.jsx - Reusable input component with label
 */
import React from 'react';
import './Input.css';

const Input = ({ label, type = 'text', name, value, onChange, placeholder, required = false, error }) => {
  return (
    <div className="input-group">
      {label && <label htmlFor={name} className="input-label">{label} {required && '*'}</label>}
      <input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`input-field ${error ? 'input-error' : ''}`}
      />
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

export default Input;
