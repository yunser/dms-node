import * as fs from 'fs'
import * as path from 'path'
const nodePath = path
import { uid } from 'uid'
import * as moment from 'moment'
import Sls20201230, * as $Sls20201230 from '@alicloud/sls20201230';
// 依赖的模块可通过下载工程中的模块依赖文件或右上角的获取 SDK 依赖信息查看
import OpenApi, * as $OpenApi from '@alicloud/openapi-client';
import { loadDbJson, pushDbJson } from './utils'
// import Util, * as $Util from '@alicloud/tea-util';
// import * as $tea from '@alicloud/tea-typescript';

export class LoggerService {

    async home(_body) {
        return 'logger home'
    }

    async historyList(body) {
        const { pageSize = 20 } = body
        const list = await loadDbJson('logger.history.json', [])
        return {
            total: list.length,
            list: list.slice(0, pageSize),
        }
    }

    async historyPush(body) {
        const { content } = body
        pushDbJson('logger.history.json', {
            id: uid(32),
            content,
        })
    }
}
