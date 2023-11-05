// import { simpleGit, ResetMode, SimpleGit } from 'simple-git'
import { uid } from "uid";
import * as fs from 'fs'
// import * as mkdirp from 'mkdirp'
import * as os from 'os'
import * as path from 'path'
// import moment = require("moment");

import { WebSocket } from 'ws'
import { Client as SshClient } from 'ssh2'
import * as utf8 from 'utf8'
// import * as pty from 'node-pty'
import moment = require("moment");
import { closeWebSocketServer } from "./socket.service";
const { exec } = require('child_process')

function myExec(command): Promise<any> {
    return new Promise((resolve, reject) => {
        exec(command, ((stderr, stdout) => {
            resolve({
                stderr: stderr || null,
                stdout: stdout || '',
            })
        }))
    })
}


function getConnectParams(body) {
    const connectParams: any = {
        host: body.host,
        port: body.port,
        username: body.username,
        // password: body.password,
        readyTimeout: 4 * 1000,
        /** How often (in milliseconds) to send SSH-level keepalive packets to the server. Set to 0 to disable. */
        keepaliveInterval: 10 * 1000,
        /** How many consecutive, unanswered SSH-level keepalive packets that can be sent to the server before disconnection. */
        // keepaliveCountMax?: number;
        /** * How long (in milliseconds) to wait for the SSH handshake to complete. */
        // readyTimeout?: number;
        /** Performs a strict server vendor check before sending vendor-specific requests. */
        /** The underlying socket timeout in ms. Default: none) */
        timeout: 2 * 1000,
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
    return connectParams
}

function sleep(ms): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve()
        }, ms)
    })
}

function parseStat(stat) {
    const rows = stat.split('\n')
    const cupStat = rows[0]
    const [ cpu, _user, _nice, _system, _idle ] = cupStat.split(/\s+/)
    // CPU利用率   =   100   *（user   +   nice   +   system）/（user   +   nice   +   system   +   idle）
    // console.log('ccpp', _user, _nice, _system, _idle)
    const [user, nice, system, idle] = [_user, _nice, _system, _idle].map(item => {
        return parseInt(item.trim())
    })
    // console.log('user, nice, system, idle', user, nice, system, idle)
    const cpuRate = (user + nice + system) / (user + nice + system + idle)
    return {
        // cpuUsage: Math.floor(100 * cpuRate),
        idle,
        total: user + nice + system + idle,
    }
}

function createSshConnection(config): Promise<SshClient> {
    return new Promise((resolve, reject) => {

        const sshClient = new SshClient()
        sshClient
            .on("ready", function () {
                console.log('ssh/ready1')
                // console.log('ssh/ready')
                // ws.send("\r\n*** SSH CONNECTION ESTABLISHED ***\r\n");
                resolve(sshClient)
            })
            .on("close", function () {
                console.log('ssh/close1')
                // reject() // TODO
            })
            .on("error", function (err) {
                console.log('ssh/error1')
                console.log("\r\n*** SSH CONNECTION ERROR: " + err.message + " ***\r\n");
                reject()
            })
        sshClient.connect(getConnectParams(config))
    })
}

function sshExec(sshClient: SshClient, cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
        let _data = ''
        sshClient.exec(cmd, (err, stream) => {
            if (err) {
                reject(err)
                return
            }
            stream
                .on('close', (code, signal) => {
                    resolve(_data)
                })
                .on('data', (data) => {
                    _data += data.toString()
                })
                .stderr.on('data', (data) => {
                    console.log('STDERR: ' + data);
                });
        })
    })   
}

function sshExec2(sshClient: SshClient, cmd: string): Promise<any> {
    return new Promise((resolve, reject) => {
        let _data = ''
        sshClient.exec(cmd, (err, stream) => {
            if (err) {
                // reject(err)
                reject({
                    stderr: err.toString(),
                    stdout: null,
                })
                return
            }
            stream
                .on('close', (code, signal) => {
                    // resolve(_data)
                    resolve({
                        stderr: null,
                        stdout: _data,
                    })
                })
                .on('data', (data) => {
                    _data += data.toString()
                })
                .stderr.on('data', (data) => {
                    console.log('STDERR: ' + data);
                });
        })
    })   
}


const shell = os.platform() === 'win32' ? 'powershell.exe' : '/bin/zsh'


