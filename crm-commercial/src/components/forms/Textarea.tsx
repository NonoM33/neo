import type { TextareaHTMLAttributes } from 'react';
import { forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const textareaId = id || props.name;

    return (
      <div className="mb-3">
        {label && (
          <label htmlFor={textareaId} className="form-label">
            {label}
            {props.required && <span className="text-danger ms-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`form-control ${error ? 'is-invalid' : ''} ${className}`}
          rows={4}
          {...props}
        />
        {error && <div className="invalid-feedback">{error}</div>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
