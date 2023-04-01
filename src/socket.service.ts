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
import * as http2 from 'http2'
import { loadDbJson } from './utils';
// const http = require('http')
import * as fs from 'fs'
import * as tls from 'tls'
import * as zlib from 'zlib'

// http2.constants.NGHTTP2_SETTINGS_TIMEOUT

function parseRequestHeader(text: string) {
    // const text = [
    //     'GET / HTTP/1.1',
    //     'user-agent: vscode-restclient',
    //     'accept-encoding: gzip',
    //     '',
    //     'hello'
    // ].join('\r\n')
    const lines = text.split(/\r\n/g)
    console.log('lines', lines)
    const headers = {}
    for (let i = 1; i < lines.length; i++) {
        const headerLine = lines[i]
        const [key, value] = headerLine.split(':')
        if (key && value) {
            headers[key.toLowerCase().trim()] = value.toLowerCase().trim()
        }
        // const m = headerLine.match(/:/)
        // if (m) {
        //     console.log('m', m)
        //     const key = headerLine.substring(0, m.index).trim().toLowerCase()
        //     const value = headerLine.substring(m.index).trim().toLowerCase()
        //     headers[key] = value
        // }
    }
    console.log('headers', headers)
    return {
        headers,
    }
}

// parseRequestHeader()

