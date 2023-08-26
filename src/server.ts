import * as fs from 'fs'
import * as path from 'path'

import * as Koa from 'koa'
import * as Router from 'koa-router'
import * as koaBody from 'koa-body'
import * as urlencode from 'urlencode'

import { FileService } from './file.service'
import { GitService } from './git.service'
import { MySqlService } from './mysql.service'
import { RedisService } from './redis.service'
import { SshService } from './ssh.service'
import { SocketService } from './socket.service'
import { HttpService } from './http.service'
import { MongoService } from './mongo.service'
import { MqttService } from './mqtt.service'
import { KafkaService } from './kafka.service'
import { DockerService } from './docker.service'
import { ProxyService } from './proxy.service'
import { OpenAiService } from './openai.service'
import { LowCodeService } from './lowCode.service'
const send = require('koa-send')
import { LoggerService } from './logger.service'




// import { MySqlService } from '../util/mysql.service'

const mySqlService = new MySqlService()
const redisService = new RedisService()
const gitService = new GitService()
const fileService = new FileService()
const sshService = new SshService()
const socketService = new SocketService()
const httpService = new HttpService()
const mongoService = new MongoService()
const mqttService = new MqttService()
const kafkaService = new KafkaService()
const dockerService = new DockerService()
const proxyService = new ProxyService()
const openaiService = new OpenAiService()
const loggerService = new LoggerService()
const lowCodeService = new LowCodeService()

// const staticPath = '../static'
const staticPath = '../view/dist'

const app = new Koa()
const router = new Router()
// const server = http.createServer(app.callback());

// 初始化 socket
// const io = require("socket.io")(server, { cors: true });
// 监听





interface CreateServerProps {
    port?: number
    rootPath?: string
}

