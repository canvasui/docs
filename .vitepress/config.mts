import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "CanvasUI",
  description: "A canvas-based UI framework",
  themeConfig: {
    logo: '/logo.png',
    nav: [
      { text: 'Tutorial', link: '/tutorial/introduction' },
      { text: 'Docs', link: '/docs/basic' },
      { text: 'Architecture', link: '/architecture/' },
      { text: 'Example', link: '/example/index.html', target: '_blank' },
    ],

    sidebar: {
      '/tutorial/': [
        {
          text: 'Tutorial',
          items: [
            { text: 'Introduction', link: '/tutorial/introduction' },
            { text: 'Usage', link: '/tutorial/usage' },
            { text: 'Sample code', link: '/tutorial/sample-code' },
          ]
        }
      ],
      '/docs/': [
        {
          text: 'Documentation',
          items: [
            { text: 'Basic', link: '/docs/basic' },
            { text: 'Built-in components', link: '/docs/built-in-components' },
            { text: 'Advanced', link: '/docs/advanced' },
          ]
        }
      ],
      '/architecture/': [
        {
          text: 'Architecture',
          items: [
            { text: 'Architectural Overview', link: '/architecture/'}
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/canvasui/CanvasUI' }
    ],

    footer: {
      message: 'Released under the <a href="https://github.com/996icu/996.ICU/blob/master/LICENSE" target="_blank">Anti 996 License</a>.',
      copyright: 'Copyright © 2021-present <a href="https://github.com/lzlme" target="_blank">Zhilin Liu</a>'
    }
  }
})
