// import { uid } from "uid";
import * as fs from 'fs'
// import * as mkdirp from 'mkdirp'
// import {deleteAsync} from 'del';
import * as path from 'path'
const nodePath = path
// import moment = require("moment")
// import * as cp from 'child-process'
// const cp = require('child-process');
// console.log('cp', cp)
import * as SftpClient from 'ssh2-sftp-client'
import { exec, spawn } from "child_process";
import { uid } from 'uid'
import tsdav, { DAVNamespace } from 'tsdav';
import * as os from 'os'
import * as Url from 'url-parse'
// import axios from 'axios';
import * as sqlite3 from 'sqlite3'
import moment = require('moment');
import { closeWebSocketBySftpConnectionId } from './ssh.service';
import * as mkdirp from 'mkdirp'
import * as https from 'https'
// const { mkdirp } = require('mkdirp')

const FormData = require('form-data')

function localExec(cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(cmd, (err, stdout, stderr) => {
            console.log('err', err)
            if (err) {
                reject(err)
                return
            }
            console.log('stdout', stdout)
            resolve(stdout)
        })
    })
}

const client = sqlite3.verbose()


var JSZip = require("jszip");
let OSS = require('ali-oss')
const axios = require('axios')


const g_webdav = {}
const g_publicStores = {}
const g_s3Map = {}

async function loadJson(path, defaultValue = null) {
    // console.log('path', path)
    const content = fs.readFileSync(path, 'utf-8')
    // console.log('content', content)
    if (content) {
        return JSON.parse(content)
    }
    return defaultValue
}

function getZipList(zipPath: string): Promise<any[]> {
    return new Promise((resolve) => {
        fs.readFile(zipPath, function(err, data) {
            if (err) throw err;
            JSZip.loadAsync(data).then(function (zip) {
                // ...
                // console.log('zip', zip)
                const { files } = zip
                const fileNames = Object.keys(files)
                const list = []
                for (let fileName of fileNames) {
                    list.push(files[fileName])
                }
                resolve(list)
            });
        });
    })
}

// let Client = require('ssh2-sftp-client');
// import trash from 'trash'
// import * as os from 'os'
// import('trash').then(transh => {
//     console.log('transh', transh)
// })
// console.log('trash', trash)

// async function load() {
//     const trash = await import('trash')
//     console.log('trash', trash)
// }
// load()

/**
 * 删除整个文件夹
 * @param {*} path
 */
function rmDir(path) {
    if (fs.existsSync(path)) {
        const dirs = [];

        const files = fs.readdirSync(path);

        files.forEach(async (file) => {
            const childPath = path + "/" + file;
            if (fs.statSync(childPath).isDirectory()) {
                rmDir(childPath);
                //   dirs.push(childPath);
            } else {
                fs.unlinkSync(childPath);
            }
        });

        //   dirs.forEach((fir) => fs.rmdirSync(fir));
        fs.rmdirSync(path)
    }
    console.log('ok',)
}

function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(null)
        }, ms)
    })
}

let g_connections = {}


// .then(() => {
//     return sftp.list('/root');
//   }).then(data => {
//     console.log('the data info', data);
//   }).catch(err => {
//     console.log(err, 'catch error');
//   });

const USER_HOME = process.env.HOME || process.env.USERPROFILE

let yunserFolder = path.resolve(USER_HOME, '.yunser') // TODO package，npm install cmd-core
// if (!fs.existsSync(yunserFolder)) {
//     // console.log('创建目录')
//     fs.mkdirSync(yunserFolder)
// }

let appFolder = path.resolve(yunserFolder, 'dms-cli') // TODO package，npm install cmd-core
// if (!fs.existsSync(appFolder)) {
//     fs.mkdirSync(appFolder)
// }

function getTempPath() {
    const fileName = `tmp-${uid(16)}.file`
    return nodePath.join(appFolder, fileName)
}

let collectionDbFilePath = path.resolve(appFolder, 'file.collection.json')
if (!fs.existsSync(collectionDbFilePath)) {
    // console.log('创建目录')
    // fs.mkdirSync(yunserFolder)
    fs.writeFileSync(collectionDbFilePath, '[]', 'utf8')
}

let ossDbFilePath = path.resolve(appFolder, 'oss-v2.json')
if (!fs.existsSync(ossDbFilePath)) {
    // console.log('创建目录')
    // fs.mkdirSync(yunserFolder)
    fs.writeFileSync(ossDbFilePath, JSON.stringify({
        version: '2.0.0',
        accessKeys: [],
        favoriteBuckets: []
    }, null, 4), 'utf8')
}

let s3DbFilePath = path.resolve(appFolder, 's3.connection.json')
if (!fs.existsSync(s3DbFilePath)) {
    // console.log('创建目录')
    // fs.mkdirSync(yunserFolder)
    fs.writeFileSync(s3DbFilePath, JSON.stringify([], null, 4), 'utf8')
}

let swaggerDbFilePath = path.resolve(appFolder, 'swagger.json')
if (!fs.existsSync(swaggerDbFilePath)) {
    // console.log('创建目录')
    // fs.mkdirSync(yunserFolder)
    const swaggerContent = [
        {
            id: '1',
            name: "Swagger Pet Store",
            url: 'https://petstore.swagger.io/v2/swagger.json'
        }
    ]
    fs.writeFileSync(swaggerDbFilePath, JSON.stringify(swaggerContent, null, 4), 'utf8')
}

let projectDbFilePath = path.resolve(appFolder, 'project.json')
if (!fs.existsSync(projectDbFilePath)) {
    // console.log('创建目录')
    // fs.mkdirSync(yunserFolder)
    const projectContent = {
        projects: [
            {
                id: '1',
                name: 'Example Project',
            }
        ]
    }
    fs.writeFileSync(projectDbFilePath, JSON.stringify(projectContent, null, 4), 'utf8')
}

let fileDbFilePath = path.resolve(appFolder, 'file.db')
const db = new client.Database(fileDbFilePath)
// db.run("CREATE TABLE file");

async function saveFile(path, stat) {
    const insertSql = `INSERT INTO file(id, path, type, update_time, size) VALUES('${uid(32)}', '${path}', ${1}, '${moment().format('YYYY-MM-DD HH:mm:ss')}', ${stat.size})
    ON CONFLICT (path) DO UPDATE SET update_time='${moment().format('YYYY-MM-DD HH:mm:ss')}';`
    console.log('insertSql', insertSql)
    db.run(insertSql)
}
// SELECT *,rowid "NAVICAT_ROWID" FROM "main"."file" 
// WHERE path like '%a_tool%'
// LIMIT 0,20
// {
//     const scanPath = '/Users/yunser/Desktop'
//     const fileNames = fs.readdirSync(scanPath)
//     for (let fileName of fileNames) {
//         const filePath =path.resolve(scanPath, fileName)
//         const stat = fs.statSync(filePath)
//         console.log('stat', stat)
//         saveFile(filePath, stat)
//     }
// }


const ossService = {
    // const list = await ossService.getAkList()
    async getAkList() {
        const content = fs.readFileSync(ossDbFilePath, 'utf-8') || '[]'
        const obj = JSON.parse(content)
        const aks = obj.accessKeys
        for (let ak of aks) {
            for (let bucket of ak.buckets) {
                bucket.isFavorite = !!obj.favoriteBuckets.find(b => b.name == bucket.name)
            }
        }
        return aks
    },

    // await ossService.saveAkList(list)
    async saveAkList(list) {
        const content = fs.readFileSync(ossDbFilePath, 'utf-8') || '[]'
        const obj = JSON.parse(content)
        obj.accessKeys = list
        fs.writeFileSync(ossDbFilePath, JSON.stringify(obj, null, 4), 'utf-8')  
    },
}

let loggerDbFilePath = path.resolve(appFolder, 'logger.json')

let webdavDbFilePath = path.resolve(appFolder, 'webdav.json')
if (!fs.existsSync(webdavDbFilePath)) {
    // console.log('创建目录')
    // fs.mkdirSync(yunserFolder)
    const exampleList = [
        {

        }
    ]
    fs.writeFileSync(webdavDbFilePath, JSON.stringify(exampleList, null, 4), 'utf8')
}



// let gitSettingFilePath = path.resolve(appFolder, 'git.settings.json')
// if (!fs.existsSync(gitSettingFilePath)) {
//     // console.log('创建目录')
//     // fs.mkdirSync(yunserFolder)
//     fs.writeFileSync(gitSettingFilePath, '{}', 'utf8')
// }