export function createServer({ port, rootPath, }: CreateServerProps) {

    router.get(`/`, async (ctx) => {
        // console.log('home')
        // ctx.body = 'home';
        ctx.body = fs.readFileSync(path.resolve(__dirname, '../view/dist/index.html'), 'utf8')
        // ctx.response.body = 'linxot push demo'
    })
    
    // router.post(`/`, async (ctx) => {
    
    //     // console.log('home2', ctx.request.body)
    //     // ctx.body = 'home';
    //     const { text } = ctx.request.body
    //     // if (text) {
    //     //     // console.log('receive text:')
    //     //     console.log(text)
    //     // }
    //     console.log('home')
    //     // ctx.body = fs.readFileSync('index.html', 'utf8')
    //     // ctx.body = fs.readFileSync('view/dist/.html', 'utf8')
    //     ctx.response.body = 'linxot push demo'
    // })
    
    router.get(`/api`, async (ctx) => {
        ctx.body = 'api home'
    })

    router.post(`/version`, async (ctx) => {
        const pkgContent = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8')
        const pkg = JSON.parse(pkgContent)
        
        ctx.body = {
            version: pkg.version,
        }
    })

    router.get(`/redis`, async (ctx) => {
        ctx.body = await redisService.index()
    })

    router.get(`/debug/exception`, async (ctx) => {
        throw new Error('debug exception')
        // ctx.body = await redisService.index()
    })

    router.post(`/redis/execCommands`, async (ctx) => {
        ctx.body = await redisService.execCommands(ctx.request.body)
    })

    router.post(`/redis/clone`, async (ctx) => {
        ctx.body = await redisService.clone(ctx.request.body)
    })

    router.post(`/redis/ping`, async (ctx) => {
        ctx.body = await redisService.ping(ctx.request.body)
    })

    router.post(`/redis/expire`, async (ctx) => {
        ctx.body = await redisService.expire(ctx.request.body)
    })

    router.post(`/redis/info`, async (ctx) => {
        ctx.body = await redisService.getInfo(ctx.request.body)
    })

    router.post(`/redis/publish`, async (ctx) => {
        ctx.body = await redisService.publish(ctx.request.body)
    })

    router.post(`/redis/subscribe`, async (ctx) => {
        ctx.body = await redisService.subscribe(ctx.request.body)
    })

    router.post(`/redis/unSubscribe`, async (ctx) => {
        ctx.body = await redisService.unSubscribe(ctx.request.body)
    })

    router.post(`/redis/pubsub`, async (ctx) => {
        ctx.body = await redisService.pubsub(ctx.request.body)
    })

    router.post(`/redis/config`, async (ctx) => {
        ctx.body = await redisService.getConfig(ctx.request.body)
    })

    router.post(`/redis/get`, async (ctx) => {
        ctx.body = await redisService.get(ctx.request.body)
    })

    router.post(`/redis/lindex`, async (ctx) => {
        ctx.body = await redisService.lindex(ctx.request.body)
    })

    router.post(`/redis/rpush`, async (ctx) => {
        ctx.body = await redisService.rpush(ctx.request.body)
    })

    router.post(`/redis/zadd`, async (ctx) => {
        ctx.body = await redisService.zadd(ctx.request.body)
    })
    router.post(`/redis/xadd`, async (ctx) => {
        ctx.body = await redisService.xadd(ctx.request.body)
    })
    router.post(`/redis/xdel`, async (ctx) => {
        ctx.body = await redisService.xdel(ctx.request.body)
    })

    router.post(`/redis/zrem`, async (ctx) => {
        ctx.body = await redisService.zrem(ctx.request.body)
    })

    router.post(`/redis/sadd`, async (ctx) => {
        ctx.body = await redisService.sadd(ctx.request.body)
    })

    router.post(`/redis/sreplace`, async (ctx) => {
        ctx.body = await redisService.sreplace(ctx.request.body)
    })

    router.post(`/redis/hreplace`, async (ctx) => {
        ctx.body = await redisService.hreplace(ctx.request.body)
    })

    router.post(`/redis/zreplace`, async (ctx) => {
        ctx.body = await redisService.zreplace(ctx.request.body)
    })

    router.post(`/redis/srem`, async (ctx) => {
        ctx.body = await redisService.srem(ctx.request.body)
    })

    router.post(`/redis/hset`, async (ctx) => {
        ctx.body = await redisService.hset(ctx.request.body)
    })

    router.post(`/redis/hdel`, async (ctx) => {
        ctx.body = await redisService.hdel(ctx.request.body)
    })

    router.post(`/redis/lset`, async (ctx) => {
        ctx.body = await redisService.lset(ctx.request.body)
    })

    router.post(`/redis/lremove`, async (ctx) => {
        ctx.body = await redisService.lremove(ctx.request.body)
    })

    router.post(`/redis/lremIndex`, async (ctx) => {
        ctx.body = await redisService.lremIndex(ctx.request.body)
    })

    router.post(`/redis/set`, async (ctx) => {
        ctx.body = await redisService.set(ctx.request.body)
    })

    router.post(`/redis/delete`, async (ctx) => {
        ctx.body = await redisService.delete(ctx.request.body)
    })

    // router.post(`/redis/deleteKeys`, async (ctx) => {
    //     ctx.body = await redisService.deleteKeys(ctx.request.body)
    // })

    router.post(`/redis/connect`, async (ctx) => {
        ctx.body = await redisService.connect(ctx.request.body)
    })

    router.post(`/redis/keys`, async (ctx) => {
        ctx.body = await redisService.keys(ctx.request.body)
    })

    router.post(`/redis/history/list`, async (ctx) => {
        ctx.body = await redisService.historyList(ctx.request.body)
    })

    router.post(`/redis/history/clear`, async (ctx) => {
        ctx.body = await redisService.historyClear(ctx.request.body)
    })

    router.post(`/redis/key/list`, async (ctx) => {
        ctx.body = await redisService.keyList(ctx.request.body)
    })

    router.post(`/redis/key/create`, async (ctx) => {
        ctx.body = await redisService.keyCreate(ctx.request.body)
    })

    router.post(`/redis/key/remove`, async (ctx) => {
        ctx.body = await redisService.keyRemove(ctx.request.body)
    })

    router.post(`/redis/rename`, async (ctx) => {
        ctx.body = await redisService.rename(ctx.request.body)
    })

    router.post(`/redis/connection/list`, async (ctx) => {
        ctx.body = await redisService.connectionList(ctx.request.body)
    })
    router.post(`/redis/connection/update`, async (ctx) => {
        ctx.body = await redisService.connectionEdit(ctx.request.body)
    })
    router.post(`/redis/connection/create`, async (ctx) => {
        ctx.body = await redisService.connectionCreate(ctx.request.body)
    })
    router.post(`/redis/connection/delete`, async (ctx) => {
        ctx.body = await redisService.connectionDelete(ctx.request.body)
    })
    router.post(`/redis/flush`, async (ctx) => {
        ctx.body = await redisService.flush(ctx.request.body)
    })
    router.post(`/redis/flushAll`, async (ctx) => {
        ctx.body = await redisService.flushAll(ctx.request.body)
    })
    router.post(`/redis/gen2000`, async (ctx) => {
        ctx.body = await redisService.gen2000(ctx.request.body)
    })

    router.get(`/mysql`, async (ctx) => {
        ctx.body = await mySqlService.index()
    })

    router.post(`/mysql/connect`, async (ctx) => {
        ctx.body = await mySqlService.connect(ctx.request.body)
    })

    router.post(`/mysql/reconnect`, async (ctx) => {
        ctx.body = await mySqlService.reconnect(ctx.request.body)
    })

    router.post(`/mysql/databases`, async (ctx) => {
        ctx.body = await mySqlService.databases(ctx.request.body)
    })
    router.post(`/mysql/schemas`, async (ctx) => {
        ctx.body = await mySqlService.schemas(ctx.request.body)
    })
    router.post(`/mysql/tables`, async (ctx) => {
        ctx.body = await mySqlService.tables(ctx.request.body)
    })

    router.post(`/mysql/exportTableData`, async (ctx) => {
        ctx.body = await mySqlService.exportTableData(ctx.request.body)
    })
    router.get(`/mysql/exportDataDownload`, async (ctx) => {
        const fileName = 'data.sql'
        ctx.set('Content-disposition', `attachment; filename*=UTF-8''${fileName}`)
        ctx.set('Content-Type', 'application/octet-stream')
        ctx.body = await mySqlService.exportDataDownload(ctx.request.query)
    })
    router.post(`/mysql/runSqls`, async (ctx) => {
        ctx.body = await mySqlService.runSqls(ctx.request.body)
    })
    router.post(`/mysql/createFunction`, async (ctx) => {
        ctx.body = await mySqlService.createFunction(ctx.request.body)
    })
    router.post(`/mysql/task/detail`, async (ctx) => {
        ctx.body = await mySqlService.taskDetail(ctx.request.body)
    })

    router.post(`/mysql/execSqlSimple`, async (ctx) => {
        ctx.body = await mySqlService.execSqlSimple(ctx.request.body)
    })

    router.post(`/mysql/execSql`, async (ctx) => {
        ctx.body = await mySqlService.execSql(ctx.request.body)
    })
    router.post(`/mysql/backup`, async (ctx) => {
        ctx.body = await mySqlService.backup(ctx.request.body)
    })

    router.post(`/mysql/tableDetail`, async (ctx) => {
        ctx.body = await mySqlService.tableDetail(ctx.request.body)
    })

    router.post(`/mysql/tableInfo`, async (ctx) => {
        ctx.body = await mySqlService.tableDetailOld(ctx.request.body)
    })

    router.post(`/mysql/history/list`, async (ctx) => {
        ctx.body = await mySqlService.historyList(ctx.request.body)
    })

    router.post(`/mysql/history/clear`, async (ctx) => {
        ctx.body = await mySqlService.historyClear(ctx.request.body)
    })

    router.post(`/mysql/sql/list`, async (ctx) => {
        ctx.body = await mySqlService.sqlList(ctx.request.body)
    })

    router.post(`/mysql/sql/create`, async (ctx) => {
        ctx.body = await mySqlService.sqlCreate(ctx.request.body)
    })

    router.post(`/mysql/sql/remove`, async (ctx) => {
        ctx.body = await mySqlService.sqlRemove(ctx.request.body)
    })

    router.post(`/mysql/connection/list`, async (ctx) => {
        ctx.body = await mySqlService.connectionList(ctx.request.body)
    })
    router.post(`/mysql/connection/update`, async (ctx) => {
        ctx.body = await mySqlService.connectionEdit(ctx.request.body)
    })
    router.post(`/mysql/connection/create`, async (ctx) => {
        ctx.body = await mySqlService.connectionCreate(ctx.request.body)
    })
    router.post(`/mysql/connection/delete`, async (ctx) => {
        ctx.body = await mySqlService.connectionDelete(ctx.request.body)
    })

    router.post(`/mysql/compare`, async (ctx) => {
        ctx.body = await mySqlService.compare(ctx.request.body)
    })

    router.post(`/mysql/connectionTables`, async (ctx) => {
        ctx.body = await mySqlService.connectionDatabases(ctx.request.body)
    })
    router.post(`/mysql/connectionCompareData`, async (ctx) => {
        ctx.body = await mySqlService.connectionCompareData(ctx.request.body)
    })

    router.get(`/git`, async (ctx) => {
        ctx.body = await gitService.home(ctx.request.body)
    })
    router.post(`/git/version`, async (ctx) => {
        ctx.body = await gitService.version(ctx.request.body)
    })
    router.post(`/git/project`, async (ctx) => {
        ctx.body = await gitService.projectInfo(ctx.request.body)
    })
    router.post(`/git/add`, async (ctx) => {
        ctx.body = await gitService.add(ctx.request.body)
    })
    router.post(`/git/diff`, async (ctx) => {
        ctx.body = await gitService.diff(ctx.request.body)
    })
    router.post(`/git/remote/list`, async (ctx) => {
        ctx.body = await gitService.remote(ctx.request.body)
    })
    router.post(`/git/stash/list`, async (ctx) => {
        ctx.body = await gitService.stashList(ctx.request.body)
    })
    router.post(`/git/stash/create`, async (ctx) => {
        ctx.body = await gitService.stashCreate(ctx.request.body)
    })
    router.post(`/git/stash/apply`, async (ctx) => {
        ctx.body = await gitService.stashApply(ctx.request.body)
    })
    router.post(`/git/stash/delete`, async (ctx) => {
        ctx.body = await gitService.stashDelete(ctx.request.body)
    })
    router.post(`/git/stash/clear`, async (ctx) => {
        ctx.body = await gitService.stashClear(ctx.request.body)
    })
    router.post(`/git/reset`, async (ctx) => {
        ctx.body = await gitService.reset(ctx.request.body)
    })
    router.post(`/git/fileDiscard`, async (ctx) => {
        ctx.body = await gitService.fileDiscard(ctx.request.body)
    })
    router.post(`/git/commit/list`, async (ctx) => {
        ctx.body = await gitService.commitList(ctx.request.body)
    })
    router.post(`/git/graph`, async (ctx) => {
        ctx.body = await gitService.graph(ctx.request.body)
    })
    router.post(`/git/tag/list`, async (ctx) => {
        ctx.body = await gitService.tagList(ctx.request.body)
    })
    router.post(`/git/tag/remoteList`, async (ctx) => {
        ctx.body = await gitService.tagRemoteList(ctx.request.body)
    })
    router.post(`/git/tag/create`, async (ctx) => {
        ctx.body = await gitService.tagCreate(ctx.request.body)
    })
    router.post(`/git/tag/delete`, async (ctx) => {
        ctx.body = await gitService.tagDelete(ctx.request.body)
    })
    router.post(`/git/tag/deleteRemote`, async (ctx) => {
        ctx.body = await gitService.tagDeleteRemote(ctx.request.body)
    })
    router.post(`/git/tag/push`, async (ctx) => {
        ctx.body = await gitService.tagPush(ctx.request.body)
    })
    router.post(`/git/branch`, async (ctx) => {
        ctx.body = await gitService.branchList(ctx.request.body)
    })
    router.post(`/git/branch/create`, async (ctx) => {
        ctx.body = await gitService.branchCreate(ctx.request.body)
    })
    router.post(`/git/branch/delete`, async (ctx) => {
        ctx.body = await gitService.branchDelete(ctx.request.body)
    })
    router.post(`/git/branch/rename`, async (ctx) => {
        ctx.body = await gitService.branchRename(ctx.request.body)
    })
    router.post(`/git/status`, async (ctx) => {
        ctx.body = await gitService.status(ctx.request.body)
    })
    router.post(`/git/commit`, async (ctx) => {
        ctx.body = await gitService.commit(ctx.request.body)
    })
    router.post(`/git/project/list`, async (ctx) => {
        ctx.body = await gitService.projectList(ctx.request.body)
    })
    router.post(`/git/project/create`, async (ctx) => {
        ctx.body = await gitService.projectCreate(ctx.request.body)
    })
    router.post(`/git/project/delete`, async (ctx) => {
        ctx.body = await gitService.projectDelete(ctx.request.body)
    })
    router.post(`/git/project/update`, async (ctx) => {
        ctx.body = await gitService.projectUpdate(ctx.request.body)
    })
    router.post(`/git/remote/create`, async (ctx) => {
        ctx.body = await gitService.remoteCreate(ctx.request.body)
    })
    router.post(`/git/push`, async (ctx) => {
        ctx.body = await gitService.push(ctx.request.body)
    })
    router.post(`/git/fetch`, async (ctx) => {
        ctx.body = await gitService.fetch(ctx.request.body)
    })
    router.post(`/git/pull`, async (ctx) => {
        ctx.body = await gitService.pull(ctx.request.body)
    })
    router.post(`/git/checkout`, async (ctx) => {
        ctx.body = await gitService.checkout(ctx.request.body)
    })
    router.post(`/git/cherryPick`, async (ctx) => {
        ctx.body = await gitService.cherryPick(ctx.request.body)
    })
    router.post(`/git/show`, async (ctx) => {
        ctx.body = await gitService.show(ctx.request.body)
    })
    router.post(`/git/commitFileChanged`, async (ctx) => {
        ctx.body = await gitService.commitFileChanged(ctx.request.body)
    })
    router.post(`/git/cat`, async (ctx) => {
        ctx.body = await gitService.cat(ctx.request.body)
    })
    router.post(`/git/info`, async (ctx) => {
        ctx.body = await gitService.getInfo(ctx.request.body)
    })
    router.post(`/git/getSshPublicKey`, async (ctx) => {
        ctx.body = await gitService.getSshPublicKey(ctx.request.body)
    })
    router.post(`/git/getGlobalConfig`, async (ctx) => {
        ctx.body = await gitService.getGlobalConfig(ctx.request.body)
    })
    router.post(`/git/setGlobalConfig`, async (ctx) => {
        ctx.body = await gitService.setGlobalConfig(ctx.request.body)
    })
    router.post(`/git/getConfig`, async (ctx) => {
        ctx.body = await gitService.getConfig(ctx.request.body)
    })
    router.post(`/git/setConfig`, async (ctx) => {
        ctx.body = await gitService.setConfig(ctx.request.body)
    })
    router.post(`/git/checkoutFile`, async (ctx) => {
        ctx.body = await gitService.checkoutFile(ctx.request.body)
    })
    router.post(`/git/merge`, async (ctx) => {
        ctx.body = await gitService.merge(ctx.request.body)
    })
    router.post(`/git/command`, async (ctx) => {
        ctx.body = await gitService.command(ctx.request.body)
    })
    router.post(`/git/deleteFile`, async (ctx) => {
        ctx.body = await gitService.deleteFile(ctx.request.body)
    })
    router.post(`/git/userConfig`, async (ctx) => {
        ctx.body = await gitService.userConfig(ctx.request.body)
    })
    router.post(`/git/userConfig/update`, async (ctx) => {
        ctx.body = await gitService.userConfigUpdate(ctx.request.body)
    })
    router.post(`/git/fileContent`, async (ctx) => {
        ctx.body = await gitService.fileContent(ctx.request.body)
    })
    router.post(`/git/blame`, async (ctx) => {
        ctx.body = await gitService.blame(ctx.request.body)
    })
    

    router.get(`/file`, async (ctx) => {
        ctx.body = await fileService.home(ctx.request.body)
    })
    router.post(`/file/info`, async (ctx) => {
        ctx.body = await fileService.info(ctx.request.body)
    })
    router.post(`/file/stat`, async (ctx) => {
        ctx.body = await fileService.stat(ctx.request.body)
    })
    router.post(`/file/list`, async (ctx) => {
        ctx.body = await fileService.fileList(ctx.request.body)
    })
    router.post(`/file/read`, async (ctx) => {
        ctx.body = await fileService.read(ctx.request.body)
    })
    router.post(`/file/write`, async (ctx) => {
        ctx.body = await fileService.write(ctx.request.body)
    })
    router.post(`/file/modeUpdate`, async (ctx) => {
        ctx.body = await fileService.modeUpdate(ctx.request.body)
    })
    router.post(`/file/create`, async (ctx) => {
        ctx.body = await fileService.create(ctx.request.body)
    })
    router.post(`/file/delete`, async (ctx) => {
        ctx.body = await fileService.delete(ctx.request.body)
    })
    router.post(`/file/rename`, async (ctx) => {
        ctx.body = await fileService.rename(ctx.request.body)
    })
    router.get(`/file/imagePreview`, async (ctx) => {
        const { sourceType } = ctx.request.query
        const path = (ctx.request.query.path as any) as string
        if (path.endsWith('.svg')) {
            ctx.set('Content-Type', 'image/svg+xml')
        }
        if (path.endsWith('.pdf')) {
            ctx.set('Content-Type', 'application/pdf')
        }

        ctx.body = await fileService.imagePreview(ctx.request.query)
    })
    router.get(`/file/download`, async (ctx) => {
        ctx.set('Content-disposition', `attachment; filename*=UTF-8''${urlencode(ctx.request.query.fileName)}`)
        ctx.set('Content-Type', 'application/octet-stream')
        ctx.body = await fileService.download(ctx.request.query)
    })
    router.post(`/file/downloadFromUrl`, async (ctx) => {
        ctx.body = await fileService.downloadFromUrl(ctx.request.body)
    })
    router.post(`/file/collection/list`, async (ctx) => {
        ctx.body = await fileService.collectionList(ctx.request.body)
    })
    router.post(`/file/collection/create`, async (ctx) => {
        ctx.body = await fileService.collectionCreate(ctx.request.body)
    })
    router.post(`/file/openInFinder`, async (ctx) => {
        ctx.body = await fileService.openInFinder(ctx.request.body)
    })
    router.post(`/file/openInOs`, async (ctx) => {
        ctx.body = await fileService.openInOs(ctx.request.body)
    })
    router.post(`/file/openInVsCode`, async (ctx) => {
        ctx.body = await fileService.openInVsCode(ctx.request.body)
    })
    router.post(`/openInTerminal`, async (ctx) => {
        ctx.body = await fileService.openInTerminal(ctx.request.body)
    })
    router.post(`/file/copy`, async (ctx) => {
        ctx.body = await fileService.copy(ctx.request.body)
    })

    router.post(`/aliyun/data`, async (ctx) => {
        ctx.body = await fileService.aliyun(ctx.request.body)
    })
    router.post(`/aliyun/update`, async (ctx) => {
        ctx.body = await fileService.aliyunUpdate(ctx.request.body)
    })
    

    router.post(`/swagger/list`, async (ctx) => {
        ctx.body = await fileService.swaggerList(ctx.request.body)
    })
    router.post(`/swagger/detail`, async (ctx) => {
        ctx.body = await fileService.swaggerDetail(ctx.request.body)
    })
    router.post(`/swagger/update`, async (ctx) => {
        ctx.body = await fileService.swaggerEdit(ctx.request.body)
    })
    router.post(`/swagger/create`, async (ctx) => {
        ctx.body = await fileService.swaggerCreate(ctx.request.body)
    })
    router.post(`/swagger/delete`, async (ctx) => {
        ctx.body = await fileService.swaggerDelete(ctx.request.body)
    })

    router.post(`/project/list`, async (ctx) => {
        ctx.body = await fileService.projectList(ctx.request.body)
    })
    router.post(`/project/create`, async (ctx) => {
        ctx.body = await fileService.projectCreate(ctx.request.body)
    })
    router.post(`/project/update`, async (ctx) => {
        ctx.body = await fileService.projectUpdate(ctx.request.body)
    })
    router.post(`/project/delete`, async (ctx) => {
        ctx.body = await fileService.projectDelete(ctx.request.body)
    })

    router.post(`/service/list`, async (ctx) => {
        ctx.body = await fileService.serviceList(ctx.request.body)
    })
    router.post(`/service/create`, async (ctx) => {
        ctx.body = await fileService.serviceCreate(ctx.request.body)
    })
    router.post(`/service/update`, async (ctx) => {
        ctx.body = await fileService.serviceUpdate(ctx.request.body)
    })
    router.post(`/service/remove`, async (ctx) => {
        ctx.body = await fileService.serviceRemove(ctx.request.body)
    })
    
    
    
    router.post(`/file/upload`, koaBody({
            multipart: true,  // 支持表单上传
            formidable: {
                maxFileSize: 10 * 1024 * 1024 * 1024, // 修改文件大小限制，默认位2M
            },
        }),async (ctx) => {
        // console.log('api/file', ctx.request.body)
        const file = ctx.request.files.file
        // console.log('ctx.request.files', file)
        // console.log('ctx.request', ctx.request)

        // const { text } = ctx.request.body

        // let file = ctx.request.file; // 获取上传文件
        // // 创建可读流
        // const reader = fs.createReadStream(ctx.request.files['image']['path']);
        // let filePath = `/shareSource/img/my_blog_img` + `/${ctx.request.files['image']['name']}`;
        // let remotefilePath = `http://www.xxxx.com:8887/img/my_blog_img` + `/${ctx.request.files['image']['name']}`;
        // // 创建可写流
        // const upStream = fs.createWriteStream(filePath);
        // // 可读流通过管道写入可写流
        // reader.pipe(upStream);
        // return ctx.body = {
        //     url: remotefilePath,
        //     message: "文件上传成功",
        //     cc: 0
        // }   
            
        // 创建可读流
        // console.log('pp', ctx.request.files['file']['path'])
        // const reader = fs.createReadStream(ctx.request.files['file']['path']);
        // let filePath = path.join(process.cwd(), file.name)
        // // remotefilePath = `http://yourServerHostAndPath/images/${ctx.request.files['file']['name']}`;
        // // 创建可写流
        // const upStream = fs.createWriteStream(filePath);
        // // 可读流通过管道写入可写流
        // reader.pipe(upStream);
        
        // ctx.body = 'ok';

        // console.log(filePath)
        // ctx.response.body = 'haha'
        // console.log(text)
        console.log('ctx.request', ctx.request)
        console.log('ctx.request.files', ctx.request.files)
        console.log('ctx.request.body', ctx.request.body)

        const tmpPath = ctx.request.files['file']['path']
        ctx.body = await fileService.upload(ctx.request.body, tmpPath)
    })

    router.post(`/zip/list`, async (ctx) => {
        ctx.body = await fileService.zipList(ctx.request.body)
    })

    router.post(`/oss/connect`, async (ctx) => {
        ctx.body = await fileService.ossConnect(ctx.request.body)
    })
    router.post(`/oss/list`, async (ctx) => {
        ctx.body = await fileService.ossList(ctx.request.body)
    })
    router.post(`/oss/accessKey/list`, async (ctx) => {
        ctx.body = await fileService.accessKeyList(ctx.request.body)
    })
    router.post(`/oss/accessKey/update`, async (ctx) => {
        ctx.body = await fileService.accessKeyEdit(ctx.request.body)
    })
    router.post(`/oss/accessKey/create`, async (ctx) => {
        ctx.body = await fileService.accessKeyCreate(ctx.request.body)
    })
    router.post(`/oss/accessKey/delete`, async (ctx) => {
        ctx.body = await fileService.accessKeyDelete(ctx.request.body)
    })
    router.post(`/oss/info`, async (ctx) => {
        ctx.body = await fileService.ossInfo(ctx.request.body)
    })
    router.post(`/s3/connect`, async (ctx) => {
        ctx.body = await fileService.s3Connect(ctx.request.body)
    })
    router.post(`/s3/connection/list`, async (ctx) => {
        ctx.body = await fileService.s3ConnectionList(ctx.request.body)
    })
    router.post(`/s3/info`, async (ctx) => {
        ctx.body = await fileService.s3Info(ctx.request.body)
    })

    router.post(`/webdav/connect`, async (ctx) => {
        ctx.body = await fileService.webdavConnect(ctx.request.body)
    })
    router.post(`/webdav/connection/list`, async (ctx) => {
        ctx.body = await fileService.webdavConnectionList(ctx.request.body)
    })
    router.post(`/webdav/connection/update`, async (ctx) => {
        ctx.body = await fileService.webdavConnectionEdit(ctx.request.body)
    })
    router.post(`/webdav/connection/create`, async (ctx) => {
        ctx.body = await fileService.webdavConnectionCreate(ctx.request.body)
    })
    router.post(`/webdav/connection/delete`, async (ctx) => {
        ctx.body = await fileService.webdavConnectionDelete(ctx.request.body)
    })

    router.post(`/sftp/connect`, async (ctx) => {
        ctx.body = await fileService.sftpConnect(ctx.request.body)
    })
    router.post(`/logger/list`, async (ctx) => {
        ctx.body = await fileService.loggerList(ctx.request.body)
    })
    router.post(`/logger/history`, async (ctx) => {
        ctx.body = await loggerService.historyList(ctx.request.body)
    })
    router.post(`/logger/history/push`, async (ctx) => {
        ctx.body = await loggerService.historyPush(ctx.request.body)
    })
    router.get(`/ssh`, async (ctx) => {
        ctx.body = await sshService.home(ctx.request.body)
    })
    router.post(`/ssh/connect`, async (ctx) => {
        ctx.body = await sshService.connect(ctx.request.body)
    })
    router.post(`/ssh/connection/list`, async (ctx) => {
        ctx.body = await sshService.connectionList(ctx.request.body)
    })
    router.post(`/ssh/connection/update`, async (ctx) => {
        ctx.body = await sshService.connectionEdit(ctx.request.body)
    })
    router.post(`/ssh/connection/monite`, async (ctx) => {
        ctx.body = await sshService.connectionMonite(ctx.request.body)
    })
    router.post(`/ssh/connection/create`, async (ctx) => {
        ctx.body = await sshService.connectionCreate(ctx.request.body)
    })
    router.post(`/ssh/connection/delete`, async (ctx) => {
        ctx.body = await sshService.connectionDelete(ctx.request.body)
    })
    router.post(`/ssh/command/list`, async (ctx) => {
        ctx.body = await sshService.commandList(ctx.request.body)
    })

    router.post(`/socket/tcp/connect`, async (ctx) => {
        ctx.body = await socketService.createTcpClient(ctx.request.body)
    })
    router.post(`/socket/tcp/close`, async (ctx) => {
        ctx.body = await socketService.tcpClose(ctx.request.body)
    })
    router.post(`/socket/tcp/send`, async (ctx) => {
        ctx.body = await socketService.tcpSend(ctx.request.body)
    })
    router.post(`/socket/tcp/config`, async (ctx) => {
        ctx.body = await socketService.tcpConfig(ctx.request.body)
    })
    router.post(`/socket/udp/send`, async (ctx) => {
        ctx.body = await socketService.udpSend(ctx.request.body)
    })
    router.post(`/socket/udp/createServer`, async (ctx) => {
        ctx.body = await socketService.udpCreateServer(ctx.request.body)
    })
    router.post(`/socket/tcp/createServer`, async (ctx) => {
        ctx.body = await socketService.tcpCreateServer(ctx.request.body)
    })
    router.post(`/socket/tcp/closeServer`, async (ctx) => {
        ctx.body = await socketService.tcpCloseServer(ctx.request.body)
    })
    router.post(`/socket/tcp/serverSend`, async (ctx) => {
        ctx.body = await socketService.serverSend(ctx.request.body)
    })
    router.post(`/socket/tcp/serverConfig`, async (ctx) => {
        ctx.body = await socketService.serverConfig(ctx.request.body)
    })
    router.post(`/socket/tcp/clients`, async (ctx) => {
        ctx.body = await socketService.tcpClients(ctx.request.body)
    })
    router.post(`/socket/tcp/closeClient`, async (ctx) => {
        ctx.body = await socketService.tcpCloseClient(ctx.request.body)
    })
    router.post(`/socket/tcp/closeAllServer`, async (ctx) => {
        ctx.body = await socketService.closeAllTcpServer(ctx.request.body)
    })
    router.post(`/socket/udp/closeAllServer`, async (ctx) => {
        ctx.body = await socketService.closeAllUdpServer(ctx.request.body)
    })
    router.post(`/socket/udp/closeServer`, async (ctx) => {
        ctx.body = await socketService.closeUdpServer(ctx.request.body)
    })
    router.post(`/socket/udp/serverSend`, async (ctx) => {
        ctx.body = await socketService.udpServerSend(ctx.request.body)
    })
    
    router.post(`/socket/tcp/closeAllClient`, async (ctx) => {
        ctx.body = await socketService.closeAllTcpClient(ctx.request.body)
    })

    router.post(`/websocket/connection/list`, async (ctx) => {
        ctx.body = await socketService.websocketConnectionList(ctx.request.body)
    })
    router.post(`/websocket/history/list`, async (ctx) => {
        ctx.body = await socketService.websocketHistoryList(ctx.request.body)
    })
    router.post(`/websocket/createServer`, async (ctx) => {
        ctx.body = await socketService.createWebSocketServer(ctx.request.body)
    })
    router.post(`/websocket/closeServer`, async (ctx) => {
        ctx.body = await socketService.closeWebSocketServer(ctx.request.body)
    })
    router.post(`/websocket/clients`, async (ctx) => {
        ctx.body = await socketService.clients(ctx.request.body)
    })
    router.post(`/websocket/sendToClient`, async (ctx) => {
        ctx.body = await socketService.sendToClient(ctx.request.body)
    })
    router.post(`/websocket/closeClient`, async (ctx) => {
        ctx.body = await socketService.closeClient(ctx.request.body)
    })

    router.post(`/http/server/createServer`, async (ctx) => {
        ctx.body = await socketService.httpCreateServer(ctx.request.body)
    })
    router.post(`/http/server/closeServer`, async (ctx) => {
        ctx.body = await socketService.closeHttpServer(ctx.request.body)
    })
    router.post(`/https/server/createServer`, async (ctx) => {
        ctx.body = await socketService.httpsCreateServer(ctx.request.body)
    })
    router.post(`/http/closeAllServer`, async (ctx) => {
        ctx.body = await socketService.closeAllServer(ctx.request.body)
    })
    router.post(`/https/server/closeServer`, async (ctx) => {
        ctx.body = await socketService.closeHttpsServer(ctx.request.body)
    })
    router.post(`/http2/server/createServer`, async (ctx) => {
        ctx.body = await socketService.http2CreateServer(ctx.request.body)
    })
    router.post(`/http2/server/closeServer`, async (ctx) => {
        ctx.body = await socketService.closeHttp2Server(ctx.request.body)
    })
    router.post(`/http/proxy/create`, async (ctx) => {
        ctx.body = await proxyService.create(ctx.request.body)
    })
    router.post(`/http/proxy/close`, async (ctx) => {
        ctx.body = await proxyService.close(ctx.request.body)
    })
    router.post(`/https/proxy/create`, async (ctx) => {
        ctx.body = await proxyService.createHttpsProxy(ctx.request.body)
    })
    router.post(`/https/proxy/close`, async (ctx) => {
        ctx.body = await proxyService.closeHttpsProxy(ctx.request.body)
    })
    router.post(`/https/proxy/getRootCert`, async (ctx) => {
        ctx.body = await proxyService.getRootCert(ctx.request.body)
    })
    router.post(`/socket/proxy/create`, async (ctx) => {
        ctx.body = await proxyService.createSocket(ctx.request.body)
    })
    router.post(`/socket/proxy/close`, async (ctx) => {
        ctx.body = await proxyService.closeSocket(ctx.request.body)
    })

    router.post(`/openai/info`, async (ctx) => {
        ctx.body = await openaiService.info(ctx.request.body)
    })
    

    router.post(`/api/info`, async (ctx) => {
        ctx.body = await httpService.apiInfo(ctx.request.body)
    })

    router.post(`/api/info`, async (ctx) => {
        ctx.body = await httpService.apiInfo(ctx.request.body)
    })

    router.post(`/docs/path`, async (ctx) => {
        ctx.body = {
            path: path.resolve(__dirname, '../docs'),
        }
    })

    router.post(`/http/proxy`, async (ctx) => {
        ctx.body = await httpService.proxy(ctx, ctx.request.body)
    })
    router.post(`/http/client/request`, async (ctx) => {
        ctx.body = await httpService.httpRequest(ctx, ctx.request.body)
    })
    router.all(`/http/debug`, async (ctx) => {
        ctx.body = await httpService.debug({
            body: ctx.request.body,
            query: ctx.request.query,
            url: ctx.request.url,
            headers: ctx.request.headers,
            method: ctx.request.method,
        })
    })

    router.post(`/mongo/connection/list`, async (ctx) => {
        ctx.body = await mongoService.connectionList(ctx.request.body)
    })
    router.post(`/mongo/connection/create`, async (ctx) => {
        ctx.body = await mongoService.connectionCreate(ctx.request.body)
    })
    router.post(`/mongo/connection/update`, async (ctx) => {
        ctx.body = await mongoService.connectionUpdate(ctx.request.body)
    })
    router.post(`/mongo/connection/delete`, async (ctx) => {
        ctx.body = await mongoService.connectionDelete(ctx.request.body)
    })
    router.post(`/mongo/connect`, async (ctx) => {
        ctx.body = await mongoService.connect(ctx.request.body)
    })
    router.post(`/mongo/databases`, async (ctx) => {
        ctx.body = await mongoService.databases(ctx.request.body)
    })
    router.post(`/mongo/database/create`, async (ctx) => {
        ctx.body = await mongoService.databaseCreate(ctx.request.body)
    })
    router.post(`/mongo/database/drop`, async (ctx) => {
        ctx.body = await mongoService.databaseDrop(ctx.request.body)
    })
    router.post(`/mongo/collections`, async (ctx) => {
        ctx.body = await mongoService.collections(ctx.request.body)
    })
    router.post(`/mongo/collection/create`, async (ctx) => {
        ctx.body = await mongoService.collectionCreate(ctx.request.body)
    })
    router.post(`/mongo/collection/drop`, async (ctx) => {
        ctx.body = await mongoService.collectionDrop(ctx.request.body)
    })
    router.post(`/mongo/collection/clear`, async (ctx) => {
        ctx.body = await mongoService.collectionClear(ctx.request.body)
    })
    router.post(`/mongo/documents`, async (ctx) => {
        ctx.body = await mongoService.documents(ctx.request.body)
    })
    router.post(`/mongo/document/create`, async (ctx) => {
        ctx.body = await mongoService.documentCreate(ctx.request.body)
    })
    router.post(`/mongo/document/update`, async (ctx) => {
        ctx.body = await mongoService.documentUpdate(ctx.request.body)
    })
    router.post(`/mongo/document/updateByQuery`, async (ctx) => {
        ctx.body = await mongoService.documentUpdateByQuery(ctx.request.body)
    })
    router.post(`/mongo/document/removeByQuery`, async (ctx) => {
        ctx.body = await mongoService.documentRemoveByQuery(ctx.request.body)
    })
    router.post(`/mongo/document/remove`, async (ctx) => {
        ctx.body = await mongoService.documentRemove(ctx.request.body)
    })
    router.post(`/mongo/index/list`, async (ctx) => {
        ctx.body = await mongoService.indexList(ctx.request.body)
    })
    router.post(`/mongo/index/create`, async (ctx) => {
        ctx.body = await mongoService.indexCreate(ctx.request.body)
    })
    router.post(`/mongo/mock`, async (ctx) => {
        ctx.body = await mongoService.mock(ctx.request.body)
    })
    router.post(`/mongo/serverInfo`, async (ctx) => {
        ctx.body = await mongoService.serverInfo(ctx.request.body)
    })
    router.post(`/mqtt/publish`, async (ctx) => {
        ctx.body = await mqttService.publish(ctx.request.body)
    })
    router.post(`/mqtt/publish`, async (ctx) => {
        ctx.body = await mqttService.publish(ctx.request.body)
    })
    router.post(`/mqtt/connect`, async (ctx) => {
        ctx.body = await mqttService.connect(ctx.request.body)
    })
    router.post(`/mqtt/connection/list`, async (ctx) => {
        ctx.body = await mqttService.connectionList(ctx.request.body)
    })
    router.post(`/mqtt/connection/update`, async (ctx) => {
        ctx.body = await mqttService.connectionEdit(ctx.request.body)
    })
    router.post(`/mqtt/connection/create`, async (ctx) => {
        ctx.body = await mqttService.connectionCreate(ctx.request.body)
    })
    router.post(`/mqtt/connection/delete`, async (ctx) => {
        ctx.body = await mqttService.connectionDelete(ctx.request.body)
    })

    router.post(`/kafka/`, async (ctx) => {
        ctx.body = await kafkaService.index(ctx.request.body)
    })
    router.post(`/kafka/init`, async (ctx) => {
        ctx.body = await kafkaService.init(ctx.request.body)
    })
    router.post(`/kafka/topics`, async (ctx) => {
        ctx.body = await kafkaService.topics(ctx.request.body)
    })
    router.post(`/kafka/groups`, async (ctx) => {
        ctx.body = await kafkaService.groups(ctx.request.body)
    })
    router.post(`/kafka/groupDetail`, async (ctx) => {
        ctx.body = await kafkaService.groupDetail(ctx.request.body)
    })
    router.post(`/kafka/send`, async (ctx) => {
        ctx.body = await kafkaService.send(ctx.request.body)
    })
    router.post(`/kafka/subscribe`, async (ctx) => {
        ctx.body = await kafkaService.subscribe(ctx.request.body)
    })
    router.post(`/kafka/topic/remove`, async (ctx) => {
        ctx.body = await kafkaService.removeTopic(ctx.request.body)
    })
    router.post(`/kafka/group/remove`, async (ctx) => {
        ctx.body = await kafkaService.removeGroup(ctx.request.body)
    })
    router.post(`/docker/run`, async (ctx) => {
        ctx.body = await dockerService.run(ctx.request.body)
    })
    router.post(`/docker/connection/list`, async (ctx) => {
        ctx.body = await dockerService.connectionList(ctx.request.body)
    })
    router.post(`/docker/container/list`, async (ctx) => {
        ctx.body = await dockerService.containers(ctx.request.body)
    })
    router.post(`/docker/container/stop`, async (ctx) => {
        ctx.body = await dockerService.containerStop(ctx.request.body)
    })
    router.post(`/docker/container/start`, async (ctx) => {
        ctx.body = await dockerService.containerStart(ctx.request.body)
    })
    router.post(`/docker/container/remove`, async (ctx) => {
        ctx.body = await dockerService.containerRemove(ctx.request.body)
    })
    router.post(`/docker/images`, async (ctx) => {
        ctx.body = await dockerService.images(ctx.request.body)
    })
    router.post(`/docker/image/remove`, async (ctx) => {
        ctx.body = await dockerService.imageRemove(ctx.request.body)
    })
    router.post(`/docker/services`, async (ctx) => {
        ctx.body = await dockerService.services(ctx.request.body)
    })
    router.post(`/docker/service/remove`, async (ctx) => {
        ctx.body = await dockerService.serviceRemove(ctx.request.body)
    })
    router.post(`/docker/networks`, async (ctx) => {
        ctx.body = await dockerService.networks(ctx.request.body)
    })
    router.post(`/docker/network/remove`, async (ctx) => {
        ctx.body = await dockerService.networkRemove(ctx.request.body)
    })
    router.post(`/docker/volumes`, async (ctx) => {
        ctx.body = await dockerService.volumes(ctx.request.body)
    })
    router.post(`/docker/volume/detail`, async (ctx) => {
        ctx.body = await dockerService.volumeDetail(ctx.request.body)
    })
    router.post(`/docker/volume/remove`, async (ctx) => {
        ctx.body = await dockerService.volumeRemove(ctx.request.body)
    })
    router.post(`/lowCode/list`, async (ctx) => {
        ctx.body = await lowCodeService.list(ctx.request.body)
    })
    router.post(`/lowCode/detail`, async (ctx) => {
        ctx.body = await lowCodeService.detail(ctx.request.body)
    })
    
    

    app.use(async (ctx, next) => {
        // console.log('跨域？')
        ctx.set('Access-Control-Allow-Origin', '*');
        ctx.set('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild');
        ctx.set('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
        ctx.set('Access-Control-Max-Age', `${5 * 60}`)
    
        if (ctx.method == 'OPTIONS') {
            // console.log('OPTIONS')
            ctx.status = 200
            ctx.body = 'cros ok'
        } else {
            //   await next();
            await next();
        }
    
    })

    app.use(async (ctx, next) => {
        try {
            await next();
        }
        catch (err) {
            console.error(err)
            ctx.status = 500
            ctx.body = {
                message: err.message || 'Unknown Error'
            }
        }
    })

    app.use(async (ctx, next) => {
        // console.log('我的静态文件', ctx.url)
        // console.log('ctx.path', ctx.path)
        // /tcp/client
        

        const staticRootPath = path.join(__dirname, staticPath)
        // console.log('staticRootPath', staticRootPath)

        if (ctx.url == '/' || ctx.path.startsWith('/pages')) {
            ctx.set('content-type', 'text/html')
            ctx.status = 200
            // ctx.body = fs.readFileSync('/Users/yunser/Desktop/_a_1.png')    
            const htmlPath = path.join(staticRootPath, 'index.html')
            ctx.body = fs.readFileSync(htmlPath)    
            // ctx.body = path.join(staticRootPath, 'index.html')
            // await next()
        }
        else {
            const filePath = path.join(staticRootPath, ctx.url)
            // const filePath = staticPath + ctx.url
            // console.log('filePath', filePath)
            if (fs.existsSync(filePath)) {
                // console.log('存在', )
                await send(ctx, ctx.path, {
                    root: staticRootPath,
                })
                // ctx.status = 200
                // ctx.body = fs.readFileSync(filePath)    
                // ctx.body = path.join(staticRootPath, ctx.url)
            }
            else {
                // console.log('不存在', )
            }
        }
        
        await next()
        // ctx.status = 200
        // ctx.set('content-type', 'image/png')
        // ctx.body = fs.readFileSync('/Users/yunser/Desktop/_a_1.png')

    })

    // app.use(statics(
    //     path.join(__dirname, staticPath)
    // ))
    // app.use(koaBody({
    //     multipart:true, // 支持文件上传
    //     encoding:'gzip',
    //     formidable:{
    //         uploadDir:path.join(__dirname,'public/upload/'), // 设置文件上传目录
    //         keepExtensions: true,    // 保持文件的后缀
    //         maxFieldsSize:2 * 1024 * 1024, // 文件上传大小
    //         onFileBegin:(name,file) => { // 文件上传前的设置

    //         console.log(`name: ${name}`);
    //         console.log(file);
    //         },
    //     }
    //     }));
    app.use(koaBody({
        // formLimit:"10mb",
            // jsonLimit:"10mb"
        formLimit: "20mb",
        jsonLimit: "20mb",
        textLimit: "20mb",
    }))
    // app.use(koaBody({
    //     multipart: true,  // 支持表单上传
    //     formidable: {
    //       maxFileSize: 10 * 1024 * 1024, // 修改文件大小限制，默认位2M
    //     }
    //   }))
    app.use(router.routes())
    
    // app.use(async ctx => {
    //   ctx.body = 'Hello World';
    // });
    
    app.listen(port)
    
    
    // console.log('ok')
}


process.on('uncaughtException', function (err) {
    console.log('process/uncaughtException')
    console.log(err)
    console.log(err.stack)
})
