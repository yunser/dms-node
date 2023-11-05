import { Command, default as Redis } from "ioredis"
import { uid } from "uid";
import * as fs from 'fs'
import * as path from 'path'
import * as mqtt from 'mqtt'
import * as moment from 'moment'
import * as Influx from 'influx'
import { InfluxDB } from 'influx'

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

let redisConnectionFilePath = path.resolve(appFolder, 'influxdb.connection.json')
if (!fs.existsSync(redisConnectionFilePath)) {
    fs.writeFileSync(redisConnectionFilePath, '[]', 'utf8')
}

export class InfluxdbService {

    async index() {
        return 'mqtt home'
    }

    async _getClient(body): Promise<InfluxDB> {
        const { connectionId } = body
        return clients[connectionId].client
    }

    async databases(body) {
        console.log('tree/start', )
        // const { path = '/', message } = body
        const client = await this._getClient(body)

        const names = await client.getDatabaseNames()
        
        return {
            list: names.map(name => {
                return {
                    name,
                }
            }),
        }
    }

    async measurements(body) {
        console.log('tree/start', )
        const { database } = body
        const client = await this._getClient(body)

        const names = await client.getMeasurements(database)
        
        return {
            list: names.map(name => {
                return {
                    name,
                }
            }),
        }
    }

    async query(body) {
        console.log('tree/start', )
        const { sql, database } = body
        const client = await this._getClient(body)

        let result = {}
        const ret = await client.queryRaw(sql, {
            database,
        })
        console.log('ret', ret)
        if (ret.results?.[0]?.series?.[0]) {
            result = ret.results[0].series[0]
        }
        return result
    }

    async connect(config) {
        const connectionId = uid(32)
        const {
            host,
            port = 8086,
            username,
            password,
            test = false,
            // userName,
            clientId = 'client-DMS',
        } = config

        const url = `mqtt://${host}:${port}`
        const params = {
            host,
            port: 8086,
            username,
            password,
        }
        // if (test) {
        //     return await mqttConnect(url, params)
        // }

        const connectionString = `${host}:${port}`
        console.log('zookeeper/createClient', connectionString)
        const client = new InfluxDB(params)
        // client.on('connected', function () {
        //     console.log('zookeeper/onConnect')
        // })
        // client.on('authenticationFailed', function () {
        //     console.log('zookeeper/authenticationFailed')
        // })
        // client.on('disconnected', function () {
        //     console.log('zookeeper/disconnected')
        // })
        // client.on('connectedReadOnly', function () {
        //     console.log('zookeeper/connectedReadOnly')
        // })
          
        // client.on('message', function (topic, message) {
        //     // message is Buffer
        //     console.log('mqtt/on-message', topic, message.toString())
        //     sendMqttMsg({ topic, message: message.toString() })
        //   //   client.end()
        // })
        // client.on('error', function (err) {
        //     // message is Buffer
        //     console.log('mqtt/on-error', err)
        //   //   client.end()
        // })


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
