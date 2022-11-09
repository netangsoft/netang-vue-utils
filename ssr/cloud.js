const qs = require('qs')
const _trimStart = require('lodash/trimStart')
const slash = require('@netang/utils/slash')
const isFillObject = require('@netang/utils/isFillObject')
const runAsync = require('@netang/utils/runAsync')
const ssrRender  = require('./render')

/* #if IS_PRO */
const manifest = __HTML_MANIFEST__
/* #endif */

/**
 * ssr 云函数
 */
function cloud(render) {
    return async function({ path, queryStringParameters }, { FUNCTION_NAME }) {

        // 获取当前地址
        let url = slash(_trimStart(slash(path, 'start', true), '/' + FUNCTION_NAME), 'start', true)
        if (isFillObject(queryStringParameters)) {
            url += '?' + qs.stringify(queryStringParameters)
        }

        return {
            mpserverlessComposedResponse: true,
            statusCode: 200,
            headers: {
                'Content-Type': 'text/html;charset=utf-8',
            },
            body: await ssrRender(Object.assign(
                await runAsync(render)({
                    url,
                }),
                {
                    manifest,
                }
            )),
        }
    }
}

module.exports = cloud
