import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helpText, className = '', id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="mb-3">
        {label && (
          <label htmlFor={inputId} className="form-label">
            {label}
            {props.required && <span className="text-danger ms-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`form-control ${error ? 'is-invalid' : ''} ${className}`}
          {...props}
        />
        {error && <div className="invalid-feedback">{error}</div>}
        {helpText && !error && <div className="form-text">{helpText}</div>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
