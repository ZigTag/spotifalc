'use strict';

module.exports = {
    mode: 'jit',
    content: ['index.html', './src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'media', // or 'media' or 'class'
    theme: { extend: { fontFamily: { roboto: ['Roboto'] } } },
    variants: { extend: {} },
    plugins: [],
};
