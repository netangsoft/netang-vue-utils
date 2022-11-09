import { ref } from 'vue'

// 路由数组
export const stateRouters = ref([])

// 路由传参事件
export const stateRouterEvent = ref([])

// 路由状态
export const stateRouterState = ref([])

// 路由页面组件
export const stateRouterViewCurrentCtx = ref(null)
export const stateRouterViewIsIgnoreBeforeLeave = ref(null)
export const stateRouterViewNeedTo = ref(null)

// 路由页面深度 key
export const routerViewDepth = Symbol('routerViewDepth')

// loading
export const stateLoading = ref(false)

// 【前端】
// --------------------------------------------------
/* #if IS_WEB */
// 网络是否在线
export const stateOnLine = ref(navigator.onLine)
/* #endif */

// 【后端】
// --------------------------------------------------
/* #if IS_SERVER */
// 网络是否在线
export const stateOnLine = ref(true)
/* #endif */

// 【ssr && 前端】
// ------------------------------
/* #if IS_SSR && IS_WEB */
// ssr 渲染数据
export const stateSsrAsyncData = ref({
    // 初始数据
    data: window.__INIT_DATA__ ? window.__INIT_DATA__ : null,
})
/* #endif */

// 【ssr && 后端】
// ------------------------------
/* #if IS_SSR && IS_SERVER */
// ssr 渲染数据
export const stateSsrAsyncData = ref({
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
})
/* #endif */