const USER_HOME = process.env.HOME || process.env.USERPROFILE

let yunserFolder = path.resolve(USER_HOME, '.yunser') // TODO package，npm install cmd-core
if (!fs.existsSync(yunserFolder)) {
    // console.log('创建目录')
    fs.mkdirSync(yunserFolder)
}

let appFolder = path.resolve(yunserFolder, 'dms-cli') // TODO package，npm install cmd-core
if (!fs.existsSync(appFolder)) {
    fs.mkdirSync(appFolder)
}

let sshConnectionFilePath = path.resolve(appFolder, 'ssh.connection.json')
if (!fs.existsSync(sshConnectionFilePath)) {
    // console.log('创建目录')
    // fs.mkdirSync(yunserFolder)
    fs.writeFileSync(sshConnectionFilePath, '[]', 'utf8')
}
let commandDbFilePath = path.resolve(appFolder, 'ssh.command.json')
if (!fs.existsSync(commandDbFilePath)) {
    // console.log('创建目录')
    // fs.mkdirSync(yunserFolder)
    fs.writeFileSync(commandDbFilePath, '[]', 'utf8')
}
// let gitSettingFilePath = path.resolve(appFolder, 'git.settings.json')
// if (!fs.existsSync(gitSettingFilePath)) {
//     // console.log('创建目录')
//     // fs.mkdirSync(yunserFolder)
//     fs.writeFileSync(gitSettingFilePath, '{}', 'utf8')
// }



const folderPath = '/Users/yunser/app/dms-new'




const wss = new WebSocket.Server({
    port: 10087
})

let redisSubscribeSockets: WebSocket[] = []

let mqttSubscribeSockets: WebSocket[] = []

let redisSockets = []
let dbSockets = []
let sftpSockets = []
let tcpSockets = []
let websockServerSockets = []
let webSocketId2SocketMap = {}

export function sendRedisMsg({ channel, message, }) {
    console.log('redisSubscribeSockets.length', redisSubscribeSockets.length)
    const time = moment().format('YYYY-MM-DD HH:mm:ss')
    for (let ws of redisSubscribeSockets) {
        ws.send(JSON.stringify({
            id: uid(8),
            channel,
            message,
            time,
        }))
    }
}

export function sendMqttMsg({ topic, message, }) {
    console.log('sendMqttMsg/mqttSubscribeSockets.length', mqttSubscribeSockets.length)
    const time = moment().format('YYYY-MM-DD HH:mm:ss')
    for (let ws of mqttSubscribeSockets) {
        ws.send(JSON.stringify({
            id: uid(8),
            topic,
            message,
            time,
        }))
    }
}

export function sendTcpMsg({ webSocketId, message, }) {
    
    // console.log('tcpSockets', tcpSockets)
    const ws = webSocketId2SocketMap[webSocketId]
    if (!ws) {
        console.log('sendTcpMsg/notFound', )   
        return
    }
    ws.send(JSON.stringify(message))
    // const fItem = tcpSockets.find(item => item.connectionId == connectionId)
    // // console.log('fItem', fItem)
    // if (fItem) {
    //     fItem.socket.send(JSON.stringify(message))
    // }
    // else {
    //     console.log('sendTcpMsg/notFound', )
    // }
}

export function sendWebSocketMsg({ connectionId, message, }) {
    const time = moment().format('YYYY-MM-DD HH:mm:ss')
    // console.log('websockServerSockets', websockServerSockets)
    console.log('connectionId', connectionId)
    const fItem = websockServerSockets.find(item => item.connectionId == connectionId)
    // console.log('fItem', fItem)
    if (fItem) {
        fItem.socket.send(JSON.stringify(message))
    }
}

export function closeWebSocketByConnectionId(connectionId) {
    console.log('closeWebSocketByConnectionId', connectionId)
    // console.log('redisSockets', redisSockets)
    redisSockets = redisSockets.filter(item => {
        if (item.connectionId == connectionId) {
            // console.log('找到', item, item.socket)
            // console.log('找到', item, item.socket)
            item.socket && item.socket.close()
            // console.log('关闭了')
        }
        return item.connectionId != connectionId
    })
}

