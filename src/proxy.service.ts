// const net = require('net');
import * as net from 'net'
import { uid } from 'uid';
import { sendTcpMsg, sendWebSocketMsg } from './ssh.service';
import { WebSocket, Server } from 'ws'
import moment = require('moment');
// const dgram = require('dgram')
import * as dgram from 'dgram'
import * as http from 'http'
import * as https from 'https'
import * as path from 'path'
import * as url from 'url'
import * as fs from 'fs'
const forge = require('node-forge');
const pki = forge.pki;
// const http = require('http')
// var http = require("http");
// var url = require("url");

let g_server: http.Server
let g_httpsServer: net.Server
let g_socketServer: net.Server
let g_hostPortMap = {}

const root_key = `-----BEGIN RSA PRIVATE KEY-----
Proc-Type: 4,ENCRYPTED
DEK-Info: AES-128-CBC,E4461FB6CA608D76C1CABF103CE877F3

QRHBuwmCdCSWNxZi0EbI8cGfenkeXFrk5zDq6bU9ze77mmaXEkimaiCNN/JU8ezc
X1vBC5K4q/VYzzWi3twssj9AR8SYpnm4Eg0l1D0VNyzPTJMbciHj/y0J86JfKVXE
t4gR4xEmQWpyBXe6lrPlgZhlqx0eJh0QYHgqAiYG/nVklZ11FXykthRGSIHglA/k
o3kMYcaLaekHXbvTNQjgpvg+DBVtMRmJKHgY0ZHmoU35ub9Z+GP7pCnatuv2b6XV
HXHPVqzXrAGHziaI9MBSh/HA/0d1/TAJj48EWZaPnBIlyMhR3wBg8CYu8fR5zMdE
1M7y6wy9rLA9kolcV9TMQvL5eEJmF9mOpFmYpKepHT+21rXrj1RIMvPFIxuL/B4H
AOdaHtQkgiWKQJgcsOOQLGupRuAetAPn59VEb10i6nOtd4m8ZTcFXD0C7nqSk42P
ZndZzxsrChLS9WafyrJs67maHqnQYK0wovyOEb4TAquxqZluurs6FHJ8HvHKH9cI
Q+6fEXTt1hIlfPH8FZDBUuAqPLC4zm3vTO0vykNlSGMMKzfXifH+uK8ee5uE0grw
MMA+tcovp7qUeRW+HniGgMfaCzIX3+XDkxVE8BnsbkTezOP4Ms77ThbMZYK77EjM
uTX0bPq5fLjdkP1fgFc64a5Alioe1SxOVzsEW108vBUZnLcr+SqSxL3V/NnSZFjb
3dV1NvZGqzhRSX9l93/2lKUTSy8wVvmLmLA5LAglofuli4rEBV+PLTJFCLi0706K
5o1jB01elpMFhuMQI96jqPfl6wEolWTcSosR1G4x7XkqYiKaS/nfYkipNTssAIWQ
HwQ93mUdUOaYIXshtDf3wu8PZhxYDPEnS0/ygTd8DsuNzdXpizy08bJfHqIh7u+0
FE++ZrY9/3C8HiT2ghnajF1MxwLT2Xw7Vk1s0yEi60VY5HoPoQrcdN8M9lwju/MS
vCUcstkjax0WGJCCi8AzhaU3JE2gz1GFc2xPbjRnSXl/qihiNQpT4caoovLeoS1B
j+0plGEUePM5Dbubn0ccGjh8AN+eZNgBsgqO2vq9yPcokH4nHhItQTOrSQVgicmU
W8H6Jes1XPX5YH47HvfFbhodlF6CHIXJ9FjVWL4pNfrzfExyGYhCCoyTuycqYq7q
Rm7BCCo1VsFkTtEL9iRiER/IzQqoep+H+UKsV6+HTD8R8sMuJF49xYrKl0jwUEJA
1wi3VyZDoGI8x9wn7TzmR++UJrboZR5pvL3tnDWCtfQnMMTsnLi5PZMbJKvW3g89
KF2nhbZo9P6rwll8Z/Cu9bQMy1uYZ6jVWwUNJOQy12sOvWIYv12H/VQRgy++79++
3Zaiumlc+YBTORBItFslxaYRrjv7OVJbKSJvNUaBfRk2gsqjfOtOM+dgqKOm7FEs
aANa8yCi67EIZzhbtu25Kmo+lCmIporX2wF2MWvVmNV9Bj9IU+tuUcf4tHkQCYTx
7gIOyJuXkgbJ/MNcCEMQuxNC551EPaJKkWrwDpC24usbwufsZuXZ7yealpJrjWP1
5zstzxbQgqf56HOHwGX+vQur55qnO8qqUIU6LeT6xZWrm0rcjH1vORvJ7ZfolMZM
-----END RSA PRIVATE KEY-----
`
const root_cert = `-----BEGIN CERTIFICATE-----
MIIDWDCCAkACCQDNbyWUa7SohjANBgkqhkiG9w0BAQUFADBuMQswCQYDVQQGEwJD
TjELMAkGA1UECAwCR0QxCzAJBgNVBAcMAkdaMQswCQYDVQQKDAJZUzELMAkGA1UE
CwwCSVQxDTALBgNVBAMMBFlTQ0ExHDAaBgkqhkiG9w0BCQEWDWNhQHl1bnNlci5j
b20wHhcNMjMwMzA3MDU0MTUyWhcNNDMwMzAyMDU0MTUyWjBuMQswCQYDVQQGEwJD
TjELMAkGA1UECAwCR0QxCzAJBgNVBAcMAkdaMQswCQYDVQQKDAJZUzELMAkGA1UE
CwwCSVQxDTALBgNVBAMMBFlTQ0ExHDAaBgkqhkiG9w0BCQEWDWNhQHl1bnNlci5j
b20wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC81oax0qQQnGcU9yT7
4Dm1f4A5yiNj3xyThjU8Tg1NF7x9AejEPN0eBLC6ziGfEssDe+nCl3nIo+IUL8Fa
Ed2x5MnZSpYM82uzGE5j3K9Nwen6qyb/9bTGVR9IOkZSFrf37wHHFu8SStBpcr8M
Mit7fPFDwIUQGpfgqwV5rVQhS4GaCqccMB4kCuuXjUOWJs22sz3WgHxn7/OG7Z0c
KlC8PzAeqL/ow6V+g6BZzSs2WnCQxIULih8KxLrU1l242GSODZGqUiig9zCpbLDt
tly50g/QXUouUJNdkVamiMXtvWMl9ojsFFtsS+trS87bNFLyMxLVllfAdmvHJB+Z
MqaBAgMBAAEwDQYJKoZIhvcNAQEFBQADggEBABBJsSNC6/5oxcDo+Uc1rArSQyU+
4ZS7i77MfTIR8UDxcA8h5OutJhl2Jhufck5dDyek7/mmK8lL5GPcC4Mu9ENBzCtT
pB0YgFC7CtkB8qrDSGHic9opi1lOSLedHaOVljLUEFBCWlSidX3DleMawvlga7R9
SQEaX/5sEe9ejDaL33qDSTOvfsdWyL+SloorsmtcdPAFNPbYmmAw2ALpbS130fP9
O8Womkh1nXN2WKalJfTkmpf4gWjjDuVov45hFX2XuTGrQYh6aZT3PAWIwPmLqIgY
tLR7grk6AUHuQcTOWDQrM9Q6TUh3sGAZEJU5AeLvAfFHY3QCfl1jpLm+EFs=
-----END CERTIFICATE-----
`


