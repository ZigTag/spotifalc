import React from 'react';
import { createRoot } from 'react-dom/client';
// import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import './index.css';
import App from './App';
import store from './utils/redux/store';

const container = document.getElementById('root');
// @ts-ignore
const root = createRoot(container);

root.render(
    <React.StrictMode>
        <Provider store={store}>
            <App />
        </Provider>
    </React.StrictMode>,
);