export function closeWebSocketByDbConnectionId(connectionId) {
    console.log('closeWebSocketByDbConnectionId', connectionId)
    // console.log('redisSockets', redisSockets)
    dbSockets = dbSockets.filter(item => {
        if (item.connectionId == connectionId) {
            // console.log('找到', item, item.socket)
            // console.log('找到', item, item.socket)
            item.socket && item.socket.close()
            console.log('关闭了')
        }
        return item.connectionId != connectionId
    })
}

export function closeWebSocketBySftpConnectionId(connectionId) {
    console.log('closeWebSocketBySftpConnectionId', connectionId)
    // console.log('redisSockets', redisSockets)
    sftpSockets = sftpSockets.filter(item => {
        if (item.connectionId == connectionId) {
            // console.log('找到', item, item.socket)
            // console.log('找到', item, item.socket)
            item.socket && item.socket.close()
            console.log('关闭了')
        }
        return item.connectionId != connectionId
    })
}

export function closeWebSocketByTcpConnectionId(connectionId) {
    tcpSockets = tcpSockets.filter(item => {
        if (item.connectionId == connectionId) {
            // console.log('找到', item, item.socket)
            // console.log('找到', item, item.socket)
            item.socket && item.socket.close()
            console.log('关闭了')
        }
        return item.connectionId != connectionId
    })
}

