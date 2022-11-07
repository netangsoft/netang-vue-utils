const http = require('http')
const os = require('os')
const getExt = require('@netang/utils/getExt')
const runAsync = require('@netang/utils/runAsync')
const ssrRender  = require('./render')

/* #if IS_DEV */
// 资源清单
let manifest
/* #endif */

/* #if IS_PRO */
const manifest = __HTML_MANIFEST__
/* #endif */

/* #if IS_DEV */
/**
 * http 请求
 */
function httpGet(url) {
    return new Promise(function(resolve) {
        http.get(url, function(res) {
            const { statusCode } = res
            if (statusCode !== 200) {
                resolve({status: false})
                return
            }
            res.setEncoding('utf8')
            let rawData = ''
            res.on('data', (chunk) => { rawData += chunk; })
            res.on('end', () => {
                try {
                    resolve({
                        status: true,
                        data: JSON.parse(rawData),
                    })
                } catch (e) {
                    resolve({status: false})
                }
            })
        }).on('error', (e) => {
            resolve({status: false})
        })
    })
}
/* #endif */

/**
 * ssr 服务
 */
function ssrServer(params) {

    const o = Object.assign({
        // 服务端口
        port: '58808',
        // 渲染数据
        render: null,
    }, params)

    /* #if IS_DEV */
    // 创建代理服务
    const serverProxy = require('http-proxy').createProxyServer(Object.assign({}, o.proxy))
    /* #endif */

    // 创建 http 服务
    // --------------------------------------------------
    const httpServer = http.createServer(async function(ctx, res) {

        // 代理转发
        /* #if IS_DEV */
        const matchs = ['js', 'css', 'map', 'json', 'ico', 'png', 'jpg', 'gif', 'svg', 'ttf']
        if (matchs.indexOf(getExt(ctx.url)) > -1) {
            serverProxy.web(ctx, res)
            return
        }
        /* #endif */

        // 获取 manifest.json 内容
        /* #if IS_DEV */
        if (! manifest) {
            const { status, data } = await httpGet(`${o.proxy.target}manifest.json`)
            if (status) {
                // 生成 json 内容
                const json = {
                    // ico
                    ico: '',
                    // css
                    css: '',
                    // js
                    js: '',
                }
                for (const key in data) {
                    const ext = getExt(data[key])
                    if (ext) {
                        if (ext === 'css') {
                            json.css += `<link href="${data[key]}" rel="preload">`
                        } else if (ext === 'js') {
                            json.js += `<script src="${data[key]}"></script>`
                        }
                    }
                }
                if (json.js) {
                    manifest = json
                }
            }
        }
        /* #endif */

        res.statusCode = 200
        res.setHeader('Content-Type', 'text/html;charset=utf-8')
        res.end(await ssrRender(Object.assign(
            await runAsync(o.render)({
                url: ctx.url,
            }),
            {
                manifest,
            }
        )))
    })

    // 监听 http 服务
    httpServer.listen(o.port, '0.0.0.0', function() {
        const interfaces = os.networkInterfaces()
        for (const devName in interfaces) {
            for (const { family, address, internal } of interfaces[devName]) {
                if (family === 'IPv4' && address !== '127.0.0.1' && ! internal) {
                    console.log(`  - Server: http://${address}:${o.port}/`);
                }
            }
        }
    })
}

module.exports = ssrServer