function handleFolder(folderPath, r = false) {

    const fileNames = fs.readdirSync(folderPath)
    const results = []
    for (let fileName of fileNames) {
        const filePath = path.resolve(folderPath, fileName)
        try {
            // const stat = fs.statSync(filePath)
            const stat = fs.lstatSync(filePath)
            // let type = stat.isFile() ? 'FILE' : 'DIRECTORY'
            // let path
            const node: any = {
                type: stat.isFile() ? 'FILE' : 'DIRECTORY',
                name: fileName,
                path: filePath,
                modifyTime: stat.mtime,
                createTime: stat.birthtime,
                accessTime: stat.atime,
                size: stat.size,
                // _stat: stat,
                isSymbolicLink: stat.isSymbolicLink() ? true : undefined,
                // _isFile: stat.isFile(),
                // _isDirectory: stat.isDirectory(),
            }
            if (stat.isSymbolicLink()) {
                const linkPath = fs.readlinkSync(filePath)
                let targetPath = linkPath
                if (linkPath.startsWith('.')) {
                    targetPath = nodePath.resolve(filePath, '..', linkPath)
                }
                // node._targetPath = targetPath
                // node._link = linkPath

                node.path = targetPath
                const _stat = fs.statSync(targetPath)
                node.type = _stat.isFile() ? 'FILE' : 'DIRECTORY'
            }
            if (r && stat.isDirectory()) {
                node.children = handleFolder(filePath, r)
            }
            results.push(node)
        }
        catch (err) {
            console.error(err)
            results.push({
                type: 'UNKNOWN',
                name: fileName,
                path: filePath,
            })
        }
    }
    return results
}

function _copy(fromPath, toPath) {
    return new Promise((resolve => {
        const reader = fs.createReadStream(fromPath)
        const upStream = fs.createWriteStream(toPath)
        reader.pipe(upStream)
            .on('close', () => {
                resolve(null)
            })
            // .end(() => {
            // })
    }))
}

const folderPath = '/Users/yunser/app/dms-new'
const g_platform = os.platform()

export class FileService {

    async getSftpClient(body): Promise<SftpClient> {
        const { sourceType, path } = body
        return g_connections[sourceType]
    }

    async home(body) {
        return 'file home'
    }

    async info(body) {
        let disks = []
        
        if (g_platform == 'win32') {
            // https://www.cnblogs.com/blackmanba/articles/windows-nodejs-show-system-letter.html
            // 不支持 Windows XP
            const stdout = await localExec('wmic logicaldisk get caption')
            // Caption
            // C:
            // D:
            // E:
            // F:
            // 
            disks = stdout.split('\n')
                .filter(line => line.includes(':'))
                .map(item => item.trim())
                .map(disk => {
                    return {
                        name: disk,
                        path: disk + path.sep
                    }
                })
        }
        return {
            os: g_platform,
            homePath: USER_HOME,
            disks,
            pathSeparator: path.sep,
        }
    }

    async stat(body) {
        const { sourceType, path } = body
        if (sourceType == 'local') {
            const stat = fs.statSync(path)
            // atime: "2022-07-20T03:06:38.986Z"
            // atimeMs: 1658286398985.5605
            // birthtime: "2019-05-29T08:02:37.744Z"
            // birthtimeMs: 1559116957743.9949
            // blksize: 4096
            // blocks: 0
            // ctime: "2022-07-20T02:58:12.546Z"
            // ctimeMs: 1658285892546.1113
            // dev: 16777220
            // gid: 20
            // ino: 19585881
            // mode: 16877
            // mtime: "2022-07-20T02:58:12.546Z"
            // mtimeMs: 1658285892546.1113
            // nlink: 11
            // rdev: 0
            // size: 352
            // uid: 501
            return {
                stat: {
                    createTime: new Date(stat.birthtime),
                    modifyTime: new Date(stat.mtime),
                    accessTime: new Date(stat.atime),
                    // 文件状态改变时间，指文件的i结点被修改的时间
                    // changeTime: new Date(stat.ctime),
                    mode: stat.mode,
                    _raw: stat,
                },
            }
        }
        else {
            const g_sftp = await this.getSftpClient(body)
            const stat = await g_sftp.stat(path)
            // mode: 33279, // integer representing type and permissions
            // uid: 1000, // user ID
            // gid: 985, // group ID
            // size: 5, // file size
            // accessTime: 1566868566000, // Last access time. milliseconds
            // modifyTime: 1566868566000, // last modify time. milliseconds
            // isDirectory: false, // true if object is a directory
            // isFile: true, // true if object is a file
            // isBlockDevice: false, // true if object is a block device
            // isCharacterDevice: false, // true if object is a character device
            // isSymbolicLink: false, // true if object is a symbolic link
            // isFIFO: false, // true if object is a FIFO
            // isSocket: false // true if object is a socket
            return {
                stat: {
                    modifyTime: new Date(stat.modifyTime),
                    accessTime: new Date(stat.accessTime),
                    mode: stat.mode,
                    _raw: stat,
                },
            }
        }
    }
    
    async sftpConnect(body) {
        const connectionId = uid(32)
        const client = new SftpClient()
        // doc:
        // https://www.npmjs.com/package/ssh2-sftp-client
        client.on('error', (err) => {
            console.log('sftp/on/error', err)
        })
        // 先 end 后 close
        client.on('end', () => {
            console.log('sftp/on/end')
            // The socket has been disconnected
        })
        client.on('close', () => {
            console.log('sftp/on/close', connectionId)
            // The socket was closed
            // connectionId
            closeWebSocketBySftpConnectionId(connectionId)
        })
        const connectParams: any = {
            host: body.host,
            port: body.port,
            username: body.username,
            // password: body.password,
            timeout: 2 * 1000,
            readyTimeout: 20000, // integer How long (in ms) to wait for the SSH handshake
            retries: 2, // Number of times to retry connecting
            retry_factor: 2, // integer. Time factor used to calculate time between retries
            retry_minTimeout: 2000,
        }
        if (body.privateKey) {
            connectParams.privateKey = body.privateKey
        }
        else if (body.password) {
            connectParams.password = body.password
        }
        else {
            throw new Error('privateKey or password required')
        }
        await client.connect(connectParams)
        g_connections[connectionId] = client
        return {
            connectionId,
        }
    }

    async loggerAgent(body) {
        const { url, requestData } = body
        const res = await axios.post(url, requestData)
        return res.data
    }

    async loggerList(body) {
        const content = fs.readFileSync(loggerDbFilePath, 'utf-8') || '[]'
        const list = JSON.parse(content)
        return {
            list,
        }
    }

    async webdavConnectionList(body) {
        const content = fs.readFileSync(webdavDbFilePath, 'utf-8') || '[]'
        const list = JSON.parse(content)
        return {
            list,
        }
    }

    async webdavConnectionEdit(body) {
        const { id, data } = body
        
        const content = fs.readFileSync(webdavDbFilePath, 'utf-8')
        const list = JSON.parse(content)
        const idx = list.findIndex(_item => _item.id == id)
        list[idx] = {
            ...list[idx],
            ...data,
        }
        console.log('list', list)
        fs.writeFileSync(webdavDbFilePath, JSON.stringify(list, null, 4), 'utf-8')
        return {}
    }

    async webdavConnectionCreate(body) {
        // const { id, data } = body
        
        const content = fs.readFileSync(webdavDbFilePath, 'utf-8')
        const list = JSON.parse(content)
        list.unshift({
            ...body,
            id: uid(32),
        })
        fs.writeFileSync(webdavDbFilePath, JSON.stringify(list, null, 4), 'utf-8')
        return {}
    }

    async webdavConnectionDelete(body) {
        const { id } = body
        const content = fs.readFileSync(webdavDbFilePath, 'utf-8')
        const list = JSON.parse(content)
        const newList = list.filter(item => item.id != id)
        console.log('id', id)
        console.log('newList', newList)
        fs.writeFileSync(webdavDbFilePath, JSON.stringify(newList, null, 4), 'utf-8')
        return {}
    }

    async webdavConnect(body) {
        const { url, username, password, test = false } = body
        const headers = tsdav.getBasicAuthHeaders({
            username,
            password,
        })

        const connectionId = 'webdav:' + uid(32)
        g_webdav[connectionId] = {
            headers,
            url,
        }
        // async function test() {
        //     return new Promise((resolve, reject) => {
                
        //     })
        // }
        if (test) {
            // const { sourceType, path = '/' } = body
            // const params = {
            //     'max-keys': 100,
            //     prefix: '',
            //     'delimiter': '/',
            // }
            // console.log('params', params)
            // const { headers, url } = g_webdav[sourceType]
            // const fullUrl = url + (path == '/' ? '' : path.replace(/^\//, ''))
            const [result] = await tsdav.davRequest({
                url,
                init: {
                    method: 'PROPFIND',
                    namespace: 'd',
                    body: {
                        propfind: {
                            _attributes: {
                                'xmlns:d': 'DAV:',
                            },
                            prop: {
                                // 'd:current-user-principal': {} 
                            },
                        },
                    },
                    headers,
                    //   headers: {
                    //     authorization: 'Basic x0C9uFWd9Vz8OwS0DEAtkAlj',
                    //   },
                },
            });
            console.log('result', result)
            // await test()
            if (!result.ok) {
                throw new Error(result.statusText || 'connect fail')
            }
        }
        return {
            connectionId
        }
    }

