import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Studio from './Studio';
import './styles.css';
import './picture/editor.css';
import './picture/tools.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Studio />
  </StrictMode>,
);