const fixed_key = `-----BEGIN RSA PRIVATE KEY-----
MIIEpQIBAAKCAQEAziPn0R8ZI8ET2G8CxJZruEUaHZhRqhRankXpPs4SC/tettpl
nRXYFkkoN6O8UxBvoLRZ8H2CxUehpmz+EAlL05kbAWIZBDr6FGLAtEVyizxQEGvc
UcsyOmUDsYBkc4yyuR0vPmZYImNlJA0AhqE7hBF1BLIVYeXkM/IGV5RppnPUXDW+
0nLvKewup7EcZhTmB+yvQ4iOTCWKMvweV6oIZo3SLEKazh1Kc5LxEnWuWIdQuMtq
DK2zP8qhZaAoKhV+0tnDSWGcSiL0ZMzDyYSthzMTXKlRBp/duW186gsOy+pdMFwH
4dj0Ae5Tj4ncQl5zmjWHUjWnU67eC/P4rDNOMwIDAQABAoIBAEyzxIKmCSMqKRm7
+LIwbEWFBNolPqHD8BH7XnYdlE58CnqMWgnwwlZMg1fsp1ra/0YzRVH8SafhZu83
l/NcmifSTN+fYkKWNU5Xjm+ldaEEYKAzmiefLYHX619lMDtki23gw5760ul8xXn8
EomFvdD+8+U65ETolxiTAjQdR5CE1ljmh9iINB1vQUu9/iYEqlJEh/mBUXvA4Ru4
ggAc5vK3S6pvn9pgZagii83RgFWx9XShYaGSknzbGgLBExqYcFGmkYtFwdRg8rW5
9M4E1DKE4Lvke47Z4M0OVQvW9FIGI7eUZV2+b2DMR5hx4HpNY89KZDct9HL3gD9b
v/5EpZkCgYEA+iK7Cu3E5cIeewHdPlQ7fBiuy1ZP83YdVNAwJPDvxLrkxiHOsYrb
l2dUTrsWKfbAX61n6WGzapgJKM+BCpSerUPtgISTG+9e4MvgJiJiFlmg5wt39CSe
xiiAtMsGfM4ob6q36/JQ/rZlQLNqi71qFVSwLQbskPKOQb2y7tufxSkCgYEA0vkf
UeYN91+nNVB5uifi+VVPfjXyzwgVOkGG+pC3LWHIdrLRPFl2bkOqvQYD7ONMgweB
kPYZemVRZTVi7dz7Sf2q/LjmEYPKE0PMlgKz8FxH/x1wwXoQVr/QIwGTenspjSyI
UO2mFhant/R3ssd2B0Rj5+gb1DoQj+NSLuYd5/sCgYEAyN+XQcGMO87WV4Y5vFI8
qv3PcW/RKP0TtQazgxcSFfTYv9xqdt3CVyYd6FQKCo0kFDHXnu5c/R83S9TIFk0f
2JkSZAETen2Svgg766P1DWnQ83qcTC4Ua6IfKhFZFmUgx/xbU1n3fXXQflMXHz1v
sc2e5aoH1KdVYqoKxhMNjXECgYEAqTU7pIEiRHyIbF9OMjsZdSayKiT0yI3QELhL
nR2CfTiHAoSrAn8yWH+XKiHv9gfb7t+PUIfBqYQng0gNP3/UX+S/RhC6HeQYp9jh
9pLWZPpumDOxosvW3Ozc76as9Thg/CRydI4WfnLPM+A0PMRzaqK0imSEJXQoom8N
FCZmaA8CgYEAiW/eubbV9W4fHz2mq7MUmJKb+vhwF1/NfW/Pcq7Iu5RC6r86HSno
cWNEElJ/O8Dp+/BcoR41s5N4Qvsk9lz7zM5GeeRX30ZC4uG1xc5nUJO0uJmw1cpR
bnbLrVawq6taXnXrN4fs+crX1HiiuLf6uW1sfulwK9G0YMwFaPU1/mQ=
-----END RSA PRIVATE KEY-----
`
const fixed_crt = `-----BEGIN CERTIFICATE-----
MIIF9TCCBN2gAwIBAgIQBLVq2+v+CXFwP+7m7K5xzTANBgkqhkiG9w0BAQsFADBu
MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3
d3cuZGlnaWNlcnQuY29tMS0wKwYDVQQDEyRFbmNyeXB0aW9uIEV2ZXJ5d2hlcmUg
RFYgVExTIENBIC0gRzEwHhcNMjMwMjA2MDAwMDAwWhcNMjQwMjA1MjM1OTU5WjAb
MRkwFwYDVQQDExBsb2NhbC55dW5zZXIuY29tMIIBIjANBgkqhkiG9w0BAQEFAAOC
AQ8AMIIBCgKCAQEAziPn0R8ZI8ET2G8CxJZruEUaHZhRqhRankXpPs4SC/tettpl
nRXYFkkoN6O8UxBvoLRZ8H2CxUehpmz+EAlL05kbAWIZBDr6FGLAtEVyizxQEGvc
UcsyOmUDsYBkc4yyuR0vPmZYImNlJA0AhqE7hBF1BLIVYeXkM/IGV5RppnPUXDW+
0nLvKewup7EcZhTmB+yvQ4iOTCWKMvweV6oIZo3SLEKazh1Kc5LxEnWuWIdQuMtq
DK2zP8qhZaAoKhV+0tnDSWGcSiL0ZMzDyYSthzMTXKlRBp/duW186gsOy+pdMFwH
4dj0Ae5Tj4ncQl5zmjWHUjWnU67eC/P4rDNOMwIDAQABo4IC4DCCAtwwHwYDVR0j
BBgwFoAUVXRPsnJP9WC6UNHX5lFcmgGHGtcwHQYDVR0OBBYEFItMDj+lY1+13cmF
NectBvACTduEMBsGA1UdEQQUMBKCEGxvY2FsLnl1bnNlci5jb20wDgYDVR0PAQH/
BAQDAgWgMB0GA1UdJQQWMBQGCCsGAQUFBwMBBggrBgEFBQcDAjA+BgNVHSAENzA1
MDMGBmeBDAECATApMCcGCCsGAQUFBwIBFhtodHRwOi8vd3d3LmRpZ2ljZXJ0LmNv
bS9DUFMwgYAGCCsGAQUFBwEBBHQwcjAkBggrBgEFBQcwAYYYaHR0cDovL29jc3Au
ZGlnaWNlcnQuY29tMEoGCCsGAQUFBzAChj5odHRwOi8vY2FjZXJ0cy5kaWdpY2Vy
dC5jb20vRW5jcnlwdGlvbkV2ZXJ5d2hlcmVEVlRMU0NBLUcxLmNydDAJBgNVHRME
AjAAMIIBfgYKKwYBBAHWeQIEAgSCAW4EggFqAWgAdgB2/4g/Crb7lVHCYcz1h7o0
tKTNuyncaEIKn+ZnTFo6dAAAAYYnsurlAAAEAwBHMEUCIQCWWTvYPulA7L6/MGJU
+ZGAZmYpKUA8q15vXq8EbLmfFwIgXTq9+hge/RJ3VnWxzZw0NEho4KKnSIl7mLaq
zlpsFN4AdQBz2Z6JG0yWeKAgfUed5rLGHNBRXnEZKoxrgBB6wXdytQAAAYYnsur3
AAAEAwBGMEQCIB6rZcyOjlKciqppkjQF21QtnFt8LdvxyzKrLPjK3lsaAiByMqKs
MLZzf4IzBIvPaHlegMjCp07zXFzj9bwH4QWd5wB3AEiw42vapkc0D+VqAvqdMOsc
UgHLVt0sgdm7v6s52IRzAAABhiey6sEAAAQDAEgwRgIhAPsSpaijKUNRPgMhKQXY
XbNLmN3mw0Am5tf5/YlrIln+AiEAmK9Qt1sfdvZIhsbwhWnOKEyBYIE8NgVy3+d7
BeJVIUswDQYJKoZIhvcNAQELBQADggEBAAgg8MjctUwhd8Ur54OVok7LoblsiD+q
FssP4O0Oy9vyhFrFdwoflw5mLAOU+8+Ht0xbcv4ugH4JrttrRcmP1YRFhdQWbC3h
opo66cooNmksvAg7PGW0yNalereqARGJuuq4TSZbLUsH/P4tyErYQP/VTgsTaWmR
gEsxQz2Mjgzcb6v2gBmDMfD1s9byBOnNOCRvl2X+/zbco88lfNP50Ah6z/zuKkqT
LWkwtvShjq5nZeC9hiqNanL6LpwAGzn53I1U4BF9qSLzqiVrgRljHfHbnbS6zgM5
uBvMC6epoLVzqW/eDzuQtT6bM4T0vwzu+0hlf4o/l64op9yP3LCUJ84=
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIEqjCCA5KgAwIBAgIQAnmsRYvBskWr+YBTzSybsTANBgkqhkiG9w0BAQsFADBh
MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3
d3cuZGlnaWNlcnQuY29tMSAwHgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBD
QTAeFw0xNzExMjcxMjQ2MTBaFw0yNzExMjcxMjQ2MTBaMG4xCzAJBgNVBAYTAlVT
MRUwEwYDVQQKEwxEaWdpQ2VydCBJbmMxGTAXBgNVBAsTEHd3dy5kaWdpY2VydC5j
b20xLTArBgNVBAMTJEVuY3J5cHRpb24gRXZlcnl3aGVyZSBEViBUTFMgQ0EgLSBH
MTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALPeP6wkab41dyQh6mKc
oHqt3jRIxW5MDvf9QyiOR7VfFwK656es0UFiIb74N9pRntzF1UgYzDGu3ppZVMdo
lbxhm6dWS9OK/lFehKNT0OYI9aqk6F+U7cA6jxSC+iDBPXwdF4rs3KRyp3aQn6pj
pp1yr7IB6Y4zv72Ee/PlZ/6rK6InC6WpK0nPVOYR7n9iDuPe1E4IxUMBH/T33+3h
yuH3dvfgiWUOUkjdpMbyxX+XNle5uEIiyBsi4IvbcTCh8ruifCIi5mDXkZrnMT8n
wfYCV6v6kDdXkbgGRLKsR4pucbJtbKqIkUGxuZI2t7pfewKRc5nWecvDBZf3+p1M
pA8CAwEAAaOCAU8wggFLMB0GA1UdDgQWBBRVdE+yck/1YLpQ0dfmUVyaAYca1zAf
BgNVHSMEGDAWgBQD3lA1VtFMu2bwo+IbG8OXsj3RVTAOBgNVHQ8BAf8EBAMCAYYw
HQYDVR0lBBYwFAYIKwYBBQUHAwEGCCsGAQUFBwMCMBIGA1UdEwEB/wQIMAYBAf8C
AQAwNAYIKwYBBQUHAQEEKDAmMCQGCCsGAQUFBzABhhhodHRwOi8vb2NzcC5kaWdp
Y2VydC5jb20wQgYDVR0fBDswOTA3oDWgM4YxaHR0cDovL2NybDMuZGlnaWNlcnQu
Y29tL0RpZ2lDZXJ0R2xvYmFsUm9vdENBLmNybDBMBgNVHSAERTBDMDcGCWCGSAGG
/WwBAjAqMCgGCCsGAQUFBwIBFhxodHRwczovL3d3dy5kaWdpY2VydC5jb20vQ1BT
MAgGBmeBDAECATANBgkqhkiG9w0BAQsFAAOCAQEAK3Gp6/aGq7aBZsxf/oQ+TD/B
SwW3AU4ETK+GQf2kFzYZkby5SFrHdPomunx2HBzViUchGoofGgg7gHW0W3MlQAXW
M0r5LUvStcr82QDWYNPaUy4taCQmyaJ+VB+6wxHstSigOlSNF2a6vg4rgexixeiV
4YSB03Yqp2t3TeZHM9ESfkus74nQyW7pRGezj+TC44xCagCQQOzzNmzEAP2SnCrJ
sNE2DpRVMnL8J6xBRdjmOsC3N6cQuKuRXbzByVBjCqAA8t1L0I+9wXJerLPyErjy
rMKWaBFLmfK/AHNF4ZihwPGOc7w6UHczBZXH5RFzJNnww+WnKuTPI0HfnVH8lg==
-----END CERTIFICATE-----
`

