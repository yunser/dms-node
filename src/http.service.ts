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
import * as Client from 'ssh2-sftp-client'
import { exec } from "child_process";
import { uid } from 'uid'
import tsdav, { DAVNamespace } from 'tsdav';
import * as Url from 'url-parse'
import * as net from 'net'
// import * as http from 'http'
import * as https from 'https'
import * as tls from 'tls'
import { URL } from 'url'
import * as zlib from 'zlib'

// import * as axios from 'axios'
const axios = require('axios')

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

let apiFolder = path.resolve(appFolder, 'apis') // TODO package，npm install cmd-core
if (!fs.existsSync(apiFolder)) {
    fs.mkdirSync(apiFolder)
}

function parseChunkedData(chunkedData) {
    let results = [];
    let buffer = Buffer.from(chunkedData);
  
    let pos = 0;
    let chunkSize = -1;
  
    while (pos < buffer.length) {
      //解析chunk长度
      if (chunkSize === -1) {
        let lineEnd = buffer.indexOf('\r\n', pos);
        chunkSize = parseInt(buffer.slice(pos, lineEnd).toString(), 16);
        pos = lineEnd + 2;
      }
  
      //拼接chunk数据
      if (pos + chunkSize <= buffer.length) {
        results.push(buffer.slice(pos, pos + chunkSize))
        // results += buffer.slice(pos, pos + chunkSize).toString();
        pos += chunkSize + 2;
        chunkSize = -1;
      } else {
        break;
      }
    }
  
    return Buffer.concat(results);
}

function normalHeaders(headers: object) {
    const result = {}
    for (let key in headers) {
        result[key.toLowerCase()] = headers[key]
    }
    return result
}

function getBodyBuff(allData: Buffer, nHeader = {}) {
    const text = allData.toString()
    const [headersText, bodyText] = text.split('\r\n\r\n');
    console.log('split/bodyText.length', headersText.length)
    const bodyStart = headersText.length + 4
    let bodyBuff: Buffer
    if (nHeader['content-length']) {
        const contentLength = parseInt(nHeader['content-length'])
        // console.log('use contentLength', contentLength)
        bodyBuff = allData.slice(bodyStart, bodyStart + contentLength)
    }
    else if (nHeader['transfer-encoding'] == 'chunked') {
        bodyBuff = parseChunkedData(allData.slice(bodyStart))
    }
    else {
        bodyBuff = allData.slice(bodyStart)
    }
    console.log('bodyBuff', bodyBuff)
    console.log('bodyBuff.length', bodyBuff.length)
    // console.log('bodyText', bodyBuff.toString())
    return bodyBuff
}


function parseHttpRes(allData: Buffer) {
    const text = allData.toString()
    const [headersText, bodyText] = text.split('\r\n\r\n');
    // console.log('headersText',headersText)
    // console.log('bodyText',bodyText)
    const headLines = headersText.split('\r\n')

    let headerEnd = headLines.indexOf("");
    let headerText = headLines.slice(1, headerEnd);

    const headersList = []
    const headers = headLines.slice(1).reduce((acc, headerLine) => {
        const [key, value] = headerLine.split(': ');
        acc[key] = value;
        headersList.push({
            key,
            value,
        })
        return acc;
    }, {});
    const nHeader = normalHeaders(headers)
    console.log('nHeader', nHeader)
    const statusLine = headLines[0].split(' ')

    const bodyBuff = getBodyBuff(allData, nHeader)
    let content
    if (nHeader['content-encoding']) {
        console.log('bodyText.length', bodyBuff.length)
        console.log('bodyBuff', bodyBuff)
        if (nHeader['content-encoding'] == 'gzip') {
            content = zlib.gunzipSync(bodyBuff).toString()
        }
        else if (nHeader['content-encoding'] == 'deflate') {
            content = zlib.inflateSync(bodyBuff).toString()
        }
        else if (nHeader['content-encoding'] == 'br') {
            const bodyBuff = getBodyBuff(allData)
            content = zlib.brotliDecompressSync(bodyBuff).toString()
        }
    }
    else {
        content = bodyBuff.toString()
    }
    return {
        statusCode: parseInt(statusLine[1]),
        statusMessage: statusLine.slice(2).join(" "),
        headers: headersList,
        content,
    }
}

