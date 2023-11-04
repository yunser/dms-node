import { Command, default as Redis } from "ioredis"
import { uid } from "uid";
import * as fs from 'fs'
import * as path from 'path'
import * as mqtt from 'mqtt'
import { MqttClient } from 'mqtt'
import * as moment from 'moment'
import { sendMqttMsg, sendRedisMsg } from "./ssh.service";

const clients = {}

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

let redisConnectionFilePath = path.resolve(appFolder, 'mqtt.connection.json')
if (!fs.existsSync(redisConnectionFilePath)) {
    fs.writeFileSync(redisConnectionFilePath, '[]', 'utf8')
}

function mqttConnect(url, params): Promise<void> {
    console.log('mqttConnect', url, params)
    return new Promise((resolve, reject) => {
        const client  = mqtt.connect(url, {
            ...params,
            reconnectPeriod: 0,
            connectTimeout: 10 * 1000,
        })
        client.on('connect', function () {
            console.log('mqttConnect/onConnect')
            resolve()
        })
          
        // client.on('message', function (topic, message) {
        //     // message is Buffer
        //     console.log('mqtt/on-message', topic, message.toString())
        //     sendMqttMsg({ topic, message: message.toString() })
        //   //   client.end()
        // })
        
        client.on('error', function (err) {
            // message is Buffer
            console.log('mqttConnect/on-error', err)
          //   client.end()
            reject(err)
        })
        client.on('close', function (err) {
            console.log('mqttConnect/on-close', err)
            // 实测服务器连接不上会执行到这里，但不会触发 error 事件
            reject(err)
        })
        client.on('disconnect', function (err) {
            console.log('mqttConnect/on-disconnect')
        })
    })
}

export class MqttService {

    async index() {
        return 'mqtt home'
    }

    async _getClient(body): Promise<MqttClient> {
        const { connectionId } = body
        return clients[connectionId].client
    }

    async publish(body) {
        const { topic, message } = body
        const client = await this._getClient(body)
        client.publish(topic, message, {
            qos: 1,
        }, (error, packet) => {
            if (error) {
                console.error('error', error)
                return
            }
            console.log('publish/ok', )
        })
        return {}
    }

    async subscribe(body) {
        const { topic, message } = body
        const client = await this._getClient(body)
        client.subscribe(topic, function (err) {
            if (err) {
                console.log('mqtt/subscribe/error', err)
                return
            }
            console.log('subscribe ok')
        })
        return {}
    }

    async unsubscribe(body) {
        const { topic, message } = body
        const client = await this._getClient(body)
        client.unsubscribe(topic, function (err) {
            if (err) {
                console.log('mqtt/unsubscribe/error', err)
                return
            }
            console.log('unsubscribe ok')
        })
        return {}
    }

    async connect(config) {
        const connectionId = uid(32)
        const {
            host,
            port,
            password,
            test = false,
            userName,
            clientId = 'client-DMS',
        } = config

        const url = `mqtt://${host}:${port}`
        const params = {
            clientId,
            username: userName,
            password,
        }
        if (test) {
            return await mqttConnect(url, params)
        }
        // const params = {
        //     host,
        //     port,
        //     lazyConnect: true,
        //     connectTimeout: 1000,
        //     username: undefined,
        //     password: undefined
        //     // This is the default value of `retryStrategy`
        //     // retryStrategy(times) {
        //     //     const delay = Math.min(times * 50, 2000);
        //     //     return delay;
        //     // },
        // }
        // if (password) {
        //     params.password = password
        // }
        // if (userName) {
        //     params.username = userName 
        // }
        // console.log('params', params)
        console.log('mqtt/connect')
        const client = mqtt.connect(url, {
            ...params,
            reconnectPeriod: 0,
            connectTimeout: 10 * 1000,
        })
        client.on('connect', function () {
            console.log('mqtt/onConnect')
        })
          
        client.on('message', function (topic, message) {
            // message is Buffer
            console.log('mqtt/on-message', topic, message.toString())
            sendMqttMsg({ topic, message: message.toString() })
          //   client.end()
        })
        client.on('error', function (err) {
            // message is Buffer
            console.log('mqtt/on-error', err)
          //   client.end()
        })


        // if (test) {
        //     // console.log('before connect')
        //     try {
        //         await g_redis.connect()
        //     }
        //     catch (err) {
        //         console.log('err', err)
        //     }
        //     // console.log('after connect')
        //     return {
        //         ping: await g_redis.ping(),
        //     }
        // }
        
        clients[connectionId] = {
            client,
            // params,
        }
        // try {
        //     await g_redis.connect()
        // }
        // catch (err) {
        //     console.log('err', err)
        // }
        // await g_redis.ping()
        // await g_redis.connect()
        // .catch(err2 => {
        //     console.log('err2', err2.message, err2)
        // })
        // try {
        // }
        // catch (err) {
        //     console.log('err', err.message, err)
        // }
        return {
            connectionId,
        }
    }

    async connectionList(body) {
        const content = fs.readFileSync(redisConnectionFilePath, 'utf-8')
        return {
            list: JSON.parse(content)
        }
    }

    async connectionEdit(body) {
        const { id, data } = body
        
        const content = fs.readFileSync(redisConnectionFilePath, 'utf-8')
        const list = JSON.parse(content)
        const idx = list.findIndex(_item => _item.id == id)
        list[idx] = {
            ...list[idx],
            ...data,
        }
        console.log('list', list)
        fs.writeFileSync(redisConnectionFilePath, JSON.stringify(list, null, 4), 'utf-8')
        return {}
    }

    async connectionCreate(body) {
        // const { id, data } = body
        
        const content = fs.readFileSync(redisConnectionFilePath, 'utf-8')
        const list = JSON.parse(content)
        list.unshift({
            ...body,
            id: uid(32),
        })
        fs.writeFileSync(redisConnectionFilePath, JSON.stringify(list, null, 4), 'utf-8')
        return {}
    }

    async connectionDelete(body) {
        const { id } = body
        const content = fs.readFileSync(redisConnectionFilePath, 'utf-8')
        const list = JSON.parse(content)
        const newList = list.filter(item => item.id != id)
        console.log('id', id)
        console.log('newList', newList)
        fs.writeFileSync(redisConnectionFilePath, JSON.stringify(newList, null, 4), 'utf-8')
        return {}
    }
}
