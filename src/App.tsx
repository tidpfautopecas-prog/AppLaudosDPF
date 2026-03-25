import { BrowserRouter } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';
import { ToastProvider } from './contexts/ToastContext';
import Router from './router';

export default function App() {
  return (
    <BrowserRouter basename={__BASE_PATH__}>
      <UserProvider>
        <ToastProvider>
          <Router />
        </ToastProvider>
      </UserProvider>
    </BrowserRouter>
  );
}