async function loadJson(path, defaultValue = null) {
    // console.log('path', path)
    const content = fs.readFileSync(path, 'utf-8')
    // console.log('content', content)
    if (content) {
        return JSON.parse(content)
    }
    return defaultValue
}

interface TcpServer {
    id: string
    _webSocketId: string
    _hex: boolean
    _server: net.Server
    clients: TcpServerClient[]
}

interface TcpServerClient {
    id: string
    socket: net.Socket
    connectTime: string
}

interface PowerTcpClient {
    // ID 就是创建时返回的 connectionId
    id: string
    config: object,
    _webSocketId: string
    _hex: boolean
    _socket: net.Socket
}
interface PowerTcpClientMap {
    [attr: string]: PowerTcpClient
}
interface PowerTcpServerMap {
    [attr: string]: TcpServer
}
interface UdpServer {
    id: string
    _socket: dgram.Socket
    _webSocketId: string
}

// TCP 客户端
let g_tcpClients: PowerTcpClient[] = [] // 界面创建的所有客户端
let g_tcpConnId2ClientMap: PowerTcpClientMap = {} // connectionId 2 client
// TCP 服务端
let g_tcpServers: TcpServer[] = []
let g_tcpConnId2ServerMap: PowerTcpServerMap = {} // connectionId 2 client
// WebSocket 服务端
let g_id2SocketMap = {}
let g_wsServerClients = []
let g_wsServers = []
// WebSocket 客户端（客户端暂时没有用服务器做代理
// UDP 服务端
let g_udpServers: UdpServer[] = []
// HTTP 服务端
let g_httpServer: net.Server
let g_httpsServer: https.Server
let g_http2Server: http2.Http2SecureServer

async function closeByConnectionId(connectionId) {
    const fItem = g_wsServerClients.find(item => item.connectionId = connectionId)
    if (fItem) {
        console.log('wss', fItem)
        fItem.socket.close()
        // TODO 性能
        g_wsServerClients = g_wsServerClients.filter(item => item.connectionId != connectionId)
    }
}


export function closeWebSocketServer(connectionId) {
    closeByConnectionId(connectionId)
}

export class SocketService {

    async _closeServerById(connectionId: string) {
        const server = g_tcpConnId2ServerMap[connectionId]
        if (!server) {
            console.log('找不到 server', connectionId)
            return {}
        }
        // 先关闭客户端
        for (let client of server.clients) {
            try {
                client.socket.end()
                // item.socket.destroy()
            }
            catch (err) {
                console.log('tcpCloseServer/err', err)
            }
        }
        server.clients = []
        // 再关闭服务端
        console.log('g_tcpServer.listening', server._server.listening)
        // console.log('g_tcpServer.connections', g_tcpServer.connections)
        server._server.getConnections((err, count) => {
            console.log('getConnections', count, err)
        })
        if (server._server.listening) {
            server._server.close(err => {
                if (err) {
                    console.log('g_tcpServer.close/err', err)    
                    return
                }
                console.log('g_tcpServer.closed')
            })
        }
        g_tcpServers = g_tcpServers.filter(item => item.id != connectionId)
        delete g_tcpConnId2ServerMap[connectionId]
        console.log('g_tcpServer.closed')
    }

    async createTcpClient(body) {
        console.log('tcpConnect', )
        const { host, port, isTls = false, webSocketId } = body

        const connectionId = uid(32)
        
        const _tcpConnect = () => {
            return new Promise((resolve, reject) => {
                const socket = new net.Socket()
                
                let isConnected = false
        
                socket.connect( port,host,function(){
                    console.log('tcp_client/socket.connect callback', port,host)
                })
                socket.setEncoding('utf-8')
                socket.on('data', function ( msg ) {
                    console.log('tcp_client/on/data', msg.toString() );
                    
                    const client = g_tcpConnId2ClientMap[connectionId]
                    
                    const time = moment().format('YYYY-MM-DD HH:mm:ss')
                    sendTcpMsg({
                        webSocketId,
                        // connectionId,
                        message: {
                            type: 'message',
                            data: {
                                id: uid(8),
                                time,
                                content: msg.toString(client._hex ? 'hex': 'utf-8'),
                                contentType: client._hex ? 'hex': 'text',
                                type: 'message',
                            }
                        }
                    })
                })
        
                socket.on('error', err => {
                    console.log('tcp_client/on/error', err)
                    if (!isConnected) {
                        reject(err)
                    }
                })
                
                socket.on('connect', () => {
                    console.log('tcp_client/on/connect');
                    isConnected = true
                    resolve(null)
                    
                    const time = moment().format('YYYY-MM-DD HH:mm:ss')
                    sendTcpMsg({
                        webSocketId,
                        message: {
                            type: 'connected',
                            data: {
                                id: uid(8),
                                time,
                                type: 'info',
                                host,
                                port,
                            }
                        }
                    })
                })

                socket.on('close', () => {
                    console.log('tcp_client/on/close');
                    if (!isConnected) {
                        return
                    }
                    const time = moment().format('YYYY-MM-DD HH:mm:ss')
                    sendTcpMsg({
                        webSocketId,
                        message: {
                            type: 'disconnected',
                            data: {
                                id: uid(8),
                                time,
                                type: 'info',
                                // host,
                                // port,
                            }
                        }
                    })
                    // sendTcpMsg({
                    //     webSocketId,
                    //     message: {
                    //         type: 'info',
                    //         data: {
                    //             id: uid(8),
                    //             time,
                    //             content: `系统信息：已断开连接`,
                    //             type: 'info',
                    //         }
                    //     }
                    // })
                })
        
                const client = {
                    id: connectionId,
                    config: {},
                    _webSocketId: webSocketId,
                    _hex: false,
                    _socket: socket,
                }
                g_tcpClients.push(client)
                g_tcpConnId2ClientMap[connectionId] = client
            })
        }

        const _tlsTcpConnect = () => {
            return new Promise((resolve, reject) => {
                
                let isConnected = false
        
                var options = {
                    host,
                    port,
                    key: Buffer.from(fixed_key),
                    cert: Buffer.from(fixed_crt),
                    // ca: [ fs.readFileSync('./local.yunser.com.crt') ],
                    rejectUnauthorized: true
                };
                const client = tls.connect(options, function() {
                    isConnected = true
                    console.log('client connected', client.authorized ? 'authorized' : 'unauthorized');
                    // process.stdin.setEncoding('utf8');
                    // process.stdin.on('readable', function() {
                    //         var chunk = process.stdin.read();
                    //         if (chunk !== null) {
                    //                 client.write(chunk);
                    //         }
                    // });
                    // client.write("happy new year!");
                    // console.log('client/write_ok', )
                    const time = moment().format('YYYY-MM-DD HH:mm:ss')
                    sendTcpMsg({
                        webSocketId,
                        message: {
                            type: 'connected',
                            data: {
                                id: uid(8),
                                time,
                                type: 'info',
                                host,
                                port,
                            }
                        }
                    })
                    resolve(null)
                })
                client.setEncoding('utf8');
                client.on('data', function(data) {
                    console.log(data);
                    const time = moment().format('YYYY-MM-DD HH:mm:ss')
                    sendTcpMsg({
                        webSocketId,
                        // connectionId,
                        message: {
                            type: 'message',
                            data: {
                                id: uid(8),
                                time,
                                content: data.toString(client['_hex'] ? 'hex': 'utf-8'),
                                contentType: client['_hex'] ? 'hex': 'text',
                                type: 'message',
                                isTls: true,
                            }
                        }
                    })
                });
                client.on('error', (err) => {
                        console.log('_tlsTcpConnect/error', err)
                })
                client.on('error', err => {
                    console.log('_tlsTcpConnect/on/error', err)
                    if (!isConnected) {
                        reject(err)
                    }
                })
                client.on('close', (err) => {
                    console.log('_tlsTcpConnect/close', err)
                    if (!isConnected) {
                        return
                    }
                    const time = moment().format('YYYY-MM-DD HH:mm:ss')
                    sendTcpMsg({
                        webSocketId,
                        message: {
                            type: 'disconnected',
                            data: {
                                id: uid(8),
                                time,
                                type: 'info',
                                // host,
                                // port,
                            }
                        }
                    })
                })
                
            
                
        
                const _client = {
                    id: connectionId,
                    config: {},
                    _webSocketId: webSocketId,
                    _hex: false,
                    _socket: client,
                }
                g_tcpClients.push(_client)
                g_tcpConnId2ClientMap[connectionId] = _client
            })
        }

        if (isTls) {
            await _tlsTcpConnect()
        }
        else {
            await _tcpConnect()
        }

        return {
            connectionId,
        }
    }

