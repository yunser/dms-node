import { Command, default as Redis } from "ioredis"
import { uid } from "uid";
import * as fs from 'fs'
import * as path from 'path'
import * as mqtt from 'mqtt'
import { MqttClient } from 'mqtt'
import * as moment from 'moment'
import * as zookeeper from 'node-zookeeper-client'
import { Client } from 'node-zookeeper-client'

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

let redisConnectionFilePath = path.resolve(appFolder, 'zookeeper.connection.json')
if (!fs.existsSync(redisConnectionFilePath)) {
    fs.writeFileSync(redisConnectionFilePath, '[]', 'utf8')
}

export class ZookeeperService {

    async index() {
        return 'mqtt home'
    }

    async _getClient(body): Promise<Client> {
        const { connectionId } = body
        return clients[connectionId].client
    }

    async tree(body) {
        console.log('tree/start', )
        const { path = '/', message } = body
        const client = await this._getClient(body)

        function _tree() {
            return new Promise((resolve, reject) => {
                console.log('tree/getChildren', )
                client.getChildren(path, event => {
                    console.log('Got watcher event: %s', event);
                    // listChildren(client, path);
                }, (error, children, stat) => {
                    if (error) {
                        console.log(
                            'Failed to list children of %s due to: %s.',
                            path,
                            error
                        );
                        return;
                    }
        
                    console.log('Children of %s are: %j.', path, children);
                    resolve(children.map(name => {
                        return {
                            name,
                        }
                    }))
                })
    
            })
        }
        return {
            list: await _tree(),
        }
    }

    async getData(body) {
        console.log('tree/start', )
        const { path = '/', message } = body
        const client = await this._getClient(body)

        function _getData() {
            return new Promise((resolve, reject) => {
                console.log('tree/getChildren', )
                client.getData(path, event => {
                    console.log('getData/Got watcher event: %s', event);
                    // listChildren(client, path);
                }, (error, data, stat) => {
                    if (error) {
                        console.log(
                            'Failed to getData of %s due to: %s.',
                            path,
                            error
                        );
                        return;
                    }
        
                    // console.log('getData: %j.', path, children);
                    resolve(data ? data.toString('utf8') : null)
                })
    
            })
        }
        return {
            data: await _getData(),
        }
    }

    async setData(body) {
        const { path = '/', data } = body
        const client = await this._getClient(body)

        function _getData() {
            return new Promise((resolve, reject) => {
                client.setData(path, Buffer.from(data), -1, (error, stat) => {
                    if (error) {
                        return reject(error)
                    }
                    resolve(null)
                })
    
            })
        }
        return {
            data: await _getData(),
        }
    }
    
    async create(body) {
        const { path = '/', message } = body
        const client = await this._getClient(body)

        function _getData() {
            return new Promise((resolve, reject) => {
                client.create(path, (error) => {
                    if (error) {
                        return reject(error)
                    }
                    resolve(null)
                })
            })
        }
        await _getData()
        return {}
    }

    async remove(body) {
        const { path = '/', message } = body
        const client = await this._getClient(body)

        function _getData() {
            return new Promise((resolve, reject) => {
                client.remove(path, -1, (error) => {
                    if (error) {
                        return reject(error)
                    }
                    resolve(null)
                })
            })
        }
        await _getData()
        return {}
    }

    async connect(config) {
        const connectionId = uid(32)
        const {
            host,
            port,
            // password,
            test = false,
            // userName,
            clientId = 'client-DMS',
        } = config

        const url = `mqtt://${host}:${port}`
        const params = {
            clientId,
            // username: userName,
            // password,
        }
        // if (test) {
        //     return await mqttConnect(url, params)
        // }

        const connectionString = `${host}:${port}`
        console.log('zookeeper/createClient', connectionString)
        const client = zookeeper.createClient(connectionString)
        client.connect()
        client.on('connected', function () {
            console.log('zookeeper/onConnect')
        })
        client.on('authenticationFailed', function () {
            console.log('zookeeper/authenticationFailed')
        })
        client.on('disconnected', function () {
            console.log('zookeeper/disconnected')
        })
        client.on('connectedReadOnly', function () {
            console.log('zookeeper/connectedReadOnly')
        })
          
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