function parseHeaders(rawHeaders: string[]) {
    const headers = []
    for (let i = 0; i < rawHeaders.length; i += 2) {
        headers.push({
            key: rawHeaders[i],
            value: rawHeaders[i + 1],
        })
    }
    return headers
}


function createUdpServer() {

    const udp_server = dgram.createSocket('udp4')

    udp_server.on('message', (msg, remote) => {
        console.log('udp_server/message', `${remote.address}:${remote.port}`, msg.toJSON());
        // +-----+------+------+----------+----------+----------+
        // | RSV | FRAG | ATYP | DST.ADDR | DST.PORT |   DATA   |
        // +-----+------+------+----------+----------+----------+
        // |  2  |  1   |  1   | Variable |    2     | Variable |
        // +-----+------+------+----------+----------+----------+
        const RSV = msg.slice(0, 0 + 2)
        console.log('RSV', RSV)
        const FRAG = msg[2]
        console.log('FRAG', FRAG)
        const ATYP = msg[3]
        console.log('ATYP', ATYP)
        // IPV4: X'01'
        // 域名: X'03'
        // IPV6: X'04'
        let toAddr
        let addrLength
        if (ATYP == 1) {
            toAddr = msg.slice(4, 4 + 4).join('.');
            addrLength = 4
        }
        else if (ATYP == 4) {
            console.log('no support UDP IPv6', )
            return
        }
        else if (ATYP == 3) {
            const domainLen = msg[4]
            toAddr = msg.slice(5, 5 + domainLen).toString("binary");
            addrLength = 1 + domainLen
        }
        console.log('addrLength', addrLength)
        console.log('toAddr', toAddr)
        const portStart = 4 + addrLength
        console.log('portStart', portStart)
        const toPort = msg.slice(portStart, portStart + 2).readUInt16BE(0)
        console.log('toPort', toPort)
        const dataStart = portStart + 2
        const content = msg.slice(dataStart)
        console.log('content', content.toString())


        const udpClient = dgram.createSocket('udp4');
        // const message = Buffer.from('Hello2');
        udpClient.send(content, toPort, toAddr, (err) => {
            if (err) {
                console.log('发送失败');
            } else {
                console.log('发送成功');
            }
            udpClient.close();
        });


        {
            const info = g_hostPortMap[`${toAddr}:${toPort}`]
            console.log('info', info, g_hostPortMap)
            if (info) {
                const { webSocketId, clientId } = info
                const time = moment().format('YYYY-MM-DD HH:mm:ss')
                sendTcpMsg({
                    webSocketId,
                    message: {
                        type: 'udpClientSent',
                        data: {
                            id: uid(8),
                            time,
                            // content,
                            // contentType,
                            type: 'udpClientSent',
                            toAddr,
                            toPort,
                            content: content.toString(),
                            // host: remoteAddr,
                            // port: remotePort,
                            clientId,
                        }
                    }
                })
            }
        }

    });

    udp_server.bind(1, '0.0.0.0')

}

createUdpServer()

export class ProxyService {

