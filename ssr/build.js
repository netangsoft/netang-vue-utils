const fs = require('fs')
const path = require('path')
const webpack = require('webpack')
const _has = require('lodash/has')
const _isFunction = require('lodash/isFunction')
const _merge = require('lodash/merge')
const Service = require('@vue/cli-service/lib/Service')
const { defineConfig } = require('@vue/cli-service')

const ROOT_PATH = require('@netang/node-utils/rootPath')
const getFileHashName = require('@netang/node-utils/getFileHashName')
const forEach = require('@netang/utils/forEach')
const forIn = require('@netang/utils/forIn')
const join = require('@netang/utils/join')
const sortAsc = require('@netang/utils/sortAsc')
const isFillObject = require('@netang/utils/isFillObject')
const isFillString = require('@netang/utils/isFillString')
const getFileType = require('@netang/node-utils/getFileType')
const getExt = require('@netang/utils/getExt')
const delFile = require('@netang/node-utils/delFile')
const env = require('@netang/node-utils/getEnv')()

const replaceLoader = require.resolve('@netang/node-utils/loader/webpack.replace.loader.js')
let WebpackManifestPlugin = null

/**
 * 获取 html 模板变量
 */
function getHtmlDefine({ lang, meta, css, js, script }) {

    // 【meta】
    // ------------------------------
    let __HTML_META__ = ''
    let hasCharset = false
    let hasViewport = false
    forEach(meta, function(item) {
        const metas = []
        forIn(item, function(value, key) {
            metas.push(`${key}="${value}"`)
            if (! hasCharset && key === 'charset') {
                hasCharset = true
            }
            if (! hasViewport && value === 'viewport') {
                hasViewport = true
            }
        })
        if (metas.length) {
            __HTML_META__ += `<meta ${join(metas, ' ')}>`
        }
    })
    if (! hasViewport) {
        __HTML_META__ = `<meta name="viewport" content="width=device-width,initial-scale=1.0">` + __HTML_META__
    }
    if (! hasCharset) {
        __HTML_META__ = `<meta charset="utf-8">` + __HTML_META__
    }

    // 【css】
    // ------------------------------
    let __HTML_CSS__ = ''
    forEach(css, function(item) {
        __HTML_CSS__ += `<link href="${item}" rel="stylesheet">`
    })

    // 【js】
    // ------------------------------
    let __HTML_JS__ = ''
    forEach(js, function(item) {
        __HTML_JS__ += `<script src="${item}" defer="defer"></script>`
    })

    // 【script】
    // ------------------------------
    let __HTML_SCRIPT__ = ''
    if (isFillString(script)) {
        __HTML_SCRIPT__ = script
    }

    return {
        __HTML_LANG__: lang,
        __HTML_META__,
        __HTML_CSS__,
        __HTML_JS__,
        __HTML_SCRIPT__,
    }
}

/**
 * 服务编译
 */
