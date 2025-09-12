import DefaultTheme from 'vitepress/theme'
import { EnhanceAppContext } from 'vitepress'
import './custom.css'

// Import demo components
import DemoContainer from './components/DemoContainer.vue'
import ComponentPreview from './components/ComponentPreview.vue'
import ApiTable from './components/ApiTable.vue'
import MobilePreview from './components/MobilePreview.vue'
import CodePlayground from './components/CodePlayground.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: EnhanceAppContext) {
    app.component('DemoContainer', DemoContainer)
    app.component('ComponentPreview', ComponentPreview)
    app.component('ApiTable', ApiTable)
    app.component('MobilePreview', MobilePreview)
    app.component('CodePlayground', CodePlayground)
  }
}