    async tcpConfig(body) {
        const { connectionId, hex = false } = body
        const client = g_tcpConnId2ClientMap[connectionId]
        client._hex = hex
        return {}
    }

    async tcpSend(body) {
        const { connectionId, contentType = 'text', content } = body
        const client = g_tcpConnId2ClientMap[connectionId]
        let _sendContent
        if (contentType == 'hex') {
            _sendContent = Buffer.from(content, 'hex')
        }
        else {
            _sendContent = content
        }
        const webSocketId = client._webSocketId
        const _send = () => {
            return new Promise((resolve, reject) => {
                client._socket.write(_sendContent, err => {
                    if (err) {
                        console.log('send/error', err)
                        reject(err)
                    }
                    console.log('send/success')
                    const time = moment().format('YYYY-MM-DD HH:mm:ss')
                    sendTcpMsg({
                        webSocketId,
                        message: {
                            type: 'sent',
                            data: {
                                id: uid(8),
                                time,
                                content,
                                contentType,
                                type: 'sent',
                            }
                        }
                    })
                    resolve(null)
                })
            })
        }
        await _send()
        return {}
    }

    async tcpClose(body) {
        const { connectionId } = body
        const client = g_tcpConnId2ClientMap[connectionId]
        client._socket && client._socket.destroy()
        client._socket = null
        g_tcpClients = g_tcpClients.filter(item => item.id != connectionId)
        delete g_tcpConnId2ClientMap[connectionId]
        return {}
    }

    async udpSend(body) {
        const { content, port, host, webSocketId } = body
        const g_udp_client = dgram.createSocket('udp4')
        g_udp_client.on('close', () => {
            console.log('g_udp_client/close')
        })
        g_udp_client.on('connect', () => {
            console.log('g_udp_client/connect')
        })
        g_udp_client.on('listening', () => {
            const address = g_udp_client.address();
            console.log('g_udp_client/listening', `${address.address}:${address.port} F: ${address.family}`)
        })
        g_udp_client.on('error', (err) => {
            console.log('g_udp_client/error', err);
        })
        g_udp_client.on('message', (msg, rinfo) => {
            // if (msg == 'exit') g_udp_client.close();
            // var strmsg = msg.toString();
            console.log(`g_udp_client/message/接收到来自：${rinfo.address}:${rinfo.port} 的消息： ${msg}`);
        })
        const _send = () => {
            return new Promise((resolve, reject) => {
                g_udp_client.send(content, port, host, (err) => {//向服务器发送消息
                    if (err) {
                        // client.close();
                        console.log('g_udp_client/error', err)
                        reject(err)
                        return
                    }
                    console.log('g_udp_client/send/ok', )
                    const time = moment().format('YYYY-MM-DD HH:mm:ss')
                    sendTcpMsg({
                        webSocketId,
                        message: {
                            type: 'sent',
                            data: {
                                id: uid(8),
                                time,
                                content,
                                // contentType,
                                type: 'sent',
                            }
                        }
                    })
                    g_udp_client.close()
                    resolve(null)
                })
            })
        }
        await _send()
        return {}
    }