async function build(params) {

    const o = _merge({
        // 入口
        entry: path.join(ROOT_PATH, 'src/main.js'),
        // 是否开启 ssr
        ssr: false,
        // 开启后端监听
        nodemon: true,
        // 新环境变量
        env: null,
        // 替换全局变量
        replaceDefine: null,
        // 加载器
        includeLoader: null,
        // 公共配置
        common: {},
        // 前端配置
        web: {
            // 开发服务
            devServer: {
                port: '58809',
            },
        },
        // 后端配置
        server: {
            // 开发服务
            devServer: {
                port: '58808',
            },
            // 打包路径
            outputDir: path.join(ROOT_PATH, 'dist/server'),
        },
        // html 模板
        html: {
            lang: 'en',
            meta: [],
            css: [],
            js: [],
            script: '',
        },
    }, params)

    // 前端打包路径
    if (! _has(o.web, 'outputDir')) {
        o.web.outputDir = o.ssr ? path.join(ROOT_PATH, 'dist/web') : path.join(ROOT_PATH, 'dist')
    }

    // 获取模板替换变量
    const replaceDefine = Object.assign(getHtmlDefine(o.html), {
        // 前端端口
        __WEB_PORT__: o.web.devServer.port,
        // 后端端口
        __SERVER_PORT__: o.server.devServer.port,
    })

    /**
     * 获取配置
     */
    function getConfig(server, defineEnv) {

        // 全局模板变量
        const newReplaceDefine = Object.assign({}, replaceDefine, _isFunction(o.replaceDefine) ? o.replaceDefine(server) : {})

        // 新环境变量
        const newEnv = Object.assign({}, env, _isFunction(o.env) ? o.env(server) : {}, {
            // 是否开启 ssr
            IS_SSR: o.ssr,
            // 前端
            IS_WEB: ! server,
            // 后端
            IS_SERVER: server,
        })

        // 配置
        const config = _merge({
            // 依赖关系
            // https://cli.vuejs.org/zh/config/#runtimecompiler
            transpileDependencies: [
                '@netang/node-utils',
                '@netang/utils',
                '@netang/vue-utils',
            ],

            // 生产源地图
            productionSourceMap: ! server,

            // 开发服务
            devServer: {},

            // webpack 配置
            configureWebpack: {
                // 生成文件
                output: {},
                // 插件
                plugins: [],
            },
        }, o.common, server ? o.server : o.web)

        // 如果开启 ssr
        if (o.ssr) {
            _merge(config, {
                pages: {
                    index: {
                        // 入口
                        entry: o.entry,
                    },
                },
            })
        }

        // 如果是后端
        if (server) {

            // 生成 js 文件名
            config.configureWebpack.output.filename = '[name].js'
            config.configureWebpack.output.chunkFilename = '[name].js'

            // 开启 node
            config.configureWebpack.target = 'node'

            // 如果是开发模式
            if (env.IS_DEV) {
                // 打包路径
                config.outputDir = path.join(ROOT_PATH, 'build/server')
            }

        // 否则为前端
        } else {

            // 如果开启 ssr
            if (o.ssr) {
                if (! WebpackManifestPlugin) {
                    WebpackManifestPlugin = require('webpack-manifest-plugin').WebpackManifestPlugin
                }
                // 生成资源清单
                config.configureWebpack.plugins.push(new WebpackManifestPlugin({
                    fileName: 'manifest.json',
                }))
            }

            // 如果是开发模式
            if (env.IS_DEV) {

                // 打包路径
                config.outputDir = path.join(ROOT_PATH, 'build/web')

                // 开发服务
                config.devServer.host = '0.0.0.0'
                config.devServer.headers = {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
                    'Access-Control-Allow-Headers': 'X-Requested-With,content-type,Authorization',
                }
            }
        }

        // 用户 webpack 配置
        const userChainWebpack = _has(config, 'chainWebpack') ? config.chainWebpack : ()=>{}

        // 修改 webpack 配置参数
        config.chainWebpack = function(chain) {

            // 定义环境变量
            if (isFillObject(defineEnv)) {
                chain
                    .plugin('netang-env')
                    .use(webpack.DefinePlugin, [defineEnv])
            }

            // 条件编译 .vue 文件
            chain.module
                .rule('vue')
                .use(replaceLoader)
                .loader(replaceLoader)
                .options({
                    env: newEnv,
                    replace: newReplaceDefine,
                    includeLoader: o.includeLoader,
                })
                .end()

            // 条件编译 .js 文件
            chain.module
                .rule('js')
                .use(replaceLoader)
                .loader(replaceLoader)
                .options({
                    env: newEnv,
                    replace: newReplaceDefine,
                    includeLoader: o.includeLoader,
                })
                .end()

            // 如果是前端
            if (! server) {
                // 修改复制文件
                chain
                    .plugin('copy')
                    .tap((args) => {
                        args[0].patterns[0].globOptions.ignore.push('**/favicon.ico')
                        const from = path.join(ROOT_PATH, 'public/favicon.ico')
                        args[0].patterns.push({
                            from,
                            to: path.join(config.outputDir, `favicon.${getFileHashName(from)}.ico`),
                        })
                        return args
                    })
            }

            // 用户 webpack 配置
            userChainWebpack(chain, newEnv)
        }

        return config
    }

    /**
     * 开启服务
     */
    function service(server, config) {

        // 构建模式
        let name = 'build'

        // 是否观察模式
        let watch = false

        // 如果是后端
        if (server) {
            // 如果是开发模式
            if (env.IS_DEV) {
                // 设为观察模式
                watch = true
            }

        // 否则为前端
        } else {
            // 如果是开发模式
            if (env.IS_DEV) {
                // 观察编译模式
                name = 'serve'
            }
        }

        // 开始 vue 构建服务
        return new Service(ROOT_PATH, {
            // webpack 配置
            inlineOptions: defineConfig(config)
        }).run(
            name,
            {
                _: [name],
                modern: false,
                report: false,
                'report-json': false,
                'inline-vue': false,
                watch,
                open: false,
                copy: false,
                https: false,
                verbose: false,
            },
            [name]
        )
    }

    // 如果是开发模式
    // ------------------------------
    if (o.ssr && env.IS_DEV) {
        const webConfig = getConfig(false)
        await Promise.all([
            // 编译前端
            service(false, webConfig),
            // 编译后端
            service(true, getConfig(true)),
        ])
            .finally(()=>{
                if (o.nodemon) {
                    require('nodemon')({
                        watch: path.join(ROOT_PATH, 'build/server'),
                        script: path.join(ROOT_PATH, 'build/server/index.js')
                    })
                }
            })

        return {
            options: o,
            webConfig,
        }
    }

    // 否则是生产模式 || 非 ssr 模式
    // ------------------------------
    // 编译前端
    console.log('\n------编译前端')
    const webConfig = getConfig(false)
    await service(false, webConfig)

    const result = {
        options: o,
        webConfig,
    }

    // 如果开启 ssr
    if (o.ssr) {

        // 读取 index.html 内容
        const html = fs.readFileSync(path.join(webConfig.outputDir, 'index.html'), 'utf-8')

        // 读取 manifest.json
        const manifestJson = require(path.join(webConfig.outputDir, 'manifest.json'))

        // 生成 json 内容
        const json = {
            // ico
            ico: '',
            // css
            css: '',
            // js
            js: '',
        }

        // 如果有 ico
        if (_has(manifestJson, 'favicon.ico')) {
            json.ico = `<link href="${manifestJson['favicon.ico']}" rel="icon">`
        }

        const css = []
        const js = []
        forIn(manifestJson, function(url, fileName) {
            const index = html.indexOf(url)
            if (index > -1) {
                const pos = fileName.lastIndexOf('.')
                if (pos > -1) {
                    const suffix = fileName.substring(pos)
                    if (suffix === '.css') {
                        css.push({
                            index,
                            url,
                        })
                    } else if (suffix === '.js') {
                        js.push({
                            index,
                            url,
                        })
                    }
                }
            }
        })

        // 获取 css
        forEach(sortAsc(css, 'index'), function({ url }) {
            json.css += `<link href="${url}" rel="stylesheet">`
        })

        // 获取 js
        forEach(sortAsc(js, 'index'), function({ url }) {
            json.js += `<script src="${url}" defer="defer"></script>`
        })

        // 编译后端
        console.log('\n------编译后端')
        const serverConfig = getConfig(true, {
            // 设置资源清单环境变量
            __HTML_MANIFEST__: JSON.stringify(json),
        })
        await service(true, serverConfig)
        
        // 删除非 js 文件
        const files = fs.readdirSync(serverConfig.outputDir)
        for (const file of files) {
            const filePath = path.join(serverConfig.outputDir, file)
            if (getExt(file) !== 'js' || getFileType(filePath) !== 'file') {
                delFile(filePath)
            }
        }

        result.serverConfig = serverConfig
    }

    return result
}

module.exports = build
