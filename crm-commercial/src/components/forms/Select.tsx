import type { SelectHTMLAttributes } from 'react';
import { forwardRef } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Option[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', id, ...props }, ref) => {
    const selectId = id || props.name;

    return (
      <div className="mb-3">
        {label && (
          <label htmlFor={selectId} className="form-label">
            {label}
            {props.required && <span className="text-danger ms-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`form-select ${error ? 'is-invalid' : ''} ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <div className="invalid-feedback">{error}</div>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
