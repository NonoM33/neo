import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from './router';
import { useAuthStore } from './stores';
import { ToastContainer, Spinner } from './components';
import './styles/variables.css';
import './styles/global.css';

function App() {
  const { checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
      {/* Sonner toaster for the newer parts of the app (kanban, lead conversion) */}
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}

export default App;