    async create(body) {
        const { host = '0.0.0.0', port = 6666, webSocketId } = body
        console.log('proxy/create', )

        if (g_server) {
            g_server.close()
        }

        // 服务器会在获得所有 HTTP 请求头（而不是请求正文时）时调用回调。
        g_server = http.createServer(function (req, res) {
            console.log('======== proxy start',)
            // console.log('run',)
            //客户端请求有两种方式，可以是对象，也可以是url字符串
            //1.这里采取的是对象形式，包括url对象以及headers
            console.log('req', req.method, req.url)
            
            // console.log('url', req.url)
            var options = url.parse(req.url);
            console.log('options', options)
            options['headers'] = req.headers;
            console.log('req.headers', req.headers)
            // console.log('req.headers', req.bo)
            //2.如果采取字符串形式，就传入一个完整的url字符串，node会自动解析成url对象

            let _reqData = ''
            let _resData = ''

            //通过客户端请求新建一个代理服务器
            //代理请求仿照本地请求头的数据
            var proxyRequest = http.request(options, function (proxyResponse) {     //代理请求获取的数据再返回给本地res
                console.log('-------->')
                console.log('res', proxyResponse.statusCode, proxyResponse.statusMessage)
                console.log('res.headers', proxyResponse.headers)
                proxyResponse.on('data', function (chunk) {
                    // console.log('proxyResponse length:', chunk.length);
                    // console.log('res.body:', chunk.toString());
                    _resData += chunk.toString()
                    // res.write(chunk, 'binary');
                    res.write(chunk, 'binary');
                    // res.write(chunk.toString().replace('description', 'DDD'), 'utf8', () => {
                    //     // console.log("Writing string Data...");
                    // });
                });
                //当代理请求不再收到新的数据，告知本地res数据写入完毕。
                proxyResponse.on('end', function () {
                    console.log('======== proxy end')
                    res.end();
                    const time = moment().format('YYYY-MM-DD HH:mm:ss')
                    sendTcpMsg({
                        webSocketId,
                        message: {
                            type: 'request',
                            data: {
                                id: uid(8),
                                time,
                                // content: '123',
                                // contentType,
                                type: 'request',
                                request: {
                                    method: req.method,
                                    host: options.host,
                                    path: options.path,
                                    httpVersion: req.httpVersion,
                                    headers: parseHeaders(req.rawHeaders),
                                    content: _reqData,
                                },
                                response: {
                                    httpVersion: proxyResponse.httpVersion,
                                    statusCode: proxyResponse.statusCode,
                                    statusMessage: proxyResponse.statusMessage,
                                    headers: parseHeaders(proxyResponse.rawHeaders),
                                    content: _resData,
                                },
                                // host,
                                // port,
                            }
                        }
                    })
                });

                res.writeHead(proxyResponse.statusCode, proxyResponse.headers);
            });

            
            //data只有当请求体数据进来时才会触发
            //尽管没有请求体数据进来，data还是要写，否则不会触发end事件
            req.on('data', (chunk) => {
                console.log('in request length:', chunk.length);
                _reqData += chunk.toString()
                proxyRequest.write(chunk, 'binary');
            });
            
            req.on('end', function () {
                //向proxy发送求情，这里end方法必须被调用才能发起代理请求
                //所有的客户端请求都需要通过end来发起
                proxyRequest.end();
                console.log('req.body', _reqData)
            });

        })
        // .listen(7880)
        .listen(port, host, () => {
            console.log('listening', )
            const time = moment().format('YYYY-MM-DD HH:mm:ss')
            sendTcpMsg({
                webSocketId,
                message: {
                    type: 'listening',
                    data: {
                        id: uid(8),
                        time,
                        // content,
                        // contentType,
                        type: 'listening',
                        host,
                        port,
                    }
                }
            })
        })
        .on('close', () => {
            console.log('proxy/close', )
            const time = moment().format('YYYY-MM-DD HH:mm:ss')
            sendTcpMsg({
                webSocketId,
                message: {
                    type: 'close',
                    data: {
                        id: uid(8),
                        time,
                        // content,
                        // contentType,
                        type: 'close',
                        host,
                        port,
                    }
                }
            })
        })
        // const time = moment().format('YYYY-MM-DD HH:mm:ss')
        // sendTcpMsg({
        //     webSocketId,
        //     message: {
        //         type: 'listening',
        //         data: {
        //             id: uid(8),
        //             time,
        //             // content,
        //             // contentType,
        //             type: 'listening',
        //             host,
        //             port,
        //         }
        //     }
        // })
        console.log('proxy service start')

        return {}
    }

