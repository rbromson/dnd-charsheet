import '@fontsource/alegreya/500.css';
import '@fontsource/alegreya/700.css';
import '@fontsource/alegreya/500-italic.css';
import '@fontsource/alegreya-sc/500.css';
import '@fontsource/alegreya-sc/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/marck-script/400.css';
import './styles/theme.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

mount(App, { target: document.getElementById('app')! });
