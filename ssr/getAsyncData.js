import { useRoute } from 'vue-router'
import _has from 'lodash/has'
import _get from 'lodash/get'
import isFillObject from '@netang/utils/isFillObject'
import runAsync from '@netang/utils/runAsync'
import toNumberDeep from '@netang/utils/toNumberDeep'
import getInitData from './getInitData'

/**
 * ssr 获取异步数据
 */
export default async function() {

    // 获取初始数据
    const initData = getInitData()
    if (initData !== false) {
        return initData
    }

    // 获取当前路由
    const route = useRoute()

    // 执行路由跳转的组件中的 asyncData 方法返回的数据
    if (_has(route, 'matched[0].components.default.asyncData')) {

        const {
            data
        } = await runAsync(route.matched[0].components.default.asyncData)({
            route,
            query: isFillObject(_get(route, 'query')) ? toNumberDeep(route.query) : {},
            render: false,
        })

        if (isFillObject(data)) {
            return data
        }

        /* #if IS_DEV && IS_WEB */
        throw new Error('asyncData 返回数据错误')
        /* #endif */
    }

    /* #if IS_DEV && IS_WEB */
    throw new Error('没有找到 asyncData 方法')
    /* #endif */
}