    async createHttpsProxy(body) {
        const { host = '0.0.0.0', port = 6667, webSocketId } = body

        if (g_httpsServer) {
            g_httpsServer.close()
            g_httpsServer = null
        }
        
        const caCertPem = Buffer.from(root_cert)
        const caKeyPem = Buffer.from(root_key)
        const caCert = forge.pki.certificateFromPem(caCertPem);
        const caKey = forge.pki.decryptRsaPrivateKey(caKeyPem, 'Test@2022')

        /**
         * 根据CA证书生成一个伪造的https服务
         * @param  {[type]} ca         [description]
         * @param  {[type]} targetDomain     [description]
         * @param  {[type]} successFun [description]
         * @return {[type]}            [description]
         */
        function createFakeHttpsWebSite(targetDomain, targetPort, successFun) {

            // console.log('domain', domain)
            // console.log('caKey', caKey)
            const fakeCertObj = createFakeCertificateByDomain(caKey, caCert, targetDomain)
            // console.log('fakeCertObj', fakeCertObj)
            var fakeServer = new https.Server({
                key: fakeCertObj.key,
                cert: fakeCertObj.cert,
                // SNICallback: (hostname, done) => {
                //     let certObj = createFakeCertificateByDomain(caKey, caCert, hostname)
                //     done(null, tls.createSecureContext({
                //         key: pki.privateKeyToPem(certObj.key),
                //         cert: pki.certificateToPem(certObj.cert)
                //     }))
                // }

                // key: fs.readFileSync('./myssl_private.key'),
                // cert: fs.readFileSync('./myssl_full_chain.pem'),
            });

            fakeServer.listen(0, () => {
                var address = fakeServer.address();
                successFun(address['port']);
            });
            fakeServer.on('request', (clientReq, clientRes) => {
                // console.log('======== request start',)
                // console.log('url', clientReq.method, clientReq.url)

                // console.log('req.data', req.data)
                // req.socket.on('data', (data) => {
                //     console.log('req.socket/data', data.toString())
                // })

                // 解析客户端请求
                const urlObject = url.parse(clientReq.url)
                
                const reqOpts = {
                    protocol: 'https:',
                    hostname: targetDomain,
                    // hostname: clientReq.headers.host.split(':')[0],
                    port: targetPort,
                    // port: clientReq.headers.host.split(':')[1] || 80,
                    method: clientReq.method,
                    // url: clientReq.url,
                    path: urlObject.path,
                    // host: targetDomain,
                    headers: clientReq.headers,

                }
                // console.log('reqOpts', targetDomain, targetPort, reqOpts)

                let otherData: any = {}
                // TODO
                // otherData.connect = str
                // otherData.connectEstablished = connectEstablished
                let allReqData = ''
                const response: any = {
                    httpVersion: '??',
                    statusCode: -1,
                    statusMessage: '??',
                    headers: [],
                    content: '??',
                }

                // let _serverRes
                const serverReq = https.request(reqOpts, (serverRes) => {
                    // _serverRes = serverRes
                    response.httpVersion = serverRes.httpVersion
                    response.statusCode = serverRes.statusCode
                    response.statusMessage = serverRes.statusMessage
                    response.headers = parseHeaders(serverRes.rawHeaders)

                    // console.log('中间/res', serverRes.statusCode)
                    clientRes.writeHead(serverRes.statusCode, serverRes.headers)
                    console.log('',)
                    let allResData = ''
                    // called when a data chunk is received.
                    serverRes.on('data', (chunk) => {
                        allResData += chunk
                        clientRes.write(chunk)
                    });
                    // called when the complete response is received.
                    serverRes.on('end', () => {
                        // console.log('ddd', JSON.stringify(allResData))
                        // console.log('server/end', )
                        response.content = allResData
                        clientRes.end()

                        const time = moment().format('YYYY-MM-DD HH:mm:ss')
                        sendTcpMsg({
                            webSocketId,
                            message: {
                                type: 'request',
                                data: {
                                    id: uid(8),
                                    time,
                                    // content: '123',
                                    // contentType,
                                    type: 'request',
                                    request: {
                                        method: clientReq.method,
                                        host: `${targetDomain}:${targetPort}`,
                                        path: clientReq.url,
                                        httpVersion: clientReq.httpVersion,
                                        headers: parseHeaders(clientReq.rawHeaders),
                                        content: allReqData,
                                    },
                                    response,
                                    ...otherData,
                                    // host,
                                    // port,
                                }
                            }
                        })
                    });
                })
                .on("error", (err) => {
                    console.log("Error: ", err.message);
                    clientRes.end()
                })
                // if (clientReq.method == 'GET') {
                //     serverReq.end()
                // }
                clientReq.on('data', (data) => {
                    // console.log('req.socket/data', data.toString())
                    allReqData += data.toString()
                    serverReq.write(data)
                })
                clientReq.on('end', (data) => {
                    // console.log('client/end')
                    serverReq.end()
                })
                // .end()

                // clientRes.writeHead(200, {})
                // clientRes.write('proxy hello')
                // clientRes.end()
            })
            // fakeServer.on('con')
            fakeServer.on('error', (e) => {
                console.error('fakeServer/error', e)
            })
        }

        // https://github.com/wuchangming/https-mitm-proxy-handbook
        /**
         * 根据所给域名生成对应证书
         * @param  {[type]} caKey  [description]
         * @param  {[type]} caCert [description]
         * @param  {[type]} domain [description]
         * @return {[type]}        [description]
         */
        function createFakeCertificateByDomain(caKey, caCert, domain) {
            var keys = pki.rsa.generateKeyPair(2046);
            var cert = pki.createCertificate();
            cert.publicKey = keys.publicKey;

            cert.serialNumber = (new Date()).getTime() + '';
            cert.validity.notBefore = new Date();
            cert.validity.notBefore.setFullYear(cert.validity.notBefore.getFullYear() - 1);
            cert.validity.notAfter = new Date();
            cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 1);
            var attrs = [{
                name: 'commonName',
                value: domain
            }, {
                name: 'countryName',
                value: 'CN'
            }, {
                shortName: 'ST',
                value: 'GuangDong'
            }, {
                name: 'localityName',
                value: 'ShengZhen'
            }, {
                name: 'organizationName',
                value: 'https-mitm-proxy-handbook'
            }, {
                shortName: 'OU',
                value: 'https://github.com/wuchangming/https-mitm-proxy-handbook'
            }];

            cert.setIssuer(caCert.subject.attributes);
            cert.setSubject(attrs);

            cert.setExtensions([{
                name: 'basicConstraints',
                critical: true,
                cA: false
            },
            {
                name: 'keyUsage',
                critical: true,
                digitalSignature: true,
                contentCommitment: true,
                keyEncipherment: true,
                dataEncipherment: true,
                keyAgreement: true,
                keyCertSign: true,
                cRLSign: true,
                encipherOnly: true,
                decipherOnly: true
            },
            {
                name: 'subjectAltName',
                altNames: [{
                    type: 2,
                    value: domain
                }]
            },
            {
                name: 'subjectKeyIdentifier'
            },
            {
                name: 'extKeyUsage',
                serverAuth: true,
                clientAuth: true,
                codeSigning: true,
                emailProtection: true,
                timeStamping: true
            },
            {
                name: 'authorityKeyIdentifier'
            }]);
            cert.sign(caKey, forge.md.sha256.create());

            const certPem = pki.certificateToPem(cert)
            // console.log('certPem', certPem)
            const keyPem = pki.privateKeyToPem(keys.privateKey)
            // console.log('keyPem', keyPem)
            return {
                key: keyPem,
                // cert: cert
                cert: certPem,
            };
        }