function createSocket(ws: WebSocket) {
    
    let ssh
    let g_stream
    let g_isRecord = false
    // let l_client: SshClient

    function initSsh(config, ws: WebSocket) {
        const { defaultPath, ptySize } = config
        
        if (config && config.host) {
            const sshClient = new SshClient()
            // l_client = sshClient
            
            sshClient
                .on("close", function () {
                    console.log('ssh/onClose2')
                    ws.close();
                })
                .on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish)=>{
                    console.log('ssh/keyboard-interactive 2');
                    // finish([this.pass]);
                })
                .on("end", function () {
                    console.log('ssh/end 2')
                    ws.close();
                })
                .on("error", function (err) {
                    console.log('ssh/error2')
                    console.log("\r\n*** SSH CONNECTION ERROR: " + err.message + " ***\r\n");
                    ws.close()
                })
                .on("ready", function () {
                    console.log('ssh/ready 2')
                    // ws.send("\r\n*** SSH CONNECTION ESTABLISHED ***\r\n");
                    sshClient.shell({ cols: ptySize.cols, rows: ptySize.rows }, (err, stream) => {
                        if (err) {
                            return ws.emit("\r\n*** SSH SHELL ERROR: " + err.message + " ***\r\n");
                        }
                        
                        g_stream = stream
                        // TODO
                        g_stream.resize = (cols, rows, width, height) => {
                            stream.setWindow(rows, cols, width, height)
                        }
                        if (defaultPath) {
                            console.log('cd cd cd cd', )
                            g_stream.write(`cd ${defaultPath}\r`)
                        }
            
                        stream
                            .on("data", function (d) {
                                let data = utf8.decode(d.toString("binary"));
                                // ws.send(data)
                                // console.log('ws/send', data)
                                if (g_isRecord) {
                                    g_isRecord = false
                                    const path = data.split('\r\n')[1]
                                    console.log('path', path)
                                    ws.send(JSON.stringify({
                                        type: 'pwd',
                                        data: {
                                            path,
                                        },
                                    }))
                                }
                                else {
                                    ws.send(JSON.stringify({
                                        type: 'res',
                                        data,
                                    }))
                                }
                            })
                            .on("close", function () {
                                console.log('ssh/stream/close')
                                // SSH 断开连接
                                sshClient.end()
                                ws.close()
                            })
                    });
                })
                .connect(getConnectParams(config))
            return sshClient
        }
        else {
            throw new Error('local terminal is no longer supported from v0.21.0')
            let pty:any = null
            const ptyProcess = pty.spawn(shell, [], {
                name: 'xterm-color',
                // cols: 80,
                // rows: 30,
                cols: ptySize.cols || 42,
                rows: ptySize.rows || 30,
                cwd: defaultPath || process.env.HOME,
                // cwd: '/Users/yunser/app/git-auto-2',
                env: process.env
            })
            // ptyProcess.resize()
            ptyProcess.onData(data => {
                ws.send(JSON.stringify({
                    type: 'res',
                    data,
                }))
            })
            // ptyProcess.on('data', function(data) {
            //     // console.log('ptyProcess', data)
            //     // process.stdout.write(data);

            // })
            
            // ptyProcess.write('ls\r');
            // ptyProcess.resize(100, 40);
            // ptyProcess.write('ls\r');

            g_stream = ptyProcess
        }
    }

    const webSocketId = uid(16)
    webSocketId2SocketMap[webSocketId] = ws

    ws.on("message", async (data) => {
        // console.log("websocket/on message", data.toString());
        const msgContent = data.toString()
        if (msgContent == 'ping') {
            ws.send('pong')
            return
        }
        let msg
        try {
            msg = JSON.parse(data.toString())
        }
        catch (err) {
            // nothing
        }
        if (msg) {
            if (msg.type == 'connect') {
                ssh = initSsh(msg.data, ws)
            }
            else if (msg.type == 'command') {
                g_stream.write(msg.data);
            }
            else if (msg.type == 'resize') {
                const { rows, cols, width, height } = msg.data
                g_stream.resize(cols, rows, width, height)
            }
            else if (msg.type == 'pwd') {
                // const path = (await sshExec(l_client, 'pwd')).replace(/\s/g, '')
                // console.log('path', path)
                // ws.send(JSON.stringify({
                //     type: 'pwd',
                //     data: {
                //         path,
                //     },
                // }))
                g_isRecord = true
                g_stream.write('pwd\r')
                
            }
            else if (msg.type == 'redisSubscribe') {
                const { connectionId } = msg.data
                redisSubscribeSockets.push(ws)
            }
            else if (msg.type == 'mqttSubscribe') {
                const { connectionId } = msg.data
                mqttSubscribeSockets.push(ws)
            }
            else if (msg.type == 'redisBind') {
                const { connectionId } = msg.data
                redisSockets.push({
                    connectionId,
                    socket: ws,
                })
            }
            else if (msg.type == 'dbBind') {
                const { connectionId } = msg.data
                dbSockets.push({
                    connectionId,
                    socket: ws,
                })
            }
            else if (msg.type == 'sftpBind') {
                const { connectionId } = msg.data
                sftpSockets.push({
                    connectionId,
                    socket: ws,
                })
            }
            else if (msg.type == 'tcpSubscribe') {
                const { connectionId } = msg.data
                tcpSockets.push({
                    connectionId,
                    socket: ws,
                })
            }
            else if (msg.type == 'websocketServerSubscribe') {
                const { connectionId } = msg.data
                websockServerSockets.push({
                    connectionId,
                    socket: ws,
                })
                ws['_linkServer'] = connectionId
            }
            else if (msg.type == 'getWebSocketId') {
                ws.send(JSON.stringify({
                    type: 'websocketId',
                    data: {
                        webSocketId,
                    },
                }))
            }
        }
        // 
    });
    ws.on("close", function () {
        console.log("websocket/close");
        ssh && ssh.end()
        redisSubscribeSockets = redisSubscribeSockets.filter(item => item !== ws)
        mqttSubscribeSockets = mqttSubscribeSockets.filter(item => item !== ws)
        if (ws['_linkServer']) {
            closeWebSocketServer(ws['_linkServer'])
        }
    })
}

wss.on("connection", function (ws) {
    console.log('websocket/connection')
    createSocket(ws);

    
})



export class SshService {

    async home(body) {
        return 'ssh home'
    }

    async pingCheck(body) {
        const { ip } = body
        const command = `ping ${ip} -c 1 -t 2`
        const res = await myExec(command)
        console.log('res', res)
        // const dfResult = await this._exec({
        //     id: connectionId,
        //     command: 'df -h',
        // })
        return {
            success: !res.stderr,
            stdout: res.stdout,
        }
    }

    async diskCheck(body) {
        const { connectionId } = body
        // const list = await this._getConnectionList()
        // const item = list.find(item => item.id == connectionId)
        // console.log('item', item)
        // await this.connect(item)
        const dfResult = await this._exec({
            id: connectionId,
            command: 'df -h',
        })
        return {
            dfResult,
        }
    }

