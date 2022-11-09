import { createRouter as vueCreateRouter } from 'vue-router'
import _has from 'lodash/has'
import _get from 'lodash/get'
import _isNil from 'lodash/isNil'
import _isFunction from 'lodash/isFunction'
import isFillObject from '@netang/utils/isFillObject'
import forEach from '@netang/utils/forEach'
import toNumberDeep from '@netang/utils/toNumberDeep'
import slash from '@netang/utils/slash'
import { getCurrentInstance } from 'vue'
import { useRoute } from 'vue-router'

/**
 * 路由
 */
import {
    stateRouters,
    stateRouterEvent,
    stateRouterState,

    stateRouterViewCurrentCtx,
    stateRouterViewIsIgnoreBeforeLeave,
    stateRouterViewNeedTo,
    // stateModals,
} from './vars'

/**
 * 获取单个参数
 */
function getParams(options, key) {
    if (_has(options, key)) {
        const data = options[key]
        if (utils.isFillObject(data)) {
            const keys = _.sortBy(_.keys(data))
            const arr = []
            forEach(keys, (k)=>{
                arr.push(k + ':' + data[k])
            })
            return '&' + key + '=' + arr.join(',')
        }
    }
    return ''
}

/**
 * 格式化路由参数
 * @param {object} options
 */
function formatOptions(options) {

    if (!utils.isFillObject(options)) {
        return
    }

    // 如果存在 path
    if (_has(options, 'path')) {

        const { path } = options

        if (/^javascript/.test(path)) {
            return
        }

        // 如果为网址
        if (/^http/.test(path)) {

            // 解构地址
            const {
                host,
                hash,
                pathname,
                query,
            } = utils.url(path)

            // 如果为站外地址
            if (utils.url().host !== host) {
                return path
            }

            // 获取 path
            options.path = pathname

            // 获取 query
            if (utils.isFillObject(query)) {
                options.query = query
            }

            // 获取 hash
            if (utils.isFillString(hash)) {
                options.hash = '#' + hash
            }
        }

        // 开头加上反斜杠
        options.path = slash(options.path, 'start', true)
    }

    return options
}

/**
 * 返回路由地址的标准化版本
 */
function resolve(options, isFormat) {

    // 格式化路由参数
    if (isFormat) {
        options = formatOptions(options)
    }

    if (! utils.isFillObject(options)) {

        /* #if IS_DEV */
        throw new Error('路由参数必须是 object 格式')
        /* #endif */

        return
    }

    try {
        const res = utils.routerHandle.resolve(options)
        if (
            !utils.isFillObject(res)
            || res.name === 'error'
        ) {
            return
        }

        const len = res.matched.length
        if (!res.matched.length) {

            /* #if IS_DEV */
            throw new Error('没有找到匹配的路由配置')
            /* #endif */

            return
        }

        // 获取当前匹配的路由配置
        const route = len === 1 ? res.matched[0] : _.find(res.matched, {path: res.path})
        if (!utils.isFillObject(route)) {

            /* #if IS_DEV */
            throw new Error('没有找到匹配的路由配置')
            /* #endif */

            return
        }

        // 如果有重定向
        if (_has(route, 'redirect')) {

            // 如果重定向配置为对象
            if (utils.isFillObject(route.redirect)) {
                return resolve(Object.assign(options, route.redirect), false)

            // 如果重定向配置为方法
            } else if (_isFunction(route.redirect)) {
                return resolve(Object.assign(options, route.redirect(options)), false)
            }

        }

        res.route = route
        return res

    } catch (e) {
        /* #if IS_DEV */
        throw new Error(e)
        /* #endif */
    }
}

/**
 * 设置参数 key
 * @param {object} options 路由参数
 */
function setOptionsKey(options) {

    options = Object.assign({
        path: '',
    }, options)

    options.key = 'path=' + options.path
        + (_has(options, 'name') && utils.isFillString(options.name) ? '&name=' + options.name : '')
        + getParams(options, 'params')
        + getParams(options, 'query')

    return options
}

/**
 * 获取路由 store
 * @param {object} route 路由参数(空:当前路由参数)
 */
function getStore(route = null) {

    // 设置参数 key
    const options = setOptionsKey(_isNil(route) ? utils.routerHandle.currentRoute.value : route)

    // 从 store 中找出 key
    const item = _.find(stateRouters.value, {key: options.key})
    if (utils.isFillObject(item)) {
        return item
    }

}

/**
 * 将路由保存至 store
 * @param {object} options 路由参数
 * @param {boolean} replace 是否替换
 */