    async udpCreateServer(body) {
        const { port, host, webSocketId } = body

        const connectionId = uid(32)

        const _createServer = () => {
            return new Promise((resolve, reject) => {
                let hasConnected = false
                const server = dgram.createSocket('udp4')
                g_udpServers.push({
                    id: connectionId,
                    _socket: server,
                    _webSocketId: webSocketId,
                })
                server.on('error', (err) => {
                    console.log(`udp_server/err：\n${err.stack}`)
                    if (!hasConnected) {
                        server.close()
                        reject(err)
                    }
                })
                server.on('message', (msg, rinfo) => {
                    const strmsg = msg.toString()
                    console.log(`udp_server/message ${rinfo.address}:${rinfo.port} 的消息`)
                    // console.log('strmsg', strmsg)
                    // server.send(strmsg, rinfo.port, rinfo.address)
                    const time = moment().format('YYYY-MM-DD HH:mm:ss')
                    sendTcpMsg({
                        webSocketId,
                        message: {
                            type: 'message',
                            data: {
                                type: 'message',
                                time,
                                id: uid(8),
                                host: rinfo.address,
                                port: rinfo.port,
                                content: strmsg,
                            }
                        }
                    })
                })
        
                server.on('listening', () => {
                    hasConnected = true
                    const address = server.address()
                    console.log(`udp_server/listening ${address.address}:${address.port} F:${address.family}`)
                    const time = moment().format('YYYY-MM-DD HH:mm:ss')
                    sendTcpMsg({
                        webSocketId,
                        message: {
                            type: 'listening',
                            data: {
                                type: 'info',
                                time,
                                id: uid(8),
                                host,
                                port,
                            }
                        }
                    })
                    resolve(null)
                })
                server.on('connect', () => {
                    console.log('udp_server/connect', )
                })
                server.on('close', () => {
                    console.log('udp_server/close', )
                    const time = moment().format('YYYY-MM-DD HH:mm:ss')
                    sendTcpMsg({
                        webSocketId,
                        message: {
                            type: 'close',
                            data: {
                                type: 'close',
                                time,
                                id: uid(8),
                                // host,
                                // port,
                            }
                        }
                    })
                })
        
                server.bind(port, host)
            })
        }
        await _createServer()

        return {
            connectionId,
        }
    }

    async tcpCreateServer(body) {
        const { port, host, webSocketId, isTls = false, hex = false } = body
        const connectionId = uid(32)

        const _createServer: () => Promise<void> = () => {
            return new Promise((resolve, reject) => {
                let options: any = {}
                if (isTls) {
                    options = {
                        ...options,
                        key: Buffer.from(fixed_key),
                        cert: Buffer.from(fixed_crt),
                        // // This is necessary only if the client uses the self-signed certificate.
                        //     ca: [ fs.readFileSync('./local.yunser.com.crt') ],
                        // // This is necessary only if using the client certificate authentication.
                        // requestCert: true,
                        // rejectUnauthorized: true
                        requestCert: false,
                        rejectUnauthorized: false
                    }
                }
                const server = isTls ? tls.createServer(options) : net.createServer()
                let isSuccess = false
                const _server = {
                    id: connectionId,
                    _webSocketId: webSocketId,
                    _hex: hex,
                    clients: [],
                    _server: server
                }
                g_tcpServers.push(_server)
                g_tcpConnId2ServerMap[connectionId] = _server
        
                const connectionHandler = (client: net.Socket, isTls = false) => {
                    const clientId = uid(8)
                    // client.setEncoding = 'UTF-8';
                    console.log(`tcp_server/connection/客户端${clientId}链接了`)
                    // client.name = ++clientName; // 给每一个client起个名
                    // clients[client.name] = client; // 将client保存在clients
        
                    client.on('data', function (msg) { //接收client发来的信息
                        console.log(`tcp_server/客户端${clientId}发来一个信息：${msg}`);
                        // console.log(`=${msg}=`, typeof msg)
                        const server = g_tcpConnId2ServerMap[connectionId]
                        const _msg = msg.toString(server._hex ? 'hex': 'utf-8').replace(/^\s+/, '').replace(/\s+$/, '')
                        // msg.toString()
                        // console.log(`2=${_msg}=`, typeof _msg)
                        const time = moment().format('YYYY-MM-DD HH:mm:ss')
                        sendTcpMsg({
                            webSocketId,
                            message: {
                                type: 'client_message',
                                data: {
                                    id: uid(8),
                                    time,
                                    // content: `系统信息：客户端${clientId}发来一个信息：${msg}`,
                                    content: msg.toString(server._hex ? 'hex': 'utf-8'),
                                    contentType: server._hex ? 'hex': 'text',
                                    clientId,
                                    type: 'message',
                                }
                            }
                        })

                        if (_msg == 'ping') {
                            console.log(`tcp_server/pong to ${clientId}`)
                            const content = 'pong'
                            client.write(content, err => {
                                if (err) {
                                    console.log('send_err', err)
                                    // code: 'EPIPE'
                                    // ERR_STREAM_DESTROYED
                                }
                                else {
                                    console.log('send_ok')
                                    // socket.destroy()
                                }
                            })
                            const time = moment().format('YYYY-MM-DD HH:mm:ss')
                            sendTcpMsg({
                                webSocketId: server._webSocketId,
                                message: {
                                    type: 'client_send',
                                    data: {
                                        id: uid(8),
                                        time,
                                        // content: `系统信息：客户端${clientId}发来一个信息：${msg}`,
                                        content,
                                        // contentType,
                                        clientId,
                                        type: 'message',
                                    }
                                }
                            })
                        }
                        // if (_msg == 'exit') {
                        //     client.destroy()
                        // }
                        
                    });
        
                    client.on('error', function (e) { //监听客户端异常
                        console.log('tcp_server/client error' + e);
                        client.end();
                    });
        
                    client.on( 'close', function () {
                        // delete clients[client.name];
                        console.log(`tcp_server/客户端${clientId}下线了`);
                        const server = g_tcpConnId2ServerMap[connectionId]
                        server.clients = server.clients.filter(item => item.id != clientId)
                        const time = moment().format('YYYY-MM-DD HH:mm:ss')
                        sendTcpMsg({
                            webSocketId,
                            message: {
                                id: uid(8),
                                time,
                                type: 'client_disconnected',
                                data: {
                                    type: 'info',
                                    clientId,
                                }
                            }
                        })
                    })
        
                    //设置最大连接数量
                    // server.maxConnections = 3;
                    // server.getConnections(function (err, count) {
                    //     console.log("tcp_server/当前连接的客户端个数为：" + count);
                    // })

                    // client.write('hi')

                    const address = client.address()
                    // console.log('address', address)
                    // console.log('client.remoteAddress', client.remoteAddress)
        
                    const time = moment().format('YYYY-MM-DD HH:mm:ss')
                    const server = g_tcpConnId2ServerMap[connectionId]
                    server.clients.unshift({
                        id: clientId,
                        socket: client,
                        connectTime: time,
                    })
        
                    sendTcpMsg({
                        webSocketId,
                        message: {
                            id: uid(8),
                            time,
                            type: 'client_connected',
                            data: {
                                type: 'info',
                                clientId,
                                address,
                            },
                        }
                    })
                }
                if (isTls) {
                    server.on('secureConnection', client => connectionHandler(client, true))
                }
                else {
                    server.on('connection', client => connectionHandler(client, false))
                }
        
                //设置监听时的回调函数
                server.on('listening', () => {
                    isSuccess = true
                    resolve(null)
                    console.log('tcp_server/listening', )
                    let address = server.address();
                    console.log('address', address)
                    //获取地址详细信息
                    // console.log("服务器监听的端口是：" + address.port);
                    // console.log("服务器监听的地址是：" + address.address);
                    // console.log("服务器监听的地址类型是：" + address.family);
                    const time = moment().format('YYYY-MM-DD HH:mm:ss')
                    sendTcpMsg({
                        webSocketId,
                        message: {
                            type: 'listening',
                            data: {
                                type: 'info',
                                time,
                                id: uid(8),
                                host,
                                port,
                            }
                        }
                    })
                })
        
                
                server.on('close', () => {
                    console.log('tcp_server/close', )
                    if (isSuccess) {
                        const time = moment().format('YYYY-MM-DD HH:mm:ss')
                        sendTcpMsg({
                            webSocketId,
                            message: {
                                type: 'close',
                                data: {
                                    type: 'info',
                                    time,
                                    id: uid(8),
                                }
                            }
                        })
                    }
                })
                server.on('error', (err) => {
                    console.log('tcp_server/error', err)
                    // err.to
                    if (!isSuccess) {
                        server.close()
                        reject(err)
                    }
                })
                server.listen(port, host, function () {
                    console.log(`tcp_server/服务运行在：http://${host}:${port}`);
                })
            })
        }

        await _createServer()

        return {
            connectionId,
        }
    }