function myRequest(opts: https.RequestOptions, reqBody: string, onData: (res: any) => void) {
    console.log('myRequest', opts, reqBody)

    let sendContent
    const headers = {
        ...opts.headers,
        'Host': opts.hostname,
        'Connection': 'close',
    }
    const httpVersion = opts['httpVersion'] || '1.1'
    sendContent = [
        `${opts.method} ${opts.path} HTTP/${httpVersion}`,
        ...Object.keys(headers).map(key => `${key}: ${headers[key]}`),
        '',
        '',
    ].join('\r\n')
    if (reqBody) {
        sendContent += reqBody
    }

    function toInt(value: string | number) {
        if (typeof value == 'number') {
            return value
        }
        return parseInt(value)
    }

    function handleResData(allData: Buffer, socketInfo) {
        onData && onData({
            ...parseHttpRes(allData),
            requestRaw: sendContent,
            responseRaw: allData.toString(),
            socket: socketInfo,
            // console.log('local', socket.localAddress, socket.localPort)
            // console.log('remote', socket.remoteAddress, socket.remotePort)
        })
    }

    const _port = toInt(opts.port)

    if (opts.protocol == 'https:') {
        let allData = Buffer.from('')

        let socketInfo = null
        const socket = net.createConnection(_port, opts.hostname, () => {
            // console.log('创建 TLS 连接', )
            socketInfo = {
                local: {
                    address: socket.localAddress,
                    port: socket.localPort,
                },
                remote: {
                    address: socket.remoteAddress,
                    port: socket.remotePort,
                    family: socket.remoteFamily,
                }
            }
            // console.log('socketInfo', socketInfo)

            // 创建 TLS 连接
            const tlsSocket = tls.connect({
                socket,
                servername: opts.hostname,
            }, () => {
                // console.log('已连接', )
                tlsSocket.write(sendContent)
                // console.log('已发送', sendContent)
            })
        
            // 监听 TLS 连接数据
            tlsSocket.on('data', (data) => {
                allData = Buffer.concat([allData, data])
                // console.log('data???', data.toString());
                // socket.destroy()
            });
        
            // 监听 TLS 连接关闭
            tlsSocket.on('end', () => {
                console.log('TLS connection closed')
            });
        
            // 监听 TLS 连接错误
            tlsSocket.on('error', (error) => {
                console.error(error)
            })
            tlsSocket.on('close', () => {
                console.log('tlsSocket/close', )
                // handleResData(allData)
                // console.error(error)
            })
        })
        
        // 监听 TCP 连接错误
        socket.on('error', (error) => {
            console.error(error)
        })
        socket.on('close', () => {
            console.log('Connection closed')
            // allB
            handleResData(allData, socketInfo)
        })
        return socket
    }
    else {
        let client = new net.Socket()
        if (opts.protocol == 'https:') {
            client
        }
    
        let socketInfo = null
        client.connect(_port, opts.hostname, () => {
            console.log('地址', )
            // console.log('client.localAddress', client.localAddress)
            // console.log('client.remoteAddress', client.remoteAddress)
            socketInfo = {
                local: {
                    address: client.localAddress,
                    port: client.localPort,
                },
                remote: {
                    address: client.remoteAddress,
                    port: client.remotePort,
                    family: client.remoteFamily,
                }
            }
            client.write(sendContent)
        })
        
        let allData = Buffer.from('')
        client.on('data', (data) => {
            allData = Buffer.concat([allData, data])
            // console.log('Received: ' + data)
            // client.destroy()
        })
        
        client.on('close', () => {
            console.log('Connection closed')
            // allB
            handleResData(allData, socketInfo)
        })
    
        return client
    }

}




