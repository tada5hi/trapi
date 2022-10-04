import { defineConfig } from 'vitepress';

export default defineConfig({
    title: 'TRAPI',
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
                        {text: 'What is it?', link: '/guide/'},
                    ]
                },
                {
                    text: 'Metadata',
                    collapsible: false,
                    items: [
                        {text: 'Installation', link: '/guide/metadata-installation'}
                    ]
                },
                {
                    text: 'Swagger',
                    collapsible: false,
                    items: [
                        {text: 'Installation', link: '/guide/swagger-installation'}
                    ]
                },
                {
                    text: 'API Reference',
                    collapsible: false,
                    items: [
                        {text: 'Metadata', link: '/guide/metadata-api-reference'},
                        {text: 'Swagger', link: '/guide/swagger-api-reference'},
                    ]
                },
            ]
        }
    }
});