    async tcpCloseServer(body) {
        const { connectionId } = body
        await this._closeServerById(connectionId)
        return {}
    }

    async closeAllTcpServer(body) {
        for (let server of g_tcpServers) {
            await this._closeServerById(server.id)
        }
        g_wsServers = []
        return {}
    }

    async closeUdpServer(body) {
        const { connectionId } = body
        g_udpServers = g_udpServers.filter(item => {
            if (item.id == connectionId) {
                item._socket.close()
            }
            return item.id != connectionId
        })
        return {}
    }

    async udpServerSend(body) {
        const { connectionId, content, port, host, } = body
        const server = g_udpServers.find(item => item.id == connectionId)
        console.log('server', server, g_udpServers)
        const _send = () => {
            return new Promise((resolve, reject) => {
                server._socket.send(content, port, host, (err) => {
                    if (err) {
                        // client.close();
                        console.log('udpServerSend/error', err)
                        reject(err)
                        return
                    }
                    console.log('udpServerSend/send/ok', )
                    const time = moment().format('YYYY-MM-DD HH:mm:ss')
                    sendTcpMsg({
                        webSocketId: server._webSocketId,
                        message: {
                            type: 'sent',
                            data: {
                                id: uid(8),
                                time,
                                content,
                                // contentType,
                                type: 'sent',
                                port,
                                host,
                            }
                        }
                    })
                    resolve(null)
                })
            })
        }
        await _send()
        return {}
    }

    async closeAllUdpServer(body) {
        for (let server of g_udpServers) {
            server._socket.close()
        }
        g_udpServers = []
        return {}
    }

    async closeAllTcpClient(body) {
        for (let client of g_tcpClients) {
            try {
                client._socket && client._socket.destroy()
            }
            catch (err) {
                console.log('closeAllClient/error', err)
            }
        }
        g_tcpClients = []
    }

    async serverSend(body) {
        const { connectionId, clientId, contentType = 'text', content } = body
        const server = g_tcpConnId2ServerMap[connectionId]
        let _sendContent: string | Buffer
        if (contentType == 'hex') {
            _sendContent = Buffer.from(content, 'hex')
        }
        else {
            _sendContent = content
        }
        for (let client of server.clients) {
            if (!clientId || client.id == clientId) {
                client.socket.write(_sendContent, err => {
                    if (err) {
                        console.log('serverSend/err', err)
                        return
                    }
                    console.log('serverSend/ok')
                    const time = moment().format('YYYY-MM-DD HH:mm:ss')
                    sendTcpMsg({
                        webSocketId: server._webSocketId,
                        message: {
                            type: 'client_send',
                            data: {
                                id: uid(8),
                                time,
                                // content: `系统信息：客户端${clientId}发来一个信息：${msg}`,
                                content,
                                contentType,
                                clientId: client.id,
                                type: 'message',
                            }
                        }
                    })
                })
            }
        }
    }

    async serverConfig(body) {
        const { connectionId, hex = false } = body
        const server = g_tcpConnId2ServerMap[connectionId]

        server._hex = hex
        return {}
    }

    async tcpClients(body) {
        const { connectionId } = body
        const server = g_tcpConnId2ServerMap[connectionId]
        // TODO 前端可能没处理好，hack
        if (!server) {
            return {
                list: [],
            }
        }
        return {
            list: server.clients,
        }
    }

    async tcpCloseClient(body) {
        const { connectionId, id } = body
        const server = g_tcpConnId2ServerMap[connectionId]
        server.clients = server.clients.filter(item => {
            if (!id || item.id == id) {
                try {
                    item.socket.end()
                    // item.socket.destroy()
                }
                catch (err) {
                    console.log('tcpCloseClient/err', err)
                }
            }
            return item.id != id
        })
    }

    async createWebSocketServer(body) {
        const { port = 80 } = body
        const connectionId = uid(32)
        const wss = new WebSocket.Server({
            port,
        })
        wss.on('connection', function (ws) {
            const clientId = uid(16)
            console.log('websocketServer/connection', clientId)
            // createSocket(ws);
            g_id2SocketMap[clientId] = ws
            g_wsServers.push({
                id: clientId,
                connectTime: moment().format('YYYY-MM-DD HH:mm:ss'),
                // socket: ws,
            })
            ws.on('message', async (data) => {
                const msgContent = data.toString()
                console.log('websocketServer/message', msgContent)
                sendWebSocketMsg({
                    connectionId,
                    message: {
                        type: 'reveiveMessage',
                        data: {
                            id: uid(8),
                            time: moment().format('YYYY-MM-DD HH:mm:ss'),
                            clientId,
                            message: msgContent,
                        }
                    }
                })
            })
            ws.on("close", () => {
                console.log('websocketServer/close', clientId)
                g_wsServers = g_wsServers.filter(item => item.id != clientId)
                delete g_id2SocketMap[clientId]
                sendWebSocketMsg({
                    connectionId,
                    message: {
                        type: 'clientClose',
                        data: {
                            id: uid(8),
                            time: moment().format('YYYY-MM-DD HH:mm:ss'),
                            clientId,
                        },
                    }
                })
            })

            console.log('sendWebSocketMsg/connectionId', connectionId)
            sendWebSocketMsg({
                connectionId,
                message: {
                    type: 'clientConnect',
                    data: {
                        id: uid(8),
                        time: moment().format('YYYY-MM-DD HH:mm:ss'),
                        clientId,
                    },
                }
            })
        })
        wss.on('listening', () => {
            console.log('wss/listening', )
        })
        wss.on('close', () => {
            console.log('wss/close', )
        })
        wss.on('error', (err) => {
            console.log('wss/error', )
        })
        
        
        
        g_wsServerClients.push({
            connectionId,
            socket: wss,
        })
        return {
            connectionId,
        }
    }

