import { useUIStore } from '../../stores';

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  const iconMap = {
    success: 'bi-check-circle-fill',
    error: 'bi-x-circle-fill',
    warning: 'bi-exclamation-triangle-fill',
    info: 'bi-info-circle-fill',
  };

  const bgMap = {
    success: 'bg-success',
    error: 'bg-danger',
    warning: 'bg-warning',
    info: 'bg-info',
  };

  return (
    <div className="toast-container position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1100 }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast show ${bgMap[toast.type]} text-white`}
          role="alert"
        >
          <div className="toast-body d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <i className={`bi ${iconMap[toast.type]}`}></i>
              {toast.message}
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={() => removeToast(toast.id)}
            ></button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