export class HttpService {

    async apiInfo(body) {
        return {
            rootPath: apiFolder,
        }
    }

    async proxy(ctx, body) {
        const { url } = body
        try {
            const res = await axios.get(url)
            ctx.status = res.status
            return res.data
        }
        catch (err) {
            if (err.response) {
                ctx.status = err.response.status
                return err.response.data
            }
            else {
                ctx.status = 500
                return {
                    message: '未知错误'
                }
            }
        }
    }

    async proxyAxios(ctx, body) {
        const { url, method, headers = {}, body: reqBody } = body
        try {
            const reqData = {
                url,
                method,
                headers,
            }
            if (reqBody) {
                reqData['data'] = reqBody
            }
            const res = await axios.request(reqData)
            // ctx.status = res.status
            ctx.status = 200
            return {
                status: res.status,
                statusText: res.statusText,
                headers: res.headers,
                data: (typeof res.data == 'string') ? res.data : JSON.stringify(res.data),
            }
        }
        catch (err) {
            console.log('err.response', err.response)
            if (err.response) {
                const { status, statusText, data, headers, } = err.response
                ctx.status = 200
                return {
                    status,
                    statusText,
                    data,
                    headers,
                    // headers: res.he
                }
            }
            else {
                console.error(err)
                ctx.status = 500
                return {
                    message: '未知错误'
                }
            }
        }
    }

    async httpRequest(ctx, body) {
        const { url, method, httpVersion = '1.1', headers = {}, body: reqBody } = body
        
        
        const urlObj = new URL(url)
        // console.log('urlObj', urlObj)
        // console.log(urlObj.protocol); // 输出：example.com

        function _doRequest() {
            return new Promise((resolve, reject) => {
                // console.log('urlObj.protocol', urlObj.protocol)
                const sendHeaders = {
                    ...headers,
                    // 'Connection': 'close',
                    // 'Version': 'HTTP/1.0'
                }
                if (reqBody) {
                    sendHeaders['Content-Length'] = reqBody.length
                }
                const options = {
                    httpVersion,
                    protocol: urlObj.protocol,
                    hostname: urlObj.hostname,
                    port: urlObj.port,
                    method,
                    path: `${urlObj.pathname}${urlObj.search || ''}${urlObj.hash || ''}`,
                    headers: sendHeaders,
                    agent: false,
                    rejectUnauthorized: false, // 用于忽略证书验证
                }
                if (!options.port) {
                    if (options.protocol == 'https:') {
                        options.port = '443'
                    }
                    else {
                        options.port = '80'
                    }
                }

                console.log('___options', options)
                
                // const req = (urlObj.protocol == 'http:' ? http : https).request(options, res => {
                const req = myRequest(options, reqBody, res => {
                    // console.log(`statusCode: ${res.statusCode}`)
                
                    // let all_data = ''
                    // res.on('data', data => {
                    //     // process.stdout.write(d);
                    //     all_data += data.toString()
                    // })
                    // res.on('end', () => {
                    //     // process.stdout.write(d);
                    //     // console.log('end', all_data)
                    // })
                    console.log('res', res)
                    resolve({
                        status: res.statusCode,
                        statusText: res.statusMessage,
                        data: res.content,
                        headers: res.headers,
                        requestRaw: res.requestRaw,
                        responseRaw: res.responseRaw,
                        socket: res.socket,
                    })
                })
                req.on('error', error => {
                    console.error('client_error', error)
                    reject(error)
                })
                // if (reqBody) {
                //     req.write(reqBody)
                // }
                
                // req.end()
            })
        }
        return await _doRequest()
    }

    async debug(params) {
        const { body, query, url, headers, method } = params
        return {
            body,
            query,
            url,
            headers,
            method,
        }
    }
}
