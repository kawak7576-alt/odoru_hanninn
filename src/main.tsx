import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { getStoredAppIcon, updateFavicon } from './utils/cardImageSetting.ts';

// Sync initial icon and social share tags
updateFavicon(getStoredAppIcon());

createRoot(document.getElementById('root')!).render(<App />);