function setStore(options, replace = false) {

    if (!utils.isFillObject(options)) {
        return
    }

    // 判断是否不需要缓存组件
    if (_get(options, 'meta.keepAlive') === false) {
        return
    }

    // 设置参数 key
    options = setOptionsKey(options)

    if (_isNil(options.id)) {
        // 获取当前时间戳(毫秒)
        options.id = String(dayjs().valueOf())
    }

    let state = stateRouters.value

    if (state.length) {

        // 删除 store 中相同的 key
        const index = _.findIndex(state, {key: options.key})
        if (index > -1) {
            state.splice(index, 1)
        }

        // 如果是 push 新地址
        if (state.length) {

            // 先获取当前路由 store 参数
            let currentOpts = getStore(null)
            if (utils.isFillObject(currentOpts)) {

                // 找出当前路由参数
                const currentIndex = _.findIndex(state, {key: currentOpts.key})

                // 如果是替换当前的地址
                if (replace === true) {
                    state[currentIndex > -1 ? currentIndex : state.length - 1] = options
                    return
                }

                // 否则为推送, 将 store 中 currentIndex(包含)之后的数组都删除
                if (currentIndex > -1) {
                    stateRouters.value = _.slice(state, 0, currentIndex + 1)
                    state = stateRouters.value
                }
            }
        }

        // 如果路由 store 数组长度超过允许的最大长度, 则删除第一个
        if (state.length >= utils.config('router.maxNum', 20)) {
            state.splice(0, 1)
        }
    }

    state.push(options)
}

/**
 * 查找路由 store
 * @param {object} options 查找路由参数的条件
 */
function findStore(options) {
    if (!utils.isFillObject(options)) {
        return
    }

    const stores = []

    /**
     * 判断当前 store 是否符合条件
     */
    function check(item) {

        for (const key in options) {

            if (! _has(item, key)) {
                return false
            }

            const value = options[key]

            if (utils.isFillObject(value)) {
                for (const k in value) {
                    if (
                        ! _has(item[key], k)
                        || item[key][k] != value[k]
                    ) {
                        return false
                    }
                }

            // 如果值不同
            } else if (item[key] != value) {
                return false
            }
        }

        return true
    }

    forEach(stateRouters.value, function(item) {
        if (check(item)) {
            stores.push(item)
        }
    })

    return stores
}

/**
 * 判断当前路由页面是否不可以离开
 */
function checkCurrentRouterViewCannotBeforeLeave() {
    const ctx = stateRouterViewCurrentCtx.value
    return stateRouterViewIsIgnoreBeforeLeave.value !== true
        && ! _isNil(ctx)
        && _has(ctx, 'onBeforeLeave')
        && _isFunction(ctx.onBeforeLeave)
        && ctx.onBeforeLeave() === false
}

/**
 * 通过在历史堆栈中推送/替换一个 entry, 以编程方式导航到一个新的 URL
 * @param {object} options
 * @param {boolean} replace
 */
function push(options, replace) {

    // 判断当前路由页面是否不可以离开
    if (checkCurrentRouterViewCannotBeforeLeave()) {
        // 如果不可以离开, 则保存需要跳转的路由参数
        stateRouterViewNeedTo.value = {
            type: 'push',
            to: {
                options,
                replace,
            },
        }
        return
    }

    // 格式化路由参数
    options = formatOptions(options)

    // 如果为站外地址
    if (_.isString(options)) {
        if (replace === true) {
            window.location.replace(options)
        } else {
            window.location.href = options
        }
    }

    // 如果参数不正确
    if (!utils.isFillObject(options)) {
        return
    }

    // 返回路由地址的标准化版本并路由保存至 store
    setStore(resolve(options, false), replace)

    // 路由跳转
    utils.routerHandle[replace ? 'replace' : 'push'](options)
        .then(()=>{
            // 当前 url
            const url = window.location.href
            history.replaceState(Object.assign({
                // 当前 url
                url,
                // 获取当前时间戳(毫秒)
                _t: dayjs().valueOf(),
            }, history.state), '', url)
        })
}

/**
 * 设置路由事件参数(用于跳转 history 使用)
 * @param data
 */
function setEvent(data = null) {
    stateRouterEvent.value = data
}

/**
 * 获取当前路由类型
 * @param from
 * @returns {string|null} back:后退,forward:前进,null:无
 */
