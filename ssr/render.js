const { renderToString } = require('@vue/server-renderer')
const isFillObject = require('@netang/utils/isFillObject')
const { stateSsrRenderData } = require('../vars')

/**
 * ssr 渲染数据
 */
async function render(params) {

    const o = Object.assign({
        // 资源地址
        manifest: {},
    }, params)

    const {
        // 是否开启 ssr
        ssr,
        // 标题
        title,
        // 关键词
        keywords,
        // 描述
        description,
        // 初始数据
        data,
    } = stateSsrRenderData.value

    // 头部
    let head = o.manifest.ico

    // 标题
    if (title) {
        head += `<title>${title}</title>`
    }

    // 关键词
    if (keywords) {
        head += `<meta name="keywords" content="${keywords}" />`
    }

    // 描述
    if (description) {
        head += `<meta name="description" content="${description}" />`
    }

    let body = ''
    let initData = 'null'

    // 如果开启 ssr
    if (ssr === true) {
        body = await renderToString(o.app)

        // 如果有初始数据
        if (isFillObject(data)) {
            initData = JSON.stringify(data)
        }
    }

    return `<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,shrink-to-fit=no,user-scalable=0,minimum-scale=1.0,viewport-fit=cover">${head}${o.manifest.css}</head><body><noscript>Please enable JavaScript.</noscript><div id="app">${body}</div><script>window.__INIT_DATA__=${initData};</script>${o.manifest.js}</body></html>`
}

module.exports = render
