import{d as p,I as s,a1 as i,u,h as c,l,a2 as d,a3 as f,a4 as m,a5 as h,a6 as A,a7 as g,a8 as P,a9 as v,aa as C,ab as y,ac as _,ad as b,ae as E,af as R}from"./chunks/framework.a618ffea.js";import{t as w}from"./chunks/theme.a8a0a869.js";function r(e){if(e.extends){const a=r(e.extends);return{...a,...e,enhanceApp(t){a.enhanceApp&&a.enhanceApp(t),e.enhanceApp&&e.enhanceApp(t)}}}return e}const n=r(w),D=p({name:"VitePressApp",setup(){const{site:e}=u();return c(()=>{l(()=>{document.documentElement.lang=e.value.lang,document.documentElement.dir=e.value.dir})}),d(),f(),m(),n.setup&&n.setup(),()=>h(n.Layout)}});async function O(){const e=T(),a=S();a.provide(A,e);const t=g(e.route);return a.provide(P,t),a.component("Content",v),a.component("ClientOnly",C),Object.defineProperties(a.config.globalProperties,{$frontmatter:{get(){return t.frontmatter.value}},$params:{get(){return t.page.value.params}}}),n.enhanceApp&&await n.enhanceApp({app:a,router:e,siteData:y}),{app:a,router:e,data:t}}function S(){return _(D)}function T(){let e=s,a;return b(t=>{let o=E(t);return e&&(a=o),(e||a===o)&&(o=o.replace(/\.js$/,".lean.js")),s&&(e=!1),R(()=>import(o),[])},n.NotFound)}s&&O().then(({app:e,router:a,data:t})=>{a.go().then(()=>{i(a.route,t.site),e.mount("#app")})});export{O as createApp};