    async accessKeyList(body) {
        const list = await ossService.getAkList()
        return {
            list,
        }
    }

    async accessKeyEdit(body) {
        const { id, data } = body
        
        const list = await ossService.getAkList()
        const idx = list.findIndex(_item => _item.id == id)
        let buckets = []

        const store = new OSS({
            accessKeyId: data.accessKeyId,
            accessKeySecret: data.accessKeySecret,
        })
        const bucketResult = await store.listBuckets({
            // "max-keys": 10
        })
        console.log('bucketResult', bucketResult)
        buckets = bucketResult.buckets

        list[idx] = {
            ...list[idx],
            ...data,
            buckets,
        }
        await ossService.saveAkList(list)
        return {}
    }

    async accessKeyCreate(body) {
        // const { id, data } = body
        
        const list = await ossService.getAkList()
        

        const store = new OSS({
            accessKeyId: body.accessKeyId,
            accessKeySecret: body.accessKeySecret,
        })
        const bucketResult = await store.listBuckets({
            // "max-keys": 10
        })
        const buckets = bucketResult.buckets

        list.unshift({
            ...body,
            id: uid(32),
            buckets,
        })

        await ossService.saveAkList(list)
        return {}
    }

    async accessKeyDelete(body) {
        const { id } = body
        const list = await ossService.getAkList()
        const newList = list.filter(item => item.id != id)
        console.log('id', id)
        console.log('newList', newList)
        await ossService.saveAkList(newList)
        return {}
    }

    async ossConnect(body) {
        const {
            bucket,
            region,
            accessKeyId,
            accessKeySecret,
        } = body
        const connectionId = 'oss:' + uid(32)
        g_publicStores[connectionId] = new OSS({
            bucket,
            region,
            accessKeyId,
            accessKeySecret,
        })
        return {
            connectionId
        }
    }