    async connect(body) {
        function _connect(): Promise<void> {
            return new Promise((resolve, reject) => {
                const ssh = new SshClient()
                
                ssh
                    .on("ready", function () {
                        console.log('ssh/ready 3')
                        resolve()
                    })
                    .on("close", function () {
                        console.log('ssh/close3')
                        // reject() // TODO
                    })
                    .on("error", function (err) {
                        console.log('ssh/error3')
                        reject(err)
                    })
                
                ssh.connect(getConnectParams(body))
            })
        }

        await _connect()
    }

    async _getConnectionList() {
        const content = fs.readFileSync(sshConnectionFilePath, 'utf-8')
        return JSON.parse(content)
    }

    async connectionList(body) {
        return {
            list: await this._getConnectionList(),
        }
    }

    async connectionMonite(body) {
        const { id } = body
        // const startTime = new Date()
        const list = await this._getConnectionList()
        const item = list.find(item => item.id == id)
        const sshClient = await createSshConnection(item)
        // console.log('sshClient', new Date().getTime() - startTime.getTime())
        const meminfo = await sshExec(sshClient, 'cat /proc/meminfo')
        const loadavg = await sshExec(sshClient, 'cat /proc/loadavg')
        const uptime = await sshExec(sshClient, 'cat /proc/uptime')
        const cpuinfo = await sshExec(sshClient, 'cat /proc/cpuinfo')
        // console.log('cpuinfo', new Date().getTime() - startTime.getTime())
        const disk = await sshExec(sshClient, 'df -h')
        // console.log('disk', new Date().getTime() - startTime.getTime())
        const top = await sshExec(sshClient, 'top -b -n 1')
        // console.log('top', new Date().getTime() - startTime.getTime())
        const version = await sshExec(sshClient, 'cat /proc/version')
        const lsb = await sshExec(sshClient, 'lsb_release -a')
        const centos = await sshExec(sshClient, 'cat /etc/centos-release')
        const stat1 = parseStat(await sshExec(sshClient, 'cat /proc/stat'))
        await sleep(50)
        const stat2 = parseStat(await sshExec(sshClient, 'cat /proc/stat'))
        // console.log('stat?', stat1, stat2)
        // console.log('stat?2', ((stat2.idle - stat1.idle)), (stat2.total - stat1.total))
        const cpuRate = 1 - (stat2.idle - stat1.idle) / (stat2.total - stat1.total)
        // console.log('cpuRate', cpuRate)
        return {
            item,
            meminfo,
            // stat,
            cpuUsage: Math.floor(100 * cpuRate),
            loadavg,
            uptime,
            cpuinfo,
            disk,
            top,
            version,
            lsb,
            centos,
        }
    }

    async _exec(body) {
        const { id, command } = body
        // const startTime = new Date()
        const list = await this._getConnectionList()
        const item = list.find(item => item.id == id)
        const sshClient = await createSshConnection(item)
        // console.log('sshClient', new Date().getTime() - startTime.getTime())
        const result = await sshExec2(sshClient, command)
        return result
    }

    async connectionEdit(body) {
        const { id, data } = body
        
        const content = fs.readFileSync(sshConnectionFilePath, 'utf-8')
        const list = JSON.parse(content)
        const idx = list.findIndex(_item => _item.id == id)
        list[idx] = {
            ...list[idx],
            ...data,
        }
        console.log('list', list)
        fs.writeFileSync(sshConnectionFilePath, JSON.stringify(list, null, 4), 'utf-8')
        return {}
    }

    async connectionCreate(body) {
        // const { id, data } = body
        
        const content = fs.readFileSync(sshConnectionFilePath, 'utf-8')
        const list = JSON.parse(content)
        list.unshift({
            ...body,
            id: uid(32),
        })
        fs.writeFileSync(sshConnectionFilePath, JSON.stringify(list, null, 4), 'utf-8')
        return {}
    }

    async connectionDelete(body) {
        const { id } = body
        const content = fs.readFileSync(sshConnectionFilePath, 'utf-8')
        const list = JSON.parse(content)
        const newList = list.filter(item => item.id != id)
        console.log('id', id)
        console.log('newList', newList)
        fs.writeFileSync(sshConnectionFilePath, JSON.stringify(newList, null, 4), 'utf-8')
        return {}
    }

    async commandList(body) {
        const content = fs.readFileSync(commandDbFilePath, 'utf-8')
        return {
            list: JSON.parse(content)
        }
    }
}