        // =========

        const httpTunnel = new http.Server()
        g_httpsServer = httpTunnel

        httpTunnel.listen(port, host, () => {
            // console.log(`简易HTTPS中间人代理启动成功，端口：${port}`);
            console.log(`server is listening on ${host}:${port}`);
            const time = moment().format('YYYY-MM-DD HH:mm:ss')
            sendTcpMsg({
                webSocketId,
                message: {
                    type: 'listening',
                    data: {
                        id: uid(8),
                        time,
                        // content,
                        // contentType,
                        type: 'listening',
                        host,
                        port,
                    }
                }
            })
        })

        

        // https的请求通过http隧道方式转发
        httpTunnel.on('connect', (req, cltSocket, head) => {
            // connect to an origin server
            var srvUrl = url.parse(`http://${req.url}`)

            // cltSocket.
            // console.log('', )

            createFakeHttpsWebSite(srvUrl.hostname, srvUrl.port, (port) => {
                // console.log('onSuccess', port)
                var srvSocket = net.connect(port, '127.0.0.1', () => {

                    cltSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                        'Proxy-agent: MITM-proxy\r\n' +
                        '\r\n');
                    srvSocket.write(head);
                    srvSocket.pipe(cltSocket);
                    cltSocket.pipe(srvSocket);
                });
                srvSocket.on('error', (e) => {
                    console.error('error?', e);
                });
            })
        })
        .on('error', (e) => {
            // if (e.code == 'EADDRINUSE') {
            //     console.error('HTTP中间人代理启动失败！！');
            //     console.error(`端口：${port}，已被占用。`);
            // } else {
            // }
            console.error(e);
        })
        .on('close', () => {
            console.log('proxy/close', )
            const time = moment().format('YYYY-MM-DD HH:mm:ss')
            sendTcpMsg({
                webSocketId,
                message: {
                    type: 'close',
                    data: {
                        id: uid(8),
                        time,
                        // content,
                        // contentType,
                        type: 'close',
                        host,
                        port,
                    }
                }
            })
        })
        return {}
    }

    async createHttpsProxyUseTcp(body) {
        const { host = '0.0.0.0', port = 6667, webSocketId } = body

        
        const server = net.createServer((socket) => {
            console.log('client connected');
            
            let remoteSocket
            let otherData: any = {}

            socket.on('end', () => {
                console.log('client disconnected');
            });
            socket.on('data', (data) => {
                const str = data.toString()
                // console.log('data/', str);
                console.log('data/');
                // CONNECT local.yunser.com:9443 HTTP/1.1
                // Host: local.yunser.com:9443
                // User-Agent: curl/7.64.1
                // Proxy-Connection: Keep-Alive
                
                if (str.includes('CONNECT ')) {
                    otherData.connect = str
                    console.log('isConnect', )
                    const _url = str.split('\n')[0].split(/\s+/)[1]
                    console.log('url', _url)
                    const urlObj = url.parse('http://' + _url)
                    console.log('obj', urlObj.hostname, urlObj.port)

                    var pSock = net.connect(parseInt(urlObj.port), urlObj.hostname, function() {
                        const connectEstablished = 'HTTP/1.1 200 Connection Established\r\n\r\n'
                        socket.write(connectEstablished);
                        otherData.connectEstablished = connectEstablished
                        console.log('server-Connection Established', )
                        // pSock.pipe(socket);
                    })
                    // console.log('pSock', pSock)
                    remoteSocket = pSock
                    .on('error', function(err) {
                        console.log('server-connect-error')
                        socket.end();
                    })
                    .on('data', (remoteData) => {
                        console.log('remoteData')
                        // console.log('remoteData', remoteData.toString())
                        socket.write(remoteData)
                    })
                    .on('close', (remoteData) => {
                        console.log('remot/close')
                        remoteSocket = null
                    })
                
                    // socket.pipe(pSock);
                }
                else {
                    // console.log('no-handled data', )
                    if (remoteSocket) {
                        try {
                            remoteSocket.write(data)
                        }
                        catch (err) {
                            // TODO 经常触发，先 try 后面再看
                        }
                        console.log('wited', )
                    }
                    else {
                        console.log('remoteSocket/null?',)
                    }

                }
            })
            socket.on('close', () => {
                console.log('client/close', )
                const time = moment().format('YYYY-MM-DD HH:mm:ss')
                sendTcpMsg({
                    webSocketId,
                    message: {
                        type: 'request',
                        data: {
                            id: uid(8),
                            time,
                            // content: '123',
                            // contentType,
                            type: 'request',
                            request: {
                                // method: req.method,
                                // url: req.url,
                                // httpVersion: req.httpVersion,
                                // headers: parseHeaders(req.rawHeaders),
                                // content: _reqData,
                                method: '??',
                                url: '??',
                                httpVersion: '??',
                                headers: [],
                                content: '??',
                            },
                            response: {
                                // httpVersion: proxyResponse.httpVersion,
                                // statusCode: proxyResponse.statusCode,
                                // statusMessage: proxyResponse.statusMessage,
                                // headers: parseHeaders(proxyResponse.rawHeaders),
                                // content: _resData,
                                httpVersion: '??',
                                statusCode: '??',
                                statusMessage: '??',
                                headers: [],
                                content: '??',
                            },
                            ...otherData,
                            // host,
                            // port,
                        }
                    }
                })
            })

        //   socket.write('hello\r\n');
        //   socket.pipe(socket);
        })
        .on('close', () => {
            console.log('proxy/close', )
            const time = moment().format('YYYY-MM-DD HH:mm:ss')
            sendTcpMsg({
                webSocketId,
                message: {
                    type: 'close',
                    data: {
                        id: uid(8),
                        time,
                        // content,
                        // contentType,
                        type: 'close',
                        host,
                        port,
                    }
                }
            })
        })
        g_httpsServer = server

        server.listen(port, host, () => {
            console.log(`server is listening on ${host}:${port}`);
            const time = moment().format('YYYY-MM-DD HH:mm:ss')
            sendTcpMsg({
                webSocketId,
                message: {
                    type: 'listening',
                    data: {
                        id: uid(8),
                        time,
                        // content,
                        // contentType,
                        type: 'listening',
                        host,
                        port,
                    }
                }
            })
        })
        return {}
    }

    async close(body) {
        if (g_server) {
            g_server.close()
        }
    }

    async closeHttpsProxy(body) {
        if (g_httpsServer) {
            g_httpsServer.close()
            g_httpsServer = null
        }
    }

    async createSocket(body) {
        const { host, port, webSocketId } = body
        if (g_socketServer) {
            g_socketServer.close()
        }
        let server = net.createServer(function (socket) {
            const clientId = uid(8)
            let clientRemote: net.Socket

            
            console.log('======== socks start', clientId)
            console.log('client_socket/create', )
            const addr = socket.address() as any
            console.log('client_socket/addr', addr.family, addr.address, addr.port)
            // IPv6 ::ffff:127.0.0.1 6668

            // 连接成功后进行协商认证，发送一个数据包
            // +-----+----------+----------+
            // | VER | NMETHODS | METHODS  |
            // +-----+----------+----------+
            // |  1  |    1     | 1 to 255 |
            // +-----+----------+----------+
            // VER： 协议版本号

            // NMETHODS：客户端支持的认证方法数量

            // METHODS：每个byte对应一个认证方法

            // X'00' 不需要身份验证(NO AUTHENTICATION REQUIRED)
            // X'01' GSSAPI
            // X'02' 用户密码认证(USERNAME/PASSWORD)
            // X'03' to X'7F' IANA ASSIGNED
            // X'80' to X'FE' RESERVED FOR PRIVATE METHODS
            socket.once('data', function (data) {
                console.log('tcp_proxy/once_data', JSON.stringify(data))
                if (!data) {
                    console.log('tcp_proxy/destroy/no_data', )
                    return socket.destroy()
                }
                if (data[0] !== 0x05) {
                    console.log('tcp_proxy/destroy/no_v5', data.toString())
                    return socket.destroy()
                }
                console.log('is_v5', )
                // 代理服务器返回一个应答数据包

                // +-----+--------+
                // | VER | METHOD |
                // +-----+--------+
                // |  1  |   1    |
                // +-----+--------+
                // VER: 指定协议版本号，此处为X'05'

                // METHOD: 指定认证方法。该方法应从客户端提供的认证方法中挑选一个，或者是X'FF'用以拒绝认证
                socket.write(Buffer.from([5, 0]), function (err) {
                    if (err) {
                        console.log('tcp_proxy/write error', )
                        socket.destroy()
                        return
                    }
                    console.log('socks5 协商认证完成', )
                    // once和on不同的地方就是，once只监听一次，会在回调函数执行完毕后，取消监听。
                    socket.once('data', (data) => {
                        console.log('tcp_proxy/请求代理 data', JSON.stringify(data))
                        // console.log('tcp_proxy/buff_data', data.data)
                        // console.log(JSON.stringify(buff));
                        // [5,1,0,3,24,119,119,119,46,103,111,111,103,108,101,45,97,110,97,108,121,116,105,99,115,46,99,111,109,1,187]
                        // console.log('version', data.slice(0, 0 + 1))
                        // console.log('RESPONSE', data.slice(1, 1 + 1))
                        // console.log('RSV', data.slice(2, 2 + 1))
                        // console.log('ADDRESS_TYPE', data.slice(3, 3 + 1))
                        // console.log('BND.ADDR', data.slice(4, data.length - 3))
                        // console.log('BND.PORT', data.slice(data.length - 2, data.length))
                        // console.log('BND.PORT2', data.slice(data.length - 2, data.length).toString())
                        // 请求代理
                        // 客户端在认证成功之后，需要发送一个数据包来请求服务端:

                        // +-----+-----+-------+------+----------+----------+
                        // | VER | CMD |  RSV  | ATYP | DST.ADDR | DST.PORT |
                        // +-----+-----+-------+------+----------+----------+
                        // |  1  |  1  | X'00' |  1   | Variable |    2     |
                        // +-----+-----+-------+------+----------+----------+
                        // VER: 协议版本号，此处为X'05'

                        // CMD: 指定代理方式
                        if (data.length < 7) {
                            console.log('数据长度不对')
                            return socket.destroy()
                        }
                        if (data[1] == 0x01) {
                            // CONNECT
                            try {
                                const addrtype = data[3];// ADDRESS_TYPE 目标服务器地址类型
                                console.log('addrtype', addrtype)
                                let addrLen
                                if (addrtype === 3) {//0x03 域名地址(没有打错，就是没有0x02)，
                                    addrLen = data[4];//域名地址的第1个字节为域名长度，剩下字节为域名名称字节数组
                                } else if (addrtype !== 1 && addrtype !== 4) {
                                    return socket.destroy();
                                }
                                const remotePort = data.readUInt16BE(data.length - 2);//最后两位为端口值
        
                                let remoteAddr
                                if (addrtype === 1) {// 0x01 IP V4地址
                                    
                                    remoteAddr = data.slice(4, 4 + 4).join('.');
                                }
                                else if (addrtype === 4) { //0x04 IP V6地址
                                    return socket.write(Buffer.from([0x05, 0x08, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));//不支持IP V6
                                }
                                else {//0x03 域名地址(没有打错，就是没有0x02)，域名地址的第1个字节为域名长度，剩下字节为域名名称字节数组
                                    remoteAddr = data.slice(5, 5 + addrLen).toString("binary");
                                }
                                console.log(`remote_info : ${remoteAddr}:${remotePort}`);
        
                                {
                                    const time = moment().format('YYYY-MM-DD HH:mm:ss')
                                    sendTcpMsg({
                                        webSocketId,
                                        message: {
                                            type: 'clientConnected',
                                            data: {
                                                id: uid(8),
                                                time,
                                                // content,
                                                // contentType,
                                                type: 'clientConnected',
                                                host: remoteAddr,
                                                port: remotePort,
                                                clientId,
                                            }
                                        }
                                    })
                                }
        
                                let remote = net.connect(remotePort, remoteAddr, function () {
                                    console.log(`connected : ${remoteAddr}:${remotePort}`);
                                    // 告诉客户端代理成功
                                    // +-----+-----+-------+------+----------+----------+
                                    // | VER | REP |  RSV  | ATYP | BND.ADDR | BND.PORT |
                                    // +-----+-----+-------+------+----------+----------+
                                    // |  1  |  1  | X'00' |  1   | Variable |    2     |
                                    // +-----+-----+-------+------+----------+----------+
                                    socket.write(Buffer.from([
                                        0x05,
                                        0x00, // 代理成功
                                        0x00, // 固定
                                        0x01, // ATYP
                                        // 绑定地址
                                        0x00, 0x00, 0x00, 0x00,
                                        // 绑定端口
                                        0x00, 0x00
                                    ]), function (err) {
                                        if (err) {
                                            console.log(`告诉客户端代理成功 error:${err.message}`);
                                            return socket.destroy();
                                        }
                                        // socket.pipe(remote);
                                        console.log('告诉客户端代理成功/pined', )
                                        // remote.pipe(socket);
                                        socket.on('data', function (data) {
                                            // console.log('tcp_proxy/on_data', data.toString())
                                            console.log('tcp_proxy/on_data', '...')
                                            const time = moment().format('YYYY-MM-DD HH:mm:ss')
                                            sendTcpMsg({
                                                webSocketId,
                                                message: {
                                                    type: 'clientSent',
                                                    data: {
                                                        id: uid(8),
                                                        time,
                                                        content: data.toString(),
                                                        // contentType,
                                                        type: 'clientSent',
                                                        // host,
                                                        // port,
                                                        clientId,
                                                    }
                                                }
                                            })
                                            if (!data) {
                                                console.log('tcp_proxy/on_data/destroy', )
                                                return socket.destroy()
                                            }
                                            remote.write(data)
                                        })
                                    });
                                })
                                clientRemote = remote
                                remote.on('data', (data) => {
                                    console.log('remote/ondata', '...')
                                    // console.log('remote/ondata', data.toString())
                                    socket.write(data)
                                    const time = moment().format('YYYY-MM-DD HH:mm:ss')
                                    sendTcpMsg({
                                        webSocketId,
                                        message: {
                                            type: 'clientReceived',
                                            data: {
                                                id: uid(8),
                                                time,
                                                content: data.toString(),
                                                // contentType,
                                                type: 'clientReceived',
                                                // host,
                                                // port,
                                                clientId,
                                            }
                                        }
                                    })
                                })
                                remote.on('error', function (err) {
                                    console.log(`连接到远程服务器 ${remoteAddr}:${remotePort} 失败,失败信息:${err.message}`);
                                    remote.destroy();
                                    socket.destroy();
                                });
                            }
                            catch (e) {
                                console.log('err', e)
                                console.log(e);
                            }
                        }
                        else if (data[1] == 0x03) {
                            // UDP ASSOCIATE
                            console.log('UDP ASSOCIATE', )
                            try {
                                const addrtype = data[3];// ADDRESS_TYPE 目标服务器地址类型
                                console.log('addrtype', addrtype)
                                let addrLen
                                if (addrtype === 3) {//0x03 域名地址(没有打错，就是没有0x02)，
                                    addrLen = data[4];//域名地址的第1个字节为域名长度，剩下字节为域名名称字节数组
                                } else if (addrtype !== 1 && addrtype !== 4) {
                                    return socket.destroy();
                                }
                                const remotePort = data.readUInt16BE(data.length - 2);//最后两位为端口值

                                let remoteAddr
                                if (addrtype === 1) {// 0x01 IP V4地址
                                    
                                    remoteAddr = data.slice(4, 4 + 4).join('.');
                                }
                                else if (addrtype === 4) { //0x04 IP V6地址
                                    return socket.write(Buffer.from([0x05, 0x08, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));//不支持IP V6
                                }
                                else {//0x03 域名地址(没有打错，就是没有0x02)，域名地址的第1个字节为域名长度，剩下字节为域名名称字节数组
                                    remoteAddr = data.slice(5, 5 + addrLen).toString("binary");
                                }
                                console.log(`remote_info : ${remoteAddr}:${remotePort}`)

                                g_hostPortMap[`${remoteAddr}:${remotePort}`] = {
                                    webSocketId,
                                    clientId,
                                }

                                {
                                    // const time = moment().format('YYYY-MM-DD HH:mm:ss')
                                    // sendTcpMsg({
                                    //     webSocketId,
                                    //     message: {
                                    //         type: 'clientConnected',
                                    //         data: {
                                    //             id: uid(8),
                                    //             time,
                                    //             // content,
                                    //             // contentType,
                                    //             type: 'clientConnected',
                                    //             host: remoteAddr,
                                    //             port: remotePort,
                                    //             clientId,
                                    //         }
                                    //     }
                                    // })
                                }
                                
                                socket.write(Buffer.from([
                                    0x05,
                                    0x00, // 代理成功
                                    0x00, // 固定
                                    0x01, // ATYP
                                    // 绑定地址
                                    0x00, 0x00, 0x00, 0x00,
                                    // 绑定端口
                                    // 0 端口会导致客户端 [ERR_SOCKET_BAD_PORT]: Port should be > 0 and < 65536. Received 0
                                    0x00, 0x01
                                ]), function (err) {
                                    if (err) {
                                        console.log(`告诉客户端代理成功 error:${err.message}`);
                                        return socket.destroy();
                                    }
                                    // socket.pipe(remote);
                                    console.log('告诉客户端代理成功/pined', )
                                    // remote.pipe(socket);
                                    socket.on('data', function (data) {
                                        console.log('tcp_proxy/on_data??', data.toString())
                                    })
                                });
                            }
                            catch (e) {
                                console.log('err', e)
                                console.log(e);
                            }
                        }
                        else {
                            console.log('no_support_CMD', )
                            return socket.destroy()
                        }
                    });
                });
            })
            
            socket.on('error', function (err) {
                console.log(`client_socket/on_error:${err.message}`)
            })
            socket.on('close', () => {
                console.log('client_socket/on_close', clientId)
                if (clientRemote) {
                    clientRemote.end(() => {
                        clientRemote.destroy()
                        clientRemote = null
                    })
                }

                {
                    const time = moment().format('YYYY-MM-DD HH:mm:ss')
                    sendTcpMsg({
                        webSocketId,
                        message: {
                            type: 'clientClose',
                            data: {
                                id: uid(8),
                                time,
                                // content,
                                // contentType,
                                type: 'clientClose',
                                // host,
                                // port,
                                clientId,
                            }
                        }
                    })
                }
            })
        })
        g_socketServer = server
        server.listen(port, host, () => {
            console.log('listened', )
            const time = moment().format('YYYY-MM-DD HH:mm:ss')
            sendTcpMsg({
                webSocketId,
                message: {
                    type: 'listening',
                    data: {
                        id: uid(8),
                        time,
                        // content,
                        // contentType,
                        type: 'listening',
                        host,
                        port,
                    }
                }
            })
        })
        .on('close', () => {
            console.log('tcp_proxy/close', )
            const time = moment().format('YYYY-MM-DD HH:mm:ss')
            sendTcpMsg({
                webSocketId,
                message: {
                    type: 'close',
                    data: {
                        id: uid(8),
                        time,
                        // content,
                        // contentType,
                        type: 'close',
                        host,
                        port,
                    }
                }
            })
        })
        console.log('tcp_proxy/listen at', port)
        return {}
    }

    async closeSocket(body) {
        if (g_socketServer) {
            g_socketServer.close()
        }
    }

    async getRootCert(body) {
        return {
            cert: root_cert,
        }
    }
}
