import { defineConfig } from 'vitepress';

export default defineConfig({
    title: 'TRAPI',
    description: 'Generate OpenAPI specifications and API metadata from TypeScript decorators.',
    base: '/',
    themeConfig: {
        socialLinks: [
            { icon: 'github', link: 'https://github.com/tada5hi/trapi' },
        ],
        editLink: {
            pattern: 'https://github.com/tada5hi/trapi/edit/master/docs/:path',
            text: 'Edit this page on GitHub'
        },
        nav: [
            {
                text: 'Home',
                link: '/',
                activeMatch: '/',
            },
            {
                text: 'Guide',
                link: '/guide/',
                activeMatch: '/guide/',
            }
        ],
        sidebar: {
            '/guide/': [
                {
                    text: 'Introduction',
                    collapsible: false,
                    items: [
                        { text: 'What is it?', link: '/guide/' },
                        { text: 'Philosophy', link: '/guide/philosophy' },
                        { text: 'Key Concepts', link: '/guide/concepts' },
                    ]
                },
                {
                    text: 'Getting Started',
                    collapsible: false,
                    items: [
                        { text: 'Quick Start', link: '/guide/quick-start' },
                        { text: 'Framework Integration', link: '/guide/framework-integration' },
                    ]
                },
                {
                    text: 'Metadata',
                    collapsible: false,
                    items: [
                        { text: 'Installation', link: '/guide/metadata-installation' },
                        { text: 'Configuration', link: '/guide/metadata-configuration' },
                        { text: 'Decorators & Presets', link: '/guide/metadata-decorators' },
                        { text: 'Caching', link: '/guide/metadata-caching' },
                    ]
                },
                {
                    text: 'Swagger',
                    collapsible: false,
                    items: [
                        { text: 'Installation', link: '/guide/swagger-installation' },
                        { text: 'Generating a Spec', link: '/guide/swagger-generation' },
                        { text: 'Document Data', link: '/guide/swagger-document-data' },
                        { text: 'Saving Output', link: '/guide/swagger-output' },
                    ]
                },
                {
                    text: 'Advanced',
                    collapsible: false,
                    items: [
                        { text: 'Supported TypeScript Types', link: '/guide/advanced-type-support' },
                        { text: 'Custom Presets', link: '/guide/advanced-custom-presets' },
                    ]
                },
                {
                    text: 'API Reference',
                    collapsible: false,
                    items: [
                        { text: '@trapi/metadata', link: '/guide/metadata-api-reference' },
                        { text: '@trapi/swagger', link: '/guide/swagger-api-reference' },
                    ]
                },
                {
                    text: 'Migration',
                    collapsible: false,
                    items: [
                        { text: '1.x → 2.0', link: '/guide/migration-2.0' },
                    ]
                },
            ]
        }
    }
});
