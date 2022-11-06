<template>
    <router-view v-slot="{ Component, route }">
        <keep-alive :include="includes" v-if="Component">
            <component :ref="setItemRef" :is="setComponent(Component, route)" />
        </keep-alive>
    </router-view>
</template>

<script>
import { computed, inject, provide } from 'vue'
import { routerViewDepth, stateRouters, stateRouterViewCurrentCtx } from '@/utils/vars'

export default {
    name: 'GRouterView',
    setup() {

        // ==========【data】============================================================================================

        // 获取当前路由组件深度
        const depth = inject(routerViewDepth, 0)

        // 并且给子组件的深度 + 1
        provide(routerViewDepth, depth + 1)

        // ==========【computed】========================================================================================

        // 获取需要缓存的路由组件 store id 数组
        const includes = computed(function() {
            const arr = []

            _.forEach(stateRouters.value, (item)=>{
                arr.push(item.id)
            })

            return arr
        })

        // ==========【method】==========================================================================================

        /**
         * 设置组件 name
         */
        function setComponent(vNode, route) {

            // 只获取当前层级匹配的路由
            if (route.matched.length === depth + 1) {

                // 获取当前路由 store
                const routeStore = utils.router.store.get(route)
                if (utils.isFillObject(routeStore)) {
                    vNode.type.name = routeStore.id
                }
            }

            return vNode
        }

        /**
         * 设置将当前页面上下文保存至 store 中
         */
        function setItemRef(item) {
            stateRouterViewCurrentCtx.value = item
        }

        // ==========【return】==========================================================================================

        return {
            includes,

            setComponent,
            setItemRef,
        }
    },
}
</script>