    async closeWebSocketServer(body) {
        const { connectionId } = body
        await closeByConnectionId(connectionId)
        return {}
    }

    async clients(body) {
        return {
            list: g_wsServers,
        }
    }

    async sendToClient(body) {
        const { clinetId, content } = body
        if (clinetId) {
            for (let client of g_wsServers) {
                if (client.id == clinetId) {
                    const ws = g_id2SocketMap[client.id]
                    if (ws) {
                        ws.send(content)
                    }
                }
            }
        }
        else {
            for (let client of g_wsServers) {
                const ws = g_id2SocketMap[client.id]
                if (ws) {
                    ws.send(content)
                }
            }
        }
        return {}
    }

    async closeClient(body) {
        const { id } = body
        if (id) {
            const ws = g_id2SocketMap[id]
            if (ws) {
                ws.close()
            }
            g_wsServers = g_wsServers.filter(item => item.id != id)
        }
        else {
            for (let client of g_wsServers) {
                const ws = g_id2SocketMap[client.id]
                if (ws) {
                    ws.close()
                }
            }
            g_wsServers = []
        }
        return {}
    }

    async httpCreateServer(body) {
        const { host = '0.0.0.0', port = 80, webSocketId } = body

        if (g_httpServer) {
            g_httpServer.close()
        }

        // const _createServer = () => {
        //     return new Promise((resolve, reject) => {
        //     })
        // }

        // await _createServer()

        const server = net.createServer((socket) => {
            let _isEnd = false
            socket.on('data', (data) => {
                const reqData = data.toString()
                console.log('/data', reqData)
                if (reqData.includes('/whoami')) {
                    const content = reqData
                    socket.write(`HTTP/1.1 200 OK\r\ncontent-length: ${content.length}\r\n\r\n`)
                    socket.write(content)
                    socket.end()
                }
                else if (reqData.includes('/sse')) {
                    // const content = reqData
                    const headers = [
                        'HTTP/1.1 200 OK',
                        'Content-Type: text/event-stream',
                        'Cache-Control: no-cache',
                        'Connection: keep-alive',
                        'Access-Control-Allow-Origin: *'
                    ].join('\r\n')
                    const content = [
                        'retry: 5',
                        '',
                        ':ping',
                        '',
                        'event: ping',
                        'data: ppp',
                        '',
                        'id: 001',
                        '',
                        'data: hello world',
                        '',
                        'id: 002',
                        '',
                        'data: hello world2',
                        '',
                        '',
                    ].join('\n')
                    console.log('content', content)
                    socket.write(`HTTP/1.1 200 OK\r\n${headers}\r\n\r\n`)
                    socket.write(content)
                    socket.end()
                }
                else {
                    
                    const resContent = 'hello http'
                    const { headers: reqHeaders } = parseRequestHeader(reqData)

                    const resHeaders = {
                        // 'content-length': resContent.length,
                    }
                    let buffer: Buffer
                    console.log('reqHeaders', reqHeaders)
                    let acceptEncodings = []
                    if (reqHeaders['accept-encoding']) {
                        acceptEncodings = reqHeaders['accept-encoding'].split(',').map(item => item.trim())
                    }
                    console.log('acceptEncodings', acceptEncodings)
                    if (acceptEncodings.includes('gzip')) {
                        resHeaders['Content-Encoding'] = 'gzip'
                        const originBuffer = Buffer.from(resContent)
                        buffer = zlib.gzipSync(originBuffer)
                    }
                    else if (acceptEncodings.includes('deflate')) {
                        resHeaders['Content-Encoding'] = 'deflate'
                        const originBuffer = Buffer.from(resContent)
                        buffer = zlib.deflateSync(originBuffer)
                    }
                    else if (acceptEncodings.includes('br')) {
                        resHeaders['Content-Encoding'] = 'br'
                        const originBuffer = Buffer.from(resContent)
                        buffer = zlib.brotliCompressSync(originBuffer)
                    }
                    else {
                        buffer = Buffer.from(resContent)
                    }
                    resHeaders['Content-Length'] = buffer.length
                    const headersCode = Object.keys(resHeaders).map(key => `${key}: ${resHeaders[key]}`).join('\r\n')
                    socket.write(`HTTP/1.1 200 OK\r\n${headersCode}\r\n\r\n`)

                    socket.write(buffer)
                    socket.end()
                }
                // if (reqData.startsWith('GET')) {
                //     // 如果是 GET 请求，则返回响应
                // }
                // else {
                //     const content = 'Only support GET'
                //     socket.write(`HTTP/1.1 400 Bad Request\r\ncontent-length: ${content.length}\r\n\r\n`)
                //     socket.write(content)
                //     socket.end()
                // }
                const time = moment().format('YYYY-MM-DD HH:mm:ss')
                sendTcpMsg({
                    webSocketId,
                    message: {
                        type: 'request',
                        data: {
                            id: uid(8),
                            time,
                            content: `${socket.remoteAddress}:${socket.remotePort} 请求`,
                            // contentType,
                            type: 'request',
                            port: socket.remotePort,
                            host: socket.remoteAddress,
                        }
                    }
                })
            })
            socket.on('close', () => {
                
            })
        })
        server.on('connection', (_socket) => {
            console.log('http_server/connection')
            const addr = _socket.address()
            console.log('addr', addr)
        })
        .on('close', () => {
            console.log('http_server/close')
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
                        // port,
                        // host,
                    }
                }
            })
        })
        .on('listening', () => {
            console.log('http_server/listening')
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
                        port,
                        host,
                    }
                }
            })
        })
        .on('error', (err) => {
            console.log('http_server/error', err)
        })
        .listen(port, host, () => {
            
        })

        // const server = http.createServer((req, res) => {
        //     console.log('======== http_server/start', )
            
        //     // console.log('ip', req.ip)
        //     // console.log('req', req)
        //     console.log('localAddress', req.socket.localAddress)
        //     console.log('remoteAddress', req.socket.localPort)
        //     console.log('socket', req.socket.address())
        //     // console.log('socket', req.socket.address().family)
        //     console.log('headers', req.headers)
        //     // headers { host: '[::1]:6698', 'user-agent': 'curl/7.64.1', accept: '*/*' }
        //     // headers { host: '127.0.0.1:6698', 'user-agent': 'curl/7.64.1', accept: '*/*' }
        //     // headers { host: 'localhost:6698', 'user-agent': 'curl/7.64.1', accept: '*/*' }
        //     let removeAddr = req.headers['x-real-ip'] || req.socket.remoteAddress
        //     // if (removeAddr)
        //     // const text = `your IP: ${removeAddr}`
        //     const text = `hello http`
        //     // res.setHeader('content-lenth', text.length)
        //     // res.setHeader('x-power-by', 'DMS')
        //     res.writeHead(200, {
        //         'content-type': 'text/plain',
        //         'content-lenth': text.length,
        //         'x-power-by': 'DMS'
        //     })
        //     res.end(text)
        //     console.log('======== http_server/end', )
        //     // res.end('hello nodejs\n' + process.pid)
        //     const time = moment().format('YYYY-MM-DD HH:mm:ss')
        //     sendTcpMsg({
        //         webSocketId,
        //         message: {
        //             type: 'request',
        //             data: {
        //                 id: uid(8),
        //                 time,
        //                 content: `${req.socket.remoteAddress}:${req.socket.remotePort} 请求`,
        //                 // contentType,
        //                 type: 'request',
        //                 port: req.socket.remotePort,
        //                 host: req.socket.remoteAddress,
        //             }
        //         }
        //     })
            
        // })
        
        // .listen('[::]:80')
        // .listen('6788')
        // .listen('[::]:6699')
        // console.log('ok', )
        // console.log('process.pid', process.pid)
        g_httpServer = server

        return {}

    }

    async httpsCreateServer(body) {
        const { host = '0.0.0.0', port = 80, webSocketId } = body

        const options = {
            //   key: fs.readFileSync('./server.key'),
            //   cert: fs.readFileSync('./server.crt')
            key: Buffer.from(fixed_key),
            cert: Buffer.from(fixed_crt),
        };

        const _server = https.createServer(options, (req, res) => {
            console.log('======== client request',)

            const resContent = 'hello https'
            res.writeHead(200, {
                'content-length': resContent.length,  
            })
            res.end(resContent)

            const time = moment().format('YYYY-MM-DD HH:mm:ss')
            sendTcpMsg({
                webSocketId,
                message: {
                    type: 'request',
                    data: {
                        id: uid(8),
                        time,
                        content: `${req.socket.remoteAddress}:${req.socket.remotePort} 请求`,
                        // contentType,
                        type: 'request',
                        port: req.socket.remotePort,
                        host: req.socket.remoteAddress,
                    }
                }
            })
        })
        .on('connect', () => {
            console.log('https_server/connect', )
        })
        .on('connection', () => {
            console.log('https_server/connection', )
        })
        .on('listening', () => {
            console.log('http_server/listening')
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
                        port,
                        host,
                    }
                }
            })
        })
        .on('close', () => {
            console.log('http_server/close')
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
                        // port,
                        // host,
                    }
                }
            })
        })
        .listen(port, host, () => {
            console.log(`App listening on port ${port}!`)
            console.log(`https://local.yunser.com:${port}/`,)
        })

        g_httpsServer = _server

        return {}
    }

    async http2CreateServer(body) {
        const { host = '0.0.0.0', port = 80, webSocketId } = body
        
        const server = http2.createSecureServer({
            key: Buffer.from(fixed_key),
            cert: Buffer.from(fixed_crt),
        })
        g_http2Server = server
        server.on('error', (err) => {
            console.log('on/error',)
            console.error(err)
        })
        server.on('session', () => {
            console.log('on/session',)
        })
        
        .on('request', () => {
            console.log('on/request',)
        })
        
        .on('stream', (stream, headers) => {
            console.log('on/stream',)
            // console.log('headers', headers)
            // const path = headers[':path'];
        
            
            stream.on('close', () => {
                console.log('The stream is closed');
            })
            stream.respond({
                'content-type': 'text/html; charset=utf-8',
                ':status': 200
            });
        
            //   stream.pushStream({ [HTTP2_HEADER_PATH]: '/style.css' }, (err, pushStream, headers) => {
            //     if (err) throw err;
            //     const fd = fs.openSync('style.css', 'r');
            //     const stat = fs.fstatSync(fd);
            //     const header = {
            //       'content-length': stat.size,
            //       'last-modified': stat.mtime.toUTCString(),
            //       'content-type': 'text/css'
            //     };
            //     pushStream.respondWithFD(fd, header)
            //   });
        
            stream.end(`hello http2`);
            // if (path === '/') {
            // } else if (path === '/style.css') {
        
            //     //   const fd = fs.openSync('style.css', 'r');
            //     //   const stat = fs.fstatSync(fd);
            //     //   const headers = {
            //     //     'content-length': stat.size,
            //     //     'last-modified': stat.mtime.toUTCString(),
            //     //     'content-type': 'text/css'
            //     //   };
            //     //   stream.respondWithFD(fd, headers);
        
            //     stream.end(`
            //     <h1>Hello World</h1>
            //     <script>
            //       setTimeout(()=>{
            //         fetch('/style.css')
            //       },2000)
            //     </script>
            //   `);
            // }
        
        
        })
        .on('listening', () => {
            console.log('http_server/listening')
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
                        port,
                        host,
                    }
                }
            })
        })
        .on('close', () => {
            console.log('http_server/close')
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
                        // port,
                        // host,
                    }
                }
            })
        })
        server.listen(port, host, () => {

        })
        return {}
    }

    async closeHttpServer(body) {
        if (g_httpServer) {
            g_httpServer.close()
        }
    }

    async closeAllServer(body) {
        if (g_httpServer) {
            g_httpServer.close()
        }
        if (g_httpsServer) {
            g_httpsServer.close()
            g_httpsServer = null
        }
        if (g_http2Server) {
            g_http2Server.close()
            g_http2Server = null
        }
    }

    async closeHttpsServer(body) {
        if (g_httpsServer) {
            g_httpsServer.close()
        }
    }

    async closeHttp2Server(body) {
        if (g_http2Server) {
            g_http2Server.close()
            g_http2Server = null
        }
    }

    async websocketConnectionList(body) {
        const list = await loadDbJson('websocket.connection.json', [])
        return {
            list,
        }
    }
    
    async websocketHistoryList(body) {
        const list = await loadDbJson('websocket.history.json', [])
        return {
            list,
        }
    }
}
