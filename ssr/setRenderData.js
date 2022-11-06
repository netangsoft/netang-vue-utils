/* #if IS_SERVER */
const _get = require('lodash/get')
const _has = require('lodash/has')
const _isBoolean = require('lodash/isBoolean')
const isFunction = require('lodash/isFunction')
const isFillObject = require('@netang/utils/isFillObject')
const runAsync = require('@netang/utils/runAsync')
const filter = require('@netang/utils/filter')
/* #endif */

const { stateSsrRenderData } = require('../vars')

// 【前端】
/* #if IS_WEB */
let isRendered = false
/* #endif */

/**
 * ssr 设置渲染数据
 */
async function setRenderData(params) {

    // 【前端】
    // --------------------------------------------------
    /* #if IS_WEB */
        if (isRendered) {
            stateSsrRenderData.value = {
                data: null,
            }
        } else {
            isRendered = true
        }
    /* #endif */

    // 【后端】
    // --------------------------------------------------
    /* #if IS_SERVER */

        const {
            // 跳转路由
            to,
            // 默认 meta
            meta,
            // 渲染数据格式化
            format,
        } = params

        // 执行路由跳转的组件中的 asyncData 方法返回的数据
        const resAsyncData = _has(to, 'matched[0].components.default.asyncData') ? await runAsync(to.matched[0].components.default.asyncData)(to) : {}

        const o = Object.assign({
            // 是否开启 ssr
            ssr: false,
            // 标题
            title: '',
            // 关键词
            keywords: '',
            // 描述
            description: '',
            // 初始数据
            data: null,
        }, meta)

        if (isFillObject(_get(to, 'meta'))) {

            // 获取 ssr
            o.ssr = _get(to.meta, 'ssr') === true

            // 合并路由 meta 数据
            Object.assign(o, filter(to.meta, ['title', 'keywords', 'description']))

            // 如果有异步数据, 则合并异步数据
            if (isFillObject(resAsyncData)) {
                // 合并异步数据
                Object.assign(o, filter(resAsyncData, ['ssr', 'title', 'keywords', 'description']))

                if (
                    // 如果开启 ssr
                    o.ssr
                    // 如果异步数据有返回初始数据
                    && isFillObject(_get(resAsyncData, 'data'))
                    // 初始数据格式正确
                    && _isBoolean(_get(resAsyncData.data, 'status')) && _has(resAsyncData.data, 'data')
                ) {
                    o.data = {
                        status: resAsyncData.data.status,
                        data: resAsyncData.data.data,
                    }
                }
            }
        }

        if (isFunction(format)) {
            format(o)
        }

        stateSsrRenderData.value = o
    /* #endif */
}

module.exports = setRenderData
