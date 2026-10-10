import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/i18n';
import '@/index.css';
import './capture.css';
import Stage from './Stage.jsx';
import { installDriver } from './driver.js';

installDriver();
ReactDOM.createRoot(document.getElementById('root')).render(<Stage />);
