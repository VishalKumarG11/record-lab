// @ts-expect-error CSS is handled by the bundler at runtime.
import './style.css';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}