function getRouterType(from) {

    // 获取当前历史状态
    const state = history.state
    const { back, forward, _t } = state

    let type = null

    const isBack = utils.isRequired(back)
    const isForward = utils.isRequired(forward)

    // 如果 state 中后退和前进都有且相同
    if (
        isBack && isForward
        && back === forward
    ) {
        // 获取前一个历史的时间戳
        const lastTime = _get(stateRouterState.value, 'state._t', 0)

        // 如果当前历史的时间戳 > 前一个历史的时间戳
        if (_t > lastTime) {
            type = 'forward'
        } else {
            type = 'back'
        }

    // 否则如果上一页为前进, 则为后退
    } else if (
        isForward
        && from.fullPath === forward
    ) {
        type = 'back'

    // 否则如果上一页为后退, 则为前进
    } else if (
        isBack
        && from.fullPath === back
    ) {
        type = 'forward'
    }

    return type
}

/**
 * 还原前一个历史状态
 */
function restoreHistoryState() {
    // 获取前一个历史的时间戳
    const lastState = _get(stateRouterState.value, 'state')
    if (utils.isFillObject(lastState)) {
        history.pushState(lastState, '', lastState.url)
    }
}

/**
 * 创建路由
 */
export function createRouter(params) {
    forEach(params.routes, function(item) {
        if (! _has(item, 'name')) {
            item.name = slash(item.path, 'start', false)
        }
    })
    return vueCreateRouter(params)
}

/**
 * 判断当前路由页面是否可以离开
 */
export function checkRouterBeforeLeave(to, from, isRouterView = true, isModal = true) {

    // 判断当前路由页面是否不可以离开
    if (isRouterView) {
        if (checkCurrentRouterViewCannotBeforeLeave()) {
            // 如果不可以离开, 则保存需要跳转的路由参数
            stateRouterViewNeedTo.value = {
                // 获取当前路由类型(back:后退,forward:前进,null:无)
                type: getRouterType(from),
                to,
            }

            // 还原前一个历史状态
            restoreHistoryState()
            return false
        }

        stateRouterViewCurrentCtx.value = null
        stateRouterViewIsIgnoreBeforeLeave.value = null
        stateRouterViewNeedTo.value = null
    }

    // 判断全局模态框是否可以关闭
    // if (isModal) {
    //     const modals = stateModals.value
    //     if (modals.length) {
    //         for (let i = 0; i < modals.length; i++) {
    //             const item = modals[i]
    //             if (
    //                 _has(item, 'instance.ctx.close')
    //                 && item.instance.ctx.hasCloseBefore()
    //                 && item.instance.ctx.close(true) === false
    //             ) {
    //                 // 还原前一个历史状态
    //                 restoreHistoryState()
    //                 return false
    //             }
    //         }
    //     }
    // }
}

/**
 * 初始化并注册路由
 * @param options
 * @param from
 * @returns {function}
 */
export function setRouterStore(options, from) {

    // 获取当前路由类型
    const type = getRouterType(from)

    // 保存当前路由缓存
    stateRouterState.value = {
        type,
        state: history.state
    }

    if (!utils.isFillObject(options)) {
        return
    }

    // 判断是否不需要缓存组件
    if (_get(options, 'meta.keepAlive') === false) {
        return
    }

    // 获取当前 store
    const currentStore = getStore(options)

    // 设置参数 key
    options = setOptionsKey(options)

    const state = stateRouters.value

    // 如果当前 store 不存在
    if (!utils.isFillObject(currentStore)) {

        if (_isNil(options.id)) {
            // 获取当前时间戳(毫秒)
            options.id = String(dayjs().valueOf())
        }

        // 如果为后退, 则将之前的路由 store 删除
        if (type === 'back') {
            // 在数组头部添加当前 store
            state.unshift(options)

        // 否则如果为前进
        } else {
            // 在数组后追加当前 store
            state.push(options)
        }

        // 如果路由 store 数组长度超过允许的最大长度, 则删除第一个
        if (state.length > utils.config('router.maxNum', 30)) {
            state.splice(0, 1)
        }
    }

    // 是否需要后退后删除当前 store 之后的所有数据(一般用于手机端)
    if (
        type === 'back'
        && utils.config('router.backClear') !== false
    ) {
        const currentIndex = _.findIndex(state, {key: options.key})
        stateRouters.value = _.slice(state, 0, currentIndex + 1)
    }
}

/**
 * 获取传参
 */
function getQuery(params, path, defaultValue = {}) {

    if (! _has(params, 'query')) {
        params = useRoute()
        if (! _has(params, 'query')) {
            return defaultValue
        }
    }
    
    if (isFillObject(params.query)) {
        return toNumberDeep(path ? _get(params.query, path, defaultValue) : params.query)
    }

    return defaultValue
}

/**
 * 路由
 */
export default {

    // 获取传参
    getQuery,
}