    async ossInfo(body) {
        const { sourceType, path = '/' } = body
        const simplePath = path.replace(/^\//, '')
        const objectUrl = await g_publicStores[sourceType].generateObjectUrl(simplePath)
        // console.log('res', res)
        
        const objectMeta = await g_publicStores[sourceType].getObjectMeta(simplePath)
        console.log('objectMeta', objectMeta)
        const { status, res } = objectMeta
        const _headers = res.headers
        // const { headers }
        const headers = Object.keys(_headers).map(key => {
            return {
                key,
                value: _headers[key],
            }
        })
        return {
            url: objectUrl,
            headers,
            // objectMeta,
        }
    }

    async ossList(body) {
        const { sourceType, path = '/' } = body
        const simplePath = path.replace(/^\//, '')
        // console.log('g_publicStores', g_publicStores)
        // console.log('connectionId', sourceType)
        // console.log('store', g_publicStores[sourceType])
        const params = {
            'max-keys': 100,
            // prefix: '',
            'prefix': path == '/' ? '' : (path.replace(/^\//, '') + '/'),
            'delimiter': '/',
            // marker 是实现分页时指向下一分页起始位置的标识。
            // 阿里云 OSS 中不支持原生的文件夹，而是使用一个 0 字节的末尾为 / 的文件起到文件夹功能
        }
        console.log('params', params)
        const res = await g_publicStores[sourceType].list(params)
        // console.log('res', res)
        const results = []
        res.objects.forEach(item => {
            // etag: "\"425E59DF40A72B04F032A939A36FD5AC\""
            // lastModified: "2021-08-23T02:46:04.000Z"
            // name: "公司.png"
            // owner: {id: "1565619625401184", displayName: "1565619625401184"}
            // size: 2198358
            // storageClass: "Standard"
            // type: "Normal"
            // url: "http://linxot-public.oss-cn-beijing.aliyuncs.com/%E5%85%AC%E5%8F%B8.png"
            const fileName = item.name.substring(simplePath.length).replace(/\/$/, '').replace(/^\//, '')
            if (fileName) {
                results.push({
                    type: 'FILE',
                    name: fileName,
                    path: '/' + item.name,
                    size: item.size,
                    modifyTime: item.lastModified,
                })
            }
            // return {
            // }
        })
        if (res.prefixes) {
            res.prefixes.forEach(ossFolderName => {
                const folderName = ossFolderName.replace(/\/$/, '').substring(simplePath.length).replace(/^\//, '')
                // const fileName
                if (folderName) {
                    results.push({
                        type: 'DIRECTORY',
                        name: folderName,
                        path: (path == '/' ? '/' : (path + '/')) + folderName,
                        // path: '/' + item.name,
                    })
                }
                // return {
                    
                // }
            })
        }

        return {
            list: results,
            _list: res,
        }
    }

    async webdavList(body) {
        const { sourceType, path = '/' } = body
        const simplePath = path.replace(/^\//, '')
        // console.log('g_publicStores', g_publicStores)
        // console.log('connectionId', sourceType)
        // console.log('store', g_publicStores[sourceType])
        const params = {
            'max-keys': 100,
            // prefix: '',
            'prefix': path == '/' ? '' : (path.replace(/^\//, '') + '/'),
            'delimiter': '/',
        }
        console.log('params', params)
        const { headers, url } = g_webdav[sourceType]
        console.log('headers', headers)
        const fullUrl = url + (path == '/' ? '' : path.replace(/^\//, ''))
        console.log('fullUrl', fullUrl)
        const [result] = await tsdav.davRequest({
            url: fullUrl,
            init: {
                method: 'PROPFIND',
                namespace: 'd',
                body: {
                    propfind: {
                        _attributes: {
                            'xmlns:d': 'DAV:',
                        },
                        prop: {
                            // 'd:current-user-principal': {} 
                        },
                    },
                },
                headers,
                //   headers: {
                //     authorization: 'Basic x0C9uFWd9Vz8OwS0DEAtkAlj',
                //   },
            },
        });
        console.log('result', result)
        console.log('result.raw', JSON.stringify(result.raw.multistatus, null, 4))
        const _list = result.raw.multistatus.response

        const { pathname } = new Url(url)
        const results = []
        // console.log('_list', _list)
        if (!Array.isArray(_list)) {
            return {
                list: [],
            }
        }
        _list.forEach(item => {
            // href 有两种形式
            // 坚果云：/dav/我的坚果云/.DS_Store
            // webdav-cli: http://localhost:1900/folder/
            const href = decodeURIComponent(item.href)
            const href2 = decodeURI(item.href)
            let _path = href
            // if (_path.startsWith('https')) {
                
            // }
            // else 
            if (_path.startsWith('http://') || _path.startsWith('https://')) {
                const uri = new Url(_path)
                console.log('uri', uri)
                _path = _path.replace(`${uri.protocol}//${uri.host}`, '')
            }
            _path = _path.substring(pathname.length)
            let path2 = _path
            _path = _path.replace(/\/$/, '')
            _path = _path.substring(simplePath.length)
            _path = _path.replace(/^\//, '')

            const { getcontenttype, getlastmodified, getcontentlength, resourcetype } = item.propstat.prop
            // const type = getcontenttype == 'httpd/unix-directory' ? 'DIRECTORY' : 'FILE'
            let type
            if (resourcetype) {
                // 坚果云文件夹：
                // resourcetype: {collection: {}}
                // 坚果云文件：
                // resourcetype: {}
                // 坚果云的文件夹 href 不是 / 结尾
                type = resourcetype.collection ? 'DIRECTORY' : 'FILE'
            }
            else {
                type = item.href.endsWith('/') ? 'DIRECTORY' : 'FILE'
            }

            const updateTime = getlastmodified
            const size = getcontentlength
            if (_path) {
                results.push({
                    type,
                    name: _path,
                    path: (path == '/' ? '/' : (path + '/')) + _path,
                    updateTime,
                    size,
                    _debug: {
                        path2,
                        pathname,
                        simplePath,
                        href,
                        href2,
                        rawHref: item.href,
                    }
                })
            }
        })
        return {
            list: results,
            _list,
        }
    }
    

    
    async zipList(body) {
        const { zipPath, path = '/' } = body

        const list = await getZipList(zipPath)
        console.log('list', list)
        // name: 'a_1.png',
        // dir: false,
        // date: 2021-09-06T23:40:20.000Z,
        // comment: null,
        // unixPermissions: 33188,
        // dosPermissions: null,
        // _data: [Object],
        // _dataBinary: true,
        // options: [Object],
        // unsafeOriginalName: 'a_1.png'

        const results = []
        const map = {}
        list.forEach(item => {
            if (path == '/') {
                if (item.name.includes('/')) {
                    const folderName = item.name.split('/')[0]
                    if (!map[folderName]) {
                        map[folderName] = 1
                        results.push({
                            type: 'DIRECTORY',
                            name: folderName,
                            path: '/' + folderName,
                        })
                    }
                }
                else {
                    results.push({
                        type: 'FILE',
                        name: item.name,
                        path: '/' + item.name,
                    })
                }
            }
            else {
                if (item.name.startsWith(path.replace(/^\//, ''))) {
                    const restPath = item.name.substring(path.length)
                    if (restPath) {
                        if (restPath.includes('/')) {
                            const folderName = restPath.split('/')[0]
                            if (!map[folderName]) {
                                map[folderName] = 1
                                results.push({
                                    type: 'DIRECTORY',
                                    name: folderName,
                                    path: path + '/' + folderName,
                                })
                            }

                        }
                        else {
                            results.push({
                                type: 'FILE',
                                name: restPath,
                                path: path + '/' + restPath,
                            })
                        }
                    }
                }
            }
        })
        return {
            list: results.sort((a, b) => {
                return a.name.localeCompare(b.name)
            })
        }

        // if (sourceType == 'local') {
        //     const list = handleFolder(path || USER_HOME)
        //     return {
        //         list,
        //     }
        // }
        // else {
        //     return {
        //         type: item.type == 'd' ? 'DIRECTORY' : 'FILE',
        //         name: item.name,
        //         path: ((_path == '/') ? '/' : (_path + '/')) + item.name, // TODO
        //         updateTime: new Date(item.modifyTime),
        //         size: item.size,
        //         _item: item,
        //     }
        // }
    }

    async fileList(body) {
        const { sourceType = 'local', path, r = false } = body
        if (sourceType.includes('oss')) {
            return await this.ossList(body)
        }
        else if (sourceType.includes('webdav')) {
            return await this.webdavList(body)
        }
        else if (sourceType.startsWith('s3')) {
            return await this.s3List(body)
        }
        if (sourceType == 'local') {
            const list = handleFolder(path || USER_HOME, r)
            return {
                list,
            }
        }
        else {
            // SFTP
            const g_sftp = await this.getSftpClient(body)
            const _path = path || '/root'
            
            const _list = await g_sftp.list(_path)
            const list = _list.map(item => {
                // accessTime: 1640168554000
                // group: 0
                // longname: "drwx------    3 root     root         4096 Dec 22  2021 .config"
                // modifyTime: 1640168554000
                // name: ".config"
                // owner: 0
                // rights: {user: "rwx", group: "", other: ""}
                // size: 4096
                // type: "d"
                return {
                    type: item.type == 'd' ? 'DIRECTORY' : 'FILE',
                    name: item.name,
                    path: ((_path == '/') ? '/' : (_path + '/')) + item.name, // TODO
                    modifyTime: item.modifyTime ? new Date(item.modifyTime) : null,
                    accessTime: item.accessTime ? new Date(item.accessTime) : null,
                    size: item.size,
                    _item: item,
                }
            })
            return {
                list,
            }
        }
    }

    async webdavRead(body) {
        const { sourceType, path = '/' } = body
        const { headers, url } = g_webdav[sourceType]
        const fullUrl = url + (path == '/' ? '' : path.replace(/^\//, ''))
        // const [result] = await tsdav.davRequest({
        console.log('fullUrl', fullUrl)
        // console.log('axios', axios)
        const res = await axios.get(fullUrl, {
            headers,
        })
        // 内容有可能被 axios 转成数字
        return {
            content: '' + res.data,
        }
    }

    async webdavImagePreview(body) {
        const { sourceType, path } = body
        

        const tmpPath = nodePath.join(appFolder, 'tmp.file')
        const writer = fs.createWriteStream(tmpPath);

        const { headers, url } = g_webdav[sourceType]
        const fullUrl = url + (path == '/' ? '' : path.replace(/^\//, ''))
        // const [result] = await tsdav.davRequest({
        console.log('fullUrl', fullUrl)
        // console.log('axios', axios)
        const res = await axios.get(fullUrl, {
            headers,
            responseType: "stream",
        })

        function download() {
            return new Promise((resolve, reject) => {
                writer.on("finish", resolve);
                writer.on("error", reject);
            });
        }

        res.data.pipe(writer);

        await download()

        return fs.readFileSync(tmpPath)
        // return {
        //     content: res.data,
        // }
    }

    async read(body) {
        const { path, sourceType = 'local' } = body
        // const path = ctx.request.query
        const tmpPath = nodePath.join(appFolder, 'tmp.file')
        if (sourceType.includes('webdav')) {
            return await this.webdavRead(body)
        }
        else if (sourceType.startsWith('oss:')) {
            const ossPath = path.replace(/^\//, '')
            console.log('ossPath', ossPath)
            await g_publicStores[sourceType].get(ossPath, tmpPath)
            const content = fs.readFileSync(tmpPath, 'utf-8')
            return {
                content,
            }
        }
        else if (sourceType.startsWith('s3:')) {
            return await this._s3FileRead(body)
        }
        else if (sourceType == 'local') {
            const content = fs.readFileSync(path, 'utf-8')
            return {
                content,
            }
        }
        else {
            const g_sftp = await this.getSftpClient(body)
            await g_sftp.fastGet(path, tmpPath)
            const content = fs.readFileSync(tmpPath, 'utf-8')
            return {
                content,
            }
        }
    }

    async modeUpdate(body) {
        const { path, sourceType = 'local', mode } = body
        if (sourceType == 'local') {
            fs.chmodSync(path, mode)
            return {}
        }
        else {
            // SFTP
            const g_sftp = await this.getSftpClient(body)
            await g_sftp.chmod(path, mode)
            return {}
        }
        throw new Error(`not support sourceType ${sourceType}`)
    }

    async write(body) {
        const { path, sourceType = 'local', content = '' } = body
        // const path = ctx.request.query
        // const localPath = nodePath.join(appFolder, 'tmp.file')
        if (sourceType.startsWith('oss:')) {
            console.log('path', path)
            // const localPath = nodePath.join(path, name) // TODO
            const tmpPath = nodePath.join(appFolder, 'tmp.file')
            // console.log('tmpPath', tmpPath)
            const ossPath = path.replace(/^\//, '')
                // + (type == 'FILE' ? '' : '/')
            // console.log('ossPath', ossPath)
            // // console.log('localPath', localPath)
            fs.writeFileSync(tmpPath, content, 'utf-8')
            await g_publicStores[sourceType].put(ossPath, tmpPath)
            return {}
        }
        else if (sourceType.startsWith('s3:')) {
            await this._s3FileWrite({
                ...body,
                fullPath: path,
            })
            return {}
        }
        else if (sourceType.includes('webdav')) {
            // const { sourceType, path } = body
            
            const { headers, url } = g_webdav[sourceType]
            const fullUrl = url + (path == '/' ? '' : path.replace(/^\//, ''))
                // + '/' + name
            console.log('fullUrl', fullUrl)
            // console.log('name', path, name)
            const response = await tsdav.createObject({
                url: fullUrl,
                data: content,
                headers: {
                    ...headers,
                    'content-type': 'text/plain; charset=utf-8',
                },
            })
            // if (type == 'FILE') {
            // }
            return {}
        }
        else if (sourceType == 'local') {
            fs.writeFileSync(path, content, 'utf-8')
            return {}
        }
        else {
            const g_sftp = await this.getSftpClient(body)
            const tmpPath = nodePath.join(appFolder, 'tmp.file')
            fs.writeFileSync(tmpPath, content, 'utf-8')
            // const remotePath = nodePath.join(path, name) // TODO
            await g_sftp.put(tmpPath, path)
            return {}
        }
    }

    async create(body) {
        const { path, name, link, type, sourceType } = body
        // {
        //     "path": "/s3-folder",
        //     "name": "kkk",
        //     "sourceType": "s3:fd6a576fb2a22b307ea25cee9ea179a7",
        //     "type": "FILE"
        // }
        // {
        //     "path": "/",
        //     "name": "fff",
        //     "sourceType": "s3:ca3fd3afff10c10c28deb20cec8e5cf7",
        //     "type": "FOLDER"
        // }
        // const path = ctx.request.query
        // const content = fs.readFileSync(path, 'utf-8')
        // return {
            //     content,
            // }
        const localPath = nodePath.join(path, name) // TODO
        if (sourceType.includes('webdav')) {
            const { sourceType, path } = body
            
            const { headers, url } = g_webdav[sourceType]
            const fullUrl = url + (path == '/' ? '' : path.replace(/^\//, ''))
                + '/' + name
            console.log('fullUrl', fullUrl)
            // console.log('name', path, name)
            if (type == 'FILE') {
                const response = await tsdav.createObject({
                    url: fullUrl,
                    data: '',
                    headers: {
                        ...headers,
                        'content-type': 'text/plain; charset=utf-8',
                    },
                })
            }
            else {
                const [result] = await tsdav.davRequest({
                    url: fullUrl,
                    init: {
                      method: 'MKCOL',
                    //   namespace: 'd',
                      body: '',
                      headers,
                    //   headers: {
                    //     authorization: 'Basic x0C9uFWd9Vz8OwS0DEAtkAlj',
                    //   },
                    },
                  });
                console.log('result', result)
            }
            return {}


        }
        else if (sourceType.startsWith('s3:')) {
            const fullPath = (path == '/' ? '' : path.replace(/^\//, ''))
                + '/' + name
            await this._s3FileWrite({
                ...body,
                fullPath,
            })
            return {}
        }
        else if (sourceType.includes('oss')) {
            const tmpPath = nodePath.join(appFolder, 'tmp.file')
            console.log('tmpPath', tmpPath)
            const ossPath = localPath.replace(/^\//, '')
                + (type == 'FILE' ? '' : '/')
            console.log('ossPath', ossPath)
            // console.log('localPath', localPath)
            fs.writeFileSync(tmpPath, '', 'utf-8')
            await g_publicStores[sourceType].put(ossPath, tmpPath)
            return {}
            
            // const content = fs.readFileSync(tmpPath, 'utf-8')
            // return {
            //     content,
            // }
        }
        else if (sourceType == 'local') {
            if (type == 'FILE') {
                let filePath = ''
                if (name.startsWith('/')) {
                    filePath = name
                }
                else {
                    filePath = localPath
                }
                const folder = nodePath.resolve(filePath, '..')
                console.log('folder', folder)
                if (!fs.existsSync(folder)) {
                    console.log('mkdirp', folder)
                    mkdirp(folder)
                }
                fs.writeFileSync(filePath, '', 'utf-8')
            }
            else if (type == 'LINK') {
                fs.symlinkSync(link, localPath)
            }
            else {
                // else if (type == 'FOLDER') {
                if (name.startsWith('/')) {
                    mkdirp(name)
                }
                else {
                    mkdirp(localPath)
                }
            }
            return {}
        }
        else {
            // SFTP
            const g_sftp = await this.getSftpClient(body)
            if (type == 'FILE') {
                const tmpPath = nodePath.join(appFolder, 'tmp.file')
                fs.writeFileSync(tmpPath, '', 'utf-8')
                let filePath = ''
                if (name.startsWith('/')) {
                    filePath = name
                }
                else {
                    filePath = localPath
                }
                const folder = nodePath.resolve(filePath, '..')
                console.log('folder', folder)
                if (!await g_sftp.exists(folder)) {
                    console.log('不存在')
                    await g_sftp.mkdir(folder, true)
                }
                await g_sftp.put(tmpPath, filePath)
            }
            else if (type == 'LINK') {
                let filePath = ''
                if (name.startsWith('/')) {
                    filePath = name
                }
                else {
                    filePath = localPath
                }
                console.log('filePath', filePath)
            }
            else {
                if (name.startsWith('/')) {
                    await g_sftp.mkdir(name, true)
                }
                else {
                    await g_sftp.mkdir(localPath, true)
                }
            }
            return {}
        }
    }

    async delete(body) {
        const { path, paths = [], type, sourceType } = body
        // const path = ctx.request.query
        // const content = fs.readFileSync(path, 'utf-8')
        // return {
            //     content,
            // }
        if (sourceType.includes('webdav')) {
            const { sourceType, path } = body
            
            console.log('path', path)
            const { headers, url } = g_webdav[sourceType]
            console.log('url', url)
            const fullUrl = url + (path == '/' ? '' : path.replace(/^\//, ''))
                // + '/' + name
            console.log('fullUrl', fullUrl)
            // // console.log('name', path, name)
            const [result] = await tsdav.davRequest({
                url: fullUrl,
                init: {
                  method: 'DELETE',
                //   namespace: 'd',
                  body: '',
                  headers,
                //   headers: {
                //     authorization: 'Basic x0C9uFWd9Vz8OwS0DEAtkAlj',
                //   },
                },
            })
            console.log('result', result)
            return {}
        }
        else if (sourceType.startsWith('s3:')) {
            await this._s3FileDelete(body)
            return {}
        }
        else if (sourceType.includes('oss')) {
            // const localPath = nodePath.join(path, name) // TODO
            // const tmpPath = nodePath.join(appFolder, 'tmp.file')
            // console.log('tmpPath', tmpPath)
            if (paths.length) {
                const deletePaths = paths.map(item => {
                    return item.path.replace(/^\//, '') + (item.type == 'FILE' ? '' : '/')
                })
                const res = await g_publicStores[sourceType].deleteMulti(deletePaths, {
                    quiet: true
                })
            }
            else {
                const ossPath = path.replace(/^\//, '')
                    + (type == 'FILE' ? '' : '/')
                // console.log('localPath', localPath)
                // fs.writeFileSync(tmpPath, '', 'utf-8')
                await g_publicStores[sourceType].delete(ossPath)
            }
            return {}
            
            // const content = fs.readFileSync(tmpPath, 'utf-8')
            // return {
            //     content,
            // }
        }
        else if (sourceType == 'local') {
            if (paths.length) {
                for (let item of paths) {
                    const { path } = item
                    const stat = fs.statSync(path)
                    if (stat.isFile()) {
                        console.log('删除文件', path)
                        fs.unlinkSync(path)
                    }
                    else if (stat.isDirectory()) {
                        console.log('删除文件夹', path)
                        rmDir(path)
                    }
                }
            }
            else {
                if (type == 'FILE') {
                    // if (os.type() == 'Windows_NT') {
                    //     //windows
                    // } else if (os.type() == 'Darwin') {
                    //     //mac
                    // } else if (os.type() == 'Linux') {
                    // if (os.type() == 'Darwin') {
    
                    // }
                    // await trash([path])
                    fs.unlinkSync(path)
                }
                else {
                    rmDir(path)
                    // await deleteAsync(path)
                    // fs.rmdirSync(path)
                }
            }
            return {}
        }
        else {
            // SFTP
            const g_sftp = await this.getSftpClient(body)
            if (paths.length) {
                let idx = 0
                for (let item of paths) {
                    const { path } = item
                    console.log(`file delete ${idx++}/${paths.length}`, )
                    const stat = await g_sftp.stat(path)
                    if (stat.isFile) {
                        await g_sftp.delete(path)
                    }
                    else {
                        await g_sftp.rmdir(path, true)
                    }
                }
            }
            else {
                if (type == 'FILE') {
                    await g_sftp.delete(path)
                }
                else {
                    await g_sftp.rmdir(path, true)
                }
            }
            return {}
        }
    }

    async rename(body) {
        const { fromPath, toPath, type, sourceType } = body
        // const path = ctx.request.query
        // const content = fs.readFileSync(path, 'utf-8')
        // return {
            //     content,
            // }
        if (sourceType.includes('webdav')) {
            // const { sourceType, path } = body
            
            const { headers, url } = g_webdav[sourceType]
            const fromPathFullUrl = url + (fromPath == '/' ? '' : fromPath.replace(/^\//, ''))
                // + '/' + name
            const toPathFullUrl = url + (toPath == '/' ? '' : toPath.replace(/^\//, ''))
            // console.log('fullUrl', fullUrl)
            // console.log('name', path, name)
            console.log('fromPathFullUrl', fromPathFullUrl)
            console.log('toPathFullUrl', toPathFullUrl)
            const [result] = await tsdav.davRequest({
                url: fromPathFullUrl,
                init: {
                    method: 'MOVE',
                //   namespace: 'd',
                    body: '',
                    headers: {
                    ...headers,
                    // 'Destination': toPathFullUrl,
                    'Destination': encodeURI(toPathFullUrl),
                    // 'Destination': 'https://dav.jianguoyun.com/dav/我的坚果云/d2/17-11-15-13-37-03.txt',
                    // 'Destination': '/dav/我的坚果云/d2/17-11-15-13-37-03.txt',
                    },
                //   headers: {
                //     authorization: 'Basic x0C9uFWd9Vz8OwS0DEAtkAlj',
                //   },
                },
            })
            return {}
        }
        else if (sourceType.includes('oss')) {
            const ossFromPath = fromPath.replace(/^\//, '')
            const ossToPath = toPath.replace(/^\//, '')
            console.log('ossFromPath', ossFromPath, ossToPath)

            // const tmpPath = nodePath.join(appFolder, 'tmp.file')
            // console.log('tmpPath', tmpPath)
            // const ossPath = localPath.replace(/^\//, '')
            //     + (type == 'FILE' ? '' : '/')
            // console.log('ossPath', ossPath)
            // console.log('localPath', localPath)
            // fs.writeFileSync(tmpPath, '', 'utf-8')
            // await g_publicStores[sourceType].copy(ossFromPath, ossToPath)
            // await g_publicStores[sourceType].copy('cjh-test/ff2', 'cjh-test/ff3')
            await g_publicStores[sourceType].copy(ossToPath, ossFromPath)
            await g_publicStores[sourceType].delete(ossFromPath)
            return {}
            
            // const content = fs.readFileSync(tmpPath, 'utf-8')
            // return {
            //     content,
            // }
        }
        else if (sourceType == 'local') {
            fs.renameSync(fromPath, toPath)
            return {}
        }
        else {
            const g_sftp = await this.getSftpClient(body)
            await g_sftp.rename(fromPath, toPath)
            // if (type == 'FILE') {
            //     await g_sftp.delete(path)
            // }
            // else {
            //     await g_sftp.rmdir(path, true)
            // }
            // return {}
        }
        return {}
    }

    async imagePreview(body) {
        const { sourceType, path } = body
        if (sourceType.includes('oss')) {
            const tmpPath = nodePath.join(appFolder, 'tmp.file')
            console.log('tmpPath', tmpPath)
            const ossPath = path.replace(/^\//, '')
            console.log('ossPath', ossPath)
            await g_publicStores[sourceType].get(ossPath, tmpPath)
            return fs.readFileSync(tmpPath)
            // const content = fs.readFileSync(tmpPath, 'utf-8')
            // return {
            //     content,
            // }
        }
        else if (sourceType.startsWith('s3:')) {
            return await this._s3FileReadStream(body)
        }
        else if (sourceType.includes('webdav')) {
            return await this.webdavImagePreview(body)
        }
        else if (sourceType == 'local') {
            return fs.readFileSync(path)
        }
        else {
            const g_sftp = await this.getSftpClient(body)
            const tmpPath = nodePath.join(appFolder, 'tmp.file')
            await g_sftp.fastGet(path, tmpPath)
            return fs.readFileSync(tmpPath)
        }
    }

    async download(body) {
        const { sourceType, path } = body
        if (sourceType == 'local') {
            // return fs.readFileSync(path)
        }
        else if (sourceType.includes('oss')) {
            const tmpPath = getTempPath()
            // console.log('tmpPath', tmpPath)
            const ossPath = path.replace(/^\//, '')
            await g_publicStores[sourceType].get(ossPath, tmpPath)
            return fs.readFileSync(tmpPath)
        }
        else {
            const g_sftp = await this.getSftpClient(body)
            const tmpPath = getTempPath()
            await g_sftp.fastGet(path, tmpPath)
            return fs.readFileSync(tmpPath)
        }
    }

    async downloadFromUrl(body) {
        const { url, savePath } = body
        function downloadFile(fileUrl: string, savePath: string) {
            return new Promise((resolve, reject) => {
                https.get(fileUrl, (res) => {
                    const { statusCode } = res;
                    if (statusCode !== 200) {
                        console.error(`请求失败，状态码：${statusCode}`);
                        res.resume(); // 释放响应的内存
                        return reject()
                    }

                    res.on('data', (chunk) => {
                        fs.appendFileSync(savePath, chunk); // 将下载的每个数据块写入文件
                    });

                    res.on('end', () => {
                        console.log('文件下载成功！');
                        resolve(null)
                    });
                })
                .on('error', (err) => {
                    console.error(`下载失败：${err.message}`);
                    reject(err)
                })
            })

        }
        await downloadFile(url, savePath)
        return {}
    }

    async openInFinder(body) {
        const { path } = body
        const stat = fs.statSync(path)
        if (g_platform == 'win32') {
            if (stat.isFile()) {
                // TODO 优化：选中文件
                const folderName = nodePath.dirname(path)
                exec(`start ${folderName} -R`)
            }
            else {
                exec(`start ${path}`)
            }
        }
        else {
            if (stat.isFile()) {
                exec(`open ${path} -R`)
            }
            else {
                exec(`open ${path}`)
            }
        }
        return {}
    }

    async openInOs(body) {
        const { path } = body
        const stat = fs.statSync(path)
        if (stat.isFile()) {
            exec(`open ${path}`)
        }
        else {
            // exec(`open ${path}`)
        }
        return {}
    }

    async openInVsCode(body) {
        const { path } = body
        const stat = fs.statSync(path)
        if (stat.isFile()) {
            exec(`code ${path}`)
        }
        return {}
    }

    async openInIdea(body) {
        const { path } = body
        const stat = fs.statSync(path)
        if (stat.isFile()) {
            exec(`idea ${path}`)
        }
        return {}
    }

    async openInTerminal(body) {
        const { sourceType, path } = body
        const stat = fs.statSync(path)
        if (g_platform == 'win32') {
            if (stat.isFile()) {
                throw new Error('not support file')
            }
            else {
                exec(`start cmd.exe /k "cd ${path}"`, ((stdout, stderr) => {
                    console.log('stdout, stderr', stdout, stderr)
                }))
            }
        }
        else if (g_platform == 'darwin') {
            if (stat.isFile()) {
                throw new Error('not support file')
            }
            else {
                // open [路径] -a [软件名称]
                exec(`open ${path} -a /System/Applications/Utilities/Terminal.app`, ((stdout, stderr) => {
                    console.log('stdout, stderr', stdout, stderr)
                }))
            }
        }
        else {
            throw new Error('not support platform')
        }
        
        return {}
    }

    async aliyun(body) {
        const aliyunPath = path.resolve(yunserFolder, 'aliyun-cli')
        if (!fs.existsSync(aliyunPath)) {
            return {
                installed: false
            }
        }
        const info = await loadJson(nodePath.resolve(aliyunPath, 'data', 'info.json'), [])
        const ecs = await loadJson(nodePath.resolve(aliyunPath, 'data', 'aliyun-ecs.json'), [])
        const rds = await loadJson(nodePath.resolve(aliyunPath, 'data', 'aliyun-rds.json'), [])
        const cert = await loadJson(nodePath.resolve(aliyunPath, 'data', 'aliyun-cert.json'), [])
        const cdnCert = await loadJson(nodePath.resolve(aliyunPath, 'data', 'aliyun-cdnCert.json'), [])
        const domain = await loadJson(nodePath.resolve(aliyunPath, 'data', 'aliyun-domain.json'), [])
        const billing = await loadJson(nodePath.resolve(aliyunPath, 'data', 'aliyun-billing.json'), [])
        const tencentServer = await loadJson(nodePath.resolve(aliyunPath, 'data', 'tencent-server.json'), [])
        const tencentMysql = await loadJson(nodePath.resolve(aliyunPath, 'data', 'tencent-mysql.json'), [])
        const tencentLighthouse = await loadJson(nodePath.resolve(aliyunPath, 'data', 'tencent-lighthouse.json'), [])
        return {
            installed: true,
            info,
            ecs,
            rds,
            cert,
            cdnCert,
            domain,
            billing,
            tencentServer,
            tencentMysql,
            tencentLighthouse,
        }
    }

    async aliyunUpdate(body) {
        const cmd = `aliyun run`
        // exec(cmd, (err, stdout, stderr) => {
        //     console.log('err', err)
        //     console.log('stdout', stdout)
        // })
        await localExec(cmd)
        return {}
    }

    async projectList(body) {
        
        const project = await loadJson(projectDbFilePath, {
            projects: [],
        })
        
        return {
            list: project.projects,
        }
    }

    async projectCreate(body) {
        
        
        const project = await loadJson(projectDbFilePath, {
            projects: [],
        })

        project.projects.unshift({
            ...body,
            id: uid(32),
        })
        fs.writeFileSync(projectDbFilePath, JSON.stringify(project, null, 4), 'utf-8')
        return {}
    }

    async projectDelete(body) {
        const { id } = body
        const project = await loadJson(projectDbFilePath, {
            projects: [],
        })
        project.projects = project.projects.filter(item => item.id != id)
        fs.writeFileSync(projectDbFilePath, JSON.stringify(project, null, 4), 'utf-8')
        return {}
    }

    async projectUpdate(body) {
        const { id, data } = body
        
        const project = await loadJson(projectDbFilePath, {
            projects: [],
        })

        // const content = fs.readFileSync(swaggerDbFilePath, 'utf-8')
        // const list = JSON.parse(content)
        const idx = project.projects.findIndex(_item => _item.id == id)
        project.projects[idx] = {
            ...project.projects[idx],
            ...data,
        }
        fs.writeFileSync(projectDbFilePath, JSON.stringify(project, null, 4), 'utf-8')
        return {}
    }

    async swaggerList(body) {
        const list = await loadJson(swaggerDbFilePath, [])
        
        return {
            list,
        }
    }

    async swaggerDetail(body) {
        const { id } = body
        const list = await loadJson(swaggerDbFilePath, [])
        return list.find(item => item.id == id)
    }

    async serviceList(body) {
        const path = nodePath.resolve(appFolder, 'service.json')
        const list = await loadJson(path, [])

        return {
            list,
        }
    }
    async serviceCreate(body) {
        const { name, url, field = '', enable = true } = body
        const path = nodePath.resolve(appFolder, 'service.json')
        const list = await loadJson(path, [])

        list.unshift({
            id: uid(32),
            name,
            url,
            field,
            enable,
        })
        fs.writeFileSync(path, JSON.stringify(list, null, 4))
        return {}
    }
    async serviceUpdate(body) {
        const { id, data = {} } = body
        const { name, url } = data
        const path = nodePath.resolve(appFolder, 'service.json')
        const list = await loadJson(path, [])
        const fIdx = list.findIndex(item => item.id == id)
        if (fIdx != -1) {
            list[fIdx] = {
                ...list[fIdx],
                ...data
            }
        }
        // list.unshift({
        //     id: uid(32),
        //     name,
        //     url,
        // })
        fs.writeFileSync(path, JSON.stringify(list, null, 4))
        return {}
    }

    async serviceRemove(body) {
        const { id } = body
        const path = nodePath.resolve(appFolder, 'service.json')
        const list = await loadJson(path, [])
        const newList = list.filter(item => item.id != id)
        fs.writeFileSync(path, JSON.stringify(newList, null, 4))
        return {}
    }

    
    

    async swaggerEdit(body) {
        const { id, data } = body
        
        const content = fs.readFileSync(swaggerDbFilePath, 'utf-8')
        const list = JSON.parse(content)
        const idx = list.findIndex(_item => _item.id == id)
        list[idx] = {
            ...list[idx],
            ...data,
        }
        fs.writeFileSync(swaggerDbFilePath, JSON.stringify(list, null, 4), 'utf-8')
        return {}
    }

    async swaggerCreate(body) {
        // const { id, data } = body
        
        const content = fs.readFileSync(swaggerDbFilePath, 'utf-8')
        const list = JSON.parse(content)
        list.unshift({
            ...body,
            id: uid(32),
        })
        fs.writeFileSync(swaggerDbFilePath, JSON.stringify(list, null, 4), 'utf-8')
        return {}
    }

    async swaggerDelete(body) {
        const { id } = body
        const content = fs.readFileSync(swaggerDbFilePath, 'utf-8')
        const list = JSON.parse(content)
        const newList = list.filter(item => item.id != id)
        fs.writeFileSync(swaggerDbFilePath, JSON.stringify(newList, null, 4), 'utf-8')
        return {}
    }


    async copy(body) {
        const { sourceType, items = [], fromPath, toPath, copyType } = body
        
        if (sourceType == 'local') {
            if (items.length) {
                for (let item of items) {
                    const {fromPath, toPath} = item
                    await _copy(fromPath, toPath)
                
                    if (copyType == 'cut') {
                        fs.unlinkSync(fromPath)
                    }
                }
            }
            else {
                await _copy(fromPath, toPath)
                
                if (copyType == 'cut') {
                    fs.unlinkSync(fromPath)
                }
            }
        }
        else if (sourceType.includes('webdav')) {
            // const { sourceType, path } = body
            
            const { headers, url } = g_webdav[sourceType]
            const fromPathFullUrl = url + (fromPath == '/' ? '' : fromPath.replace(/^\//, ''))
                // + '/' + name
            const toPathFullUrl = url + (toPath == '/' ? '' : toPath.replace(/^\//, ''))
            const [result] = await tsdav.davRequest({
                url: fromPathFullUrl,
                init: {
                  method: copyType == 'cut' ? 'MOVE' : 'COPY',
                //   namespace: 'd',
                  body: '',
                  headers: {
                    ...headers,
                    // 'Destination': toPathFullUrl,
                    'Destination': encodeURI(toPathFullUrl),
                    // 'Destination': 'https://dav.jianguoyun.com/dav/我的坚果云/d2/17-11-15-13-37-03.txt',
                    // 'Destination': '/dav/我的坚果云/d2/17-11-15-13-37-03.txt',
                  },
                //   headers: {
                //     authorization: 'Basic x0C9uFWd9Vz8OwS0DEAtkAlj',
                //   },
                },
            })
            return {}
        }
        else if (sourceType.includes('oss')) {
            // const tmpPath = nodePath.join(appFolder, 'tmp.file')
            // console.log('tmpPath', tmpPath)
            if (items.length) {
                for (let item of items) {
                    const {fromPath, toPath} = item
                    const ossFromPath = fromPath.replace(/^\//, '')
                    const ossToPath = toPath.replace(/^\//, '')
                        // + (type == 'FILE' ? '' : '/')
                    await g_publicStores[sourceType].copy(ossToPath, ossFromPath)
                    if (copyType == 'cut') {
                        await g_publicStores[sourceType].delete(ossFromPath)
                    }
                }
            }
            else {
                const ossFromPath = fromPath.replace(/^\//, '')
                const ossToPath = toPath.replace(/^\//, '')
                    // + (type == 'FILE' ? '' : '/')
                await g_publicStores[sourceType].copy(ossToPath, ossFromPath)
                if (copyType == 'cut') {
                    await g_publicStores[sourceType].delete(ossFromPath)
                }
            }

            return {}
        }
        else {
            // SFTP
            const g_sftp = await this.getSftpClient(body)
            if (items.length) {
                for (let item of items) {
                    const {fromPath, toPath} = item
                    await g_sftp.rcopy(fromPath, toPath)
                    if (copyType == 'cut') {
                        await g_sftp.delete(fromPath)
                    }
                }
            }
            else {
                await g_sftp.rcopy(fromPath, toPath)
                if (copyType == 'cut') {
                    await g_sftp.delete(fromPath)
                }
            }
        }

        return {}
    }

    async upload(body, tmpPath) {
        // console.log('ctx.request.files', file)
        // console.log('ctx.request', ctx.request)

        const { path, sourceType } = body

        // type BodyInit = ReadableStream | XMLHttpRequestBodyInit;
        if (sourceType == 'local') {
            fs.copyFileSync(tmpPath, path)
        }
        else if (sourceType.includes('webdav')) {
            // const { sourceType, path } = body
            
            const { headers, url } = g_webdav[sourceType]
            const fullUrl = url + (path == '/' ? '' : path.replace(/^\//, ''))
                // + '/' + name
            // console.log('name', path, name)
            const reader = fs.createReadStream(tmpPath)
            const response = await tsdav.createObject({
                url: fullUrl,
                data: reader as any,
                headers: {
                    ...headers,
                    'content-type': 'text/plain; charset=utf-8',
                },
            })
            return {}
        }
        else if (sourceType.startsWith('oss:')) {
            // const tmpPath = nodePath.join(appFolder, 'tmp.file')
            // console.log('tmpPath', tmpPath)
            const ossPath = path.replace(/^\//, '')
                // + (type == 'FILE' ? '' : '/')
            // console.log('localPath', localPath)
            // fs.writeFileSync(tmpPath, '', 'utf-8')
            await g_publicStores[sourceType].put(ossPath, tmpPath)
            return {}
        }
        else if (sourceType.startsWith('s3:')) {
            // TODO 前端的 bug 导致要 replace 两次
            const s3Path = path.replace(/^\//, '')
                .replace(/^\//, '')
            await this._s3Upload(tmpPath, s3Path, body)
                // + (type == 'FILE' ? '' : '/')
            // console.log('localPath', localPath)
            // fs.writeFileSync(tmpPath, '', 'utf-8')
            // await g_publicStores[sourceType].put(ossPath, tmpPath)
            return {}
        }
        else {

            const g_sftp = await this.getSftpClient(body)
    
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
            const reader = fs.createReadStream(tmpPath)
            const newTmpPath = nodePath.join(appFolder, 'tmp.file')
            // let filePath = path.join(process.cwd(), file.name)
            // remotefilePath = `http://yourServerHostAndPath/images/${ctx.request.files['file']['name']}`;
            // 创建可写流
            const upStream = fs.createWriteStream(newTmpPath);
            // 可读流通过管道写入可写流
            reader.pipe(upStream);
            
            // ctx.body = 'ok';
    
            console.log('newTmpPath', newTmpPath)
    
            await g_sftp.put(tmpPath, path)
            // ctx.response.body = 'haha'
            // console.log(text)
            return {}
        }

    }
    
    async collectionList(body) {
        const content = fs.readFileSync(collectionDbFilePath, 'utf-8')
        return {
            list: JSON.parse(content)
        }
    }

    async collectionCreate(body) {
        function lastSplit(text: string, sep: string) {
            const idx = text.lastIndexOf(sep)
            if (idx == -1) {
                return [text]
            }
            return [
                text.substring(0, idx),
                text.substring(idx + 1),
            ]
        }

        
        const { path, type = 'FILE' } = body
        const content = fs.readFileSync(collectionDbFilePath, 'utf-8')
        const list = JSON.parse(content)
        list.unshift({
            id: uid(32),
            name: lastSplit(path, '/')[1],
            path,
            type,
        })
        fs.writeFileSync(collectionDbFilePath, JSON.stringify(list, null, 4), 'utf8')
        return {}
        // return {
        //     list: 
        // }
    }
    
    async collectionRemove(body) {
        const { id } = body
        const content = fs.readFileSync(collectionDbFilePath, 'utf-8')
        const list = JSON.parse(content)
        const newList = list.filter(item => item.id != id)
        fs.writeFileSync(collectionDbFilePath, JSON.stringify(newList, null, 4))
        return {}
    }

    async s3ConnectionList(body) {
        const content = fs.readFileSync(s3DbFilePath, 'utf-8')
        return {
            list: JSON.parse(content)
        }
    }

    async s3Connect(body) {
        const {
            id,
        } = body
        const content = fs.readFileSync(s3DbFilePath, 'utf-8')
        const list = JSON.parse(content)
        const s3Item = list.find(item => item.id == id)
        if (!s3Item) {
            throw new Error('id error')
        }
        const { url, region, accessKeyId, secretAccessKey, bucket } = s3Item
        const _uid32 = uid(32)
        const connectionId = 's3:' + _uid32
        g_s3Map[connectionId] = {
            type: 's3',
            url,
            // bucket,
            // region,
            // accessKeyId,
            // accessKeySecret,
        }
        const res = await axios.post(`${url}/connect`, {
            ...s3Item,
            connectionId: _uid32,
        })
        return {
            connectionId
        }
    }

    async s3List(body) {
        console.log('s3List', body, g_s3Map)
        const { path, sourceType } = body
        // { path: '/', sourceType: 's3:9e31555ff60bcf137326b1cd0d00fbf9' }
        const client = g_s3Map[sourceType]
        const { type, url } = client
        const res = await axios.post(`${url}/file/list`, {
            connectionId: sourceType.replace('s3:', ''),
            path,
            sourceType,
        })
        return res.data
    }

    async _s3FileRead(body) {
        console.log('_s3FileRead/body', body)
        const { path, sourceType = 'local' } = body
        const client = g_s3Map[sourceType]
        const { type, url } = client
        const s3Key = path.replace(/^\//, '')
        console.log('s3Key', s3Key)
        const tmpPath = nodePath.join(appFolder, 'tmp.file')
        
        // const downloadUrl = 'https://icons.yunser.com/icons/app.png'
        const downloadUrl = `${url}/file/read`
        // const downloadPath = '/Users/yunser/Downloads/s3-readme.png'

        

        const downloadFile = async (url, filename) => {
            const writer = fs.createWriteStream(filename);
            
            const response = await axios({
                url,
                method: 'POST',
                responseType: 'stream',
                data: {
                    ...body,
                    connectionId: sourceType.replace('s3:', ''),
                },
            })
            
            response.data.pipe(writer);
            
            return new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
        }
        await downloadFile(downloadUrl, tmpPath)

        const content = fs.readFileSync(tmpPath, 'utf-8')

        return {
            content,
        }
    }

    async _s3FileReadStream(body) {
        console.log('_s3FileRead/body', body)
        const { path, sourceType = 'local' } = body
        const client = g_s3Map[sourceType]
        const { type, url } = client
        const s3Key = path.replace(/^\//, '')
        console.log('s3Key', s3Key)
        const tmpPath = nodePath.join(appFolder, 'tmp.file')
        
        // const downloadUrl = 'https://icons.yunser.com/icons/app.png'
        const downloadUrl = `${url}/file/read`
        // const downloadPath = '/Users/yunser/Downloads/s3-readme.png'

        

        const downloadFile = async (url, filename) => {
            const writer = fs.createWriteStream(filename);
            
            const response = await axios({
                url,
                method: 'POST',
                responseType: 'stream',
                data: {
                    ...body,
                    connectionId: sourceType.replace('s3:', ''),
                },
            })
            
            response.data.pipe(writer);
            
            return new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
        }
        await downloadFile(downloadUrl, tmpPath)

        return fs.readFileSync(tmpPath)

        // return {
        //     content,
        // }
    }

    async _s3FileWrite(body) {
        const { fullPath, type, sourceType } = body
        console.log('_s3FileWrite/body', body)
        // const { path, sourceType = 'local' } = body
        const client = g_s3Map[sourceType]
        const { url } = client
        const s3Key = fullPath.replace(/^\//, '')
        console.log('s3Key', s3Key)
        // const tmpPat
        if (type == 'FOLDER') {
            const createUrl = `${url}/file/mkdir`
            await axios.post(createUrl, {
                ...body,
                path: fullPath,
                connectionId: sourceType.replace('s3:', ''),
            })
        }
        else {
            const createUrl = `${url}/file/write`
            await axios.post(createUrl, {
                ...body,
                path: fullPath,
                connectionId: sourceType.replace('s3:', ''),
            })
        }
    }

    async _s3FileDelete(body) {
        const { path, name, type, sourceType } = body
        console.log('_s3FileDelete/body', body)
        // {
        //     "sourceType": "s3:e4d27b044eb2b5d4f2910ced32026662",
        //     "path": "/asd",
        //     "type": "FILE"
        // }
        // const { path, sourceType = 'local' } = body
        const client = g_s3Map[sourceType]
        const { url } = client
        const s3Key = path.replace(/^\//, '')
        console.log('s3Key', s3Key)

        

        const deleteUrl = `${url}/file/delete`
        await axios.post(deleteUrl, {
            ...body,
            connectionId: sourceType.replace('s3:', ''),
        })
    }

    async _s3Upload(tmpPath, s3Path, body) {
        const { path, name, type, sourceType } = body
        console.log('_s3Upload/body', tmpPath, s3Path, body)
        // {
        //     "sourceType": "s3:e4d27b044eb2b5d4f2910ced32026662",
        //     "path": "/asd",
        //     "type": "FILE"
        // }
        // const { path, sourceType = 'local' } = body
        const client = g_s3Map[sourceType]
        const { url } = client

        const exists = fs.existsSync(tmpPath)
        console.log('exists', exists)
        // const formData = new FormData();

        // formData.append('file', fs.createReadStream(tmpPath))

        // // const uploadUrl = `${url}/file/upload?key=${encodeURIComponent(s3Path)}`
        // // const uploadUrl = `${url}/file/upload?key=${s3Path}`
        // const uploadUrl = `http://localhost:7003/s3Api/file/upload?key=newbin2.png`
        // console.log('uploadUrl', uploadUrl)
        // const config = {
        //     headers: {
        //         'Content-Type': 'multipart/form-data'
        //     }
        // };

        // const res = await axios.post(uploadUrl, formData, config)

        const formData = new FormData();
        // 可以
        // const filePath = '/Users/yunser/Downloads/_bin.png';
        // 不行？
        const filePath = tmpPath
        // const filePath = '/var/folders/km/8p1rry_971bcg3fkhzf_ssb80000gn/T/upload_700420b33008e762dda597f98a5e75a0'
        formData.append('file', fs.createReadStream(filePath));

        const config = {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        }
        const uploadUrl = `http://localhost:7003/s3Api/file/upload?key=${encodeURIComponent(s3Path)}&connectionId=${encodeURIComponent(sourceType.replace('s3:', ''))}`

        await axios.post(uploadUrl, formData, config)
        // .then(response => {
        //     // 上传完成
        //     console.log('上传完成')
        //     // console.log(response.data);
        // });
        console.log('上传完成2')


        // .then(response => {
        //     // 上传完成
        //     console.log(response.data);
        // });
    }

    async s3Info(body) {
        const { path, name, type, sourceType } = body
        console.log('_s3FileDelete/body', body)
        // {
        //     "sourceType": "s3:e4d27b044eb2b5d4f2910ced32026662",
        //     "path": "/asd",
        //     "type": "FILE"
        // }
        // const { path, sourceType = 'local' } = body
        const client = g_s3Map[sourceType]
        const { url } = client
        const s3Key = path.replace(/^\//, '')
        console.log('s3Key', s3Key)

        

        const deleteUrl = `${url}/file/info`
        const res = await axios.post(deleteUrl, {
            ...body,
            connectionId: sourceType.replace('s3:', ''),
        })

        return {
            ...res.data
        }
    }
}
