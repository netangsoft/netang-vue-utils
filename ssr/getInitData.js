import _get from 'lodash/get'
import isFillObject from '@netang/utils/isFillObject'
import { stateSsrAsyncData } from '../vars'

/**
 * ssr 获取初始数据
 */
export default function() {

    // 获取异步状态数据
    if (isFillObject(_get(stateSsrAsyncData.value, 'data'))) {
        return stateSsrAsyncData.value.data
    }

    return false
}
