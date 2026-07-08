import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import router from '../src/routes/index.ts'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './index.css'

const app = createApp(App)
app.use(ElementPlus)
app.use(router)
app.mount('#app')
