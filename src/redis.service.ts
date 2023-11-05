import { Command, default as Redis } from "ioredis"
import { uid } from "uid";
import * as fs from 'fs'
import * as path from 'path'
import * as sqlite3 from 'sqlite3'
import * as moment from 'moment'
import { closeWebSocketByConnectionId, sendRedisMsg } from "./ssh.service";
const stringSplit = require('string-split-by')
const axios = require('axios')

// console.log('stringSplit', stringSplit('  set asd "a b  c"  ', /\s/))

const clients = {}
const subscribe_clients = {}

function sleep(ms): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve()
        }, ms)
    })
}

function splitByFirstSpace(command: string) {
    return stringSplit(command, /\s/)
        .filter(item => item)
        .map(item => item.replace(/^"/, '').replace(/"$/, ''))
    // const _command = command.trim()
    // const m = _command.match(/\s+/)
    // if (m) {
    //     return [
    //         _command.substring(0, m.index),
    //         _command.substring(m.index + m[0].length),
    //     ]
    // }
    // else {
    //     return [_command]
    // }
    // return command.split(/\s/).filter(item => item)
}
// console.log('splitByFirstSpace', splitByFirstSpace(' get  a b  ccd '))
// console.log('splitByFirstSpace', splitByFirstSpace('  set asd "a b  c"  '))

const USER_HOME = process.env.HOME || process.env.USERPROFILE

let yunserFolder = path.resolve(USER_HOME, '.yunser') // TODO package，npm install cmd-core
if (!fs.existsSync(yunserFolder)) {
    fs.mkdirSync(yunserFolder)
}

let appFolder = path.resolve(yunserFolder, 'dms-cli') // TODO package，npm install cmd-core
if (!fs.existsSync(appFolder)) {
    fs.mkdirSync(appFolder)
}

// let sqlDbFilePath = path.resolve(appFolder, 'sqls.json')
// if (!fs.existsSync(sqlDbFilePath)) {
//     // fs.mkdirSync(yunserFolder)
//     fs.writeFileSync(sqlDbFilePath, '', 'utf8')
// }

// let sqlContentText = fs.readFileSync(sqlDbFilePath, 'utf-8')
// if (sqlContentText) {
//     g_sqls = JSON.parse(sqlContentText)
// }

let historyDbFilePath = path.resolve(appFolder, 'redis-v0.6.db')
if (!fs.existsSync(historyDbFilePath)) {
    // fs.mkdirSync(yunserFolder)
    // fs.writeFileSync(historyDbFilePath, '', 'utf8')
}

let shouldInit = false
if (!fs.existsSync(historyDbFilePath)) {
    shouldInit = true
}
const hdb = new sqlite3.Database(historyDbFilePath)
if (shouldInit) {
    hdb.run("CREATE TABLE redis_key (id TEXT, key TEXT, create_time DATETIME)")
    hdb.run("CREATE TABLE redis_history (id TEXT, db INTEGER, command TEXT, create_time DATETIME)")
}

let redisConnectionFilePath = path.resolve(appFolder, 'redis.connection.json')
if (!fs.existsSync(redisConnectionFilePath)) {
    fs.writeFileSync(redisConnectionFilePath, '[]', 'utf8')
}

function dbQueryList(sql: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const list = []
        hdb.all(sql, (err, rows) => {
            // console.log('row', err, rows)
            if (err) {
                return reject(err)
            }
            // console.log(row.id + ": " + row.info);

            // list.push(row)
            resolve(rows)
        })
        // resolve(list)
    })
}

async function dbInsertCommands(commands) {
    for (let command of commands) {
        const historyId = uid(32)
        // slepp，防止查询时排序不对
        await sleep(1)
        const sql = `INSERT INTO redis_history (id, command, create_time) VALUES('${historyId}',  '${command}', '${moment().format('YYYY-MM-DD HH:mm:ss.SSS')}')`
        // console.log('sql', sql)
        hdb.run(sql, (result, err) => {
            console.log('insert result', result, err)
        })
    }
}

async function insertCommandsPro({ commands, db, }) {
    for (let command of commands) {
        const historyId = uid(32)
        // slepp，防止查询时排序不对
        await sleep(1)
        const sql = `INSERT INTO redis_history (id, db, command, create_time) VALUES('${historyId}', ${db}, '${command}', '${moment().format('YYYY-MM-DD HH:mm:ss.SSS')}')`
        // console.log('sql', sql)
        hdb.run(sql, (result, err) => {
            console.log('insert result', result, err)
        })
    }
}


async function historyClear() {
    const dbId = uid(32)
    const sql = `DELETE FROM redis_history`
    // console.log('sql', sql)
    hdb.run(sql, (result, err) => {
        // console.log('historyClear result', result, err)
    })
}
async function dbInsertKey(name, key) {
    const dbId = uid(32)
    const sql = `INSERT INTO redis_key VALUES('${dbId}', '${name}', '${key}', '${moment().format('YYYY-MM-DD HH:mm:ss')}')`
    // console.log('sql', sql)
    hdb.run(sql, (result, err) => {
        // console.log('insert result', result, err)
    })
}

async function dbUpdateKey(id, data) {
    // const dbId = uid(32)
    const sql = `SELECT * FROM redis_key WHERE id = '${id}'`
    // console.log('sql', sql)
    hdb.all(sql, (result, err) => {
        console.log('select result', result, err)
        const sql = `UPDATE redis_key set 'key' = '${data.key}', 'name' = '${data.name}' WHERE id = '${id}'`
        console.log('sql', sql)
        hdb.all(sql, (result, err) => {
            console.log('select result', result, err)
        })
    })
}

async function dbRemoveKey(id) {
    const dbId = uid(32)
    const sql = `DELETE FROM redis_key WHERE id = '${id}'`
    // console.log('sql', sql)
    hdb.run(sql, (result, err) => {
        // console.log('insert result', result, err)
        console.log('result', result)
        if (err) {
            console.error(err)
        }
    })
}



// let g_redis: Redis

// redis.set("mykey", "value"); // Returns a promise which resolves to "OK" when the command succeeds.

// ioredis supports the node.js callback style
// redis.get("mykey", (err, result) => {
//   if (err) {
//     console.error(err);
//   } else {
//     console.log(result); // Prints "value"
//   }
// });

async function getRedis(data): Promise<Redis> {
    const { connectionId } = data
    if (!connectionId) {
        throw new Error('No connection')
    }
    return clients[connectionId].redis
}

function getRedisKeys(g_redis: Redis, keyword: string, { pageSize, cursor = 0 }): Promise<any> {
    return new Promise((resolve, reject) => {
        const keys = []
        // https://github.com/luin/ioredis/issues/1160
        // https://github.com/luin/ioredis/issues/1360
        const useStream = false
        if (useStream) {
            const opts: any = {
                // only returns keys following the pattern of `user:*`
                // match: "user:*",
                // only return objects that match a given type,
                // (requires Redis >= 6.0)
                // type: "zset",
                // returns approximately 100 elements per call
                count: pageSize,
            }
            if (keyword) {
                opts.match = keyword
            }
            const stream = g_redis.scanStream(opts)
            stream.on("data", (resultKeys) => {
            // `resultKeys` is an array of strings representing key names.
            // Note that resultKeys may contain 0 keys, and that it will sometimes
            // contain duplicates due to SCAN's implementation in Redis.
                for (let i = 0; i < resultKeys.length; i++) {
                    // console.log(resultKeys[i]);
                }
                keys.push(...resultKeys)
            })
            stream.on("end", () => {
                resolve(keys)
            });
        }
        else {
            // redis.scan(cursor, 'MATCH', pattern, 'COUNT', fetchCount, (err, res) => {

            g_redis.scan(cursor, 'MATCH', keyword || '*', 'COUNT', pageSize, (err, res) => {
                if (err) {
                    reject(err)
                    return
                }
                // '2', [ 'gen:1595', 'gen:0541']
                const cursor = parseInt(res[0])
                resolve({
                    cursor,
                    list: res[1],
                })
            })
        }
    })
}

async function myCall(g_redis, cmd, params): Promise<any> {
    return new Promise((resolve) => {
        g_redis.call(cmd, params, (err, result) => {
            // console.log('ab', err, result)
            if (err) {
                resolve({
                    success: false,
                    message: err.message || 'Unknown',
                })
            }
            resolve({
                success: true,
                res: result,
            })
        })

        // return {}
    })
}

export class RedisService {

    async index() {
        return 'redis home'
    }

    async execCommands(data) {
        const { key, commands } = data
        const g_redis = await getRedis(data)
        const results = []
        for (let command of commands) {
            const listParams = splitByFirstSpace(command)
            // console.log('listParams', listParams)
            const [cmd, ...params] = listParams
            // console.log('cmd, params', cmd, params)
            // const getCommand = new Command(cmd, params)

            dbInsertCommands([
                command,
            ])
            console.log('cmd, params', cmd, params)
            const result = await myCall(g_redis, cmd, params)
            results.push({
                id: uid(8),
                command,
                // result: await g_redis.sendCommand(getCommand)
                result,
                // result: await g_redis.call(command)
            })
            if (!result.success) {
                break
            }
        }
        return {
            results,
        }
    }

    async clone(data) {
        const { key, newKey } = data
        const g_redis = await getRedis(data)
        dbInsertCommands([
            `DUMP ${key}`,
        ])
        const buffer = await g_redis.dumpBuffer(key)
        // const buffer = await g_redis.dump(key)
        // console.log('buffer', buffer)
        dbInsertCommands([
            `RESTORE ${newKey} 0 <bin>`,
        ])
        await g_redis.restore(newKey, 0, buffer)
        return {}
    }

    async lindex(data) {
        const { key, index } = data
        const g_redis = await getRedis(data)
        return {
            value: await g_redis.lindex(key, index)
        }
    }

    async zadd(data) {
        const g_redis = await getRedis(data)
        const { key, score, value } = data
        dbInsertCommands([
            `ZADD ${key} ${score} ${value}`,
        ])
        await g_redis.zadd(key, score, value)
        return {}
    }

    async xadd(data) {
        const g_redis = await getRedis(data)
        const { key, fields } = data
        dbInsertCommands([
            `XADD ${key} * ${fields.join(' ')}`,
        ])
        await g_redis.xadd(key, '*', ...fields)
        return {}
    }

    async xdel(data) {
        const g_redis = await getRedis(data)
        const { key, id } = data
        dbInsertCommands([
            `XDEL ${key} ${id}`,
        ])
        await g_redis.xdel(key, id)
        return {}
    }

    async zrem(data) {
        const g_redis = await getRedis(data)
        const { key, value } = data
        dbInsertCommands([
            `ZREM ${key} ${value}`,
        ])
        await g_redis.zrem(key, value)
        return {}
    }

    async sadd(data) {
        const g_redis = await getRedis(data)
        const { key, value } = data
        dbInsertCommands([
            `SADD ${key} ${value}`,
        ])
        await g_redis.sadd(key, value)
        return {}
    }

    async sreplace(data) {
        const g_redis = await getRedis(data)
        const { key, value, newValue } = data
        dbInsertCommands([
            `SADD ${key} ${newValue}`,
            `SREM ${key} ${value}`,
        ])
        await g_redis.sadd(key, newValue)
        await g_redis.srem(key, value)
        return {}
    }

    async hreplace(data) {
        const g_redis = await getRedis(data)
        const { key, field, newField, value, newValue } = data
        // await g_redis.sadd(key, newValue)
        // await g_redis.srem(key, value)
        if (newField != field) {
            dbInsertCommands([
                `HSETNX ${key} ${newField} ${newValue}`,
                `HDEL ${key} ${field}`,
            ])
            await g_redis.hsetnx(key, newField, newValue)
            await g_redis.hdel(key, field)
        }
        else {
            dbInsertCommands([
                `HSET ${key} ${field} ${newValue}`,
            ])
            await g_redis.hset(key, field, newValue)
        }

        return {
        }
    }

    async zreplace(data) {
        const g_redis = await getRedis(data)
        const { key, score, newScore, value, newValue } = data
        // await g_redis.sadd(key, newValue)
        // await g_redis.srem(key, value)
        // await g_redis.hsetnx(key, newField, newValue)
        // await g_redis.hdel(key, field)
        dbInsertCommands([
            `ZREM ${key} ${value}`,
            `ZADD ${key} ${newScore} ${newValue}`,
        ])
        await g_redis.zrem(key, value)
        await g_redis.zadd(key, newScore, newValue)
        // if (value != newValue) {
        // }
        // else {
        //     await g_redis.zscore(key, value, newValue)
        // }

        return {}
    }

    async srem(data) {
        const g_redis = await getRedis(data)
        const { key, value, position } = data
        dbInsertCommands([
            `SREM ${key} ${value}`,
        ])
        await g_redis.srem(key, value)
        return {}
    }
    
    async rpush(data) {
        const g_redis = await getRedis(data)
        const { key, value, position = 'last' } = data
        dbInsertCommands([
            `${position == 'last' ? 'RPUSH' : 'LPUSH'} ${key} ${value}`,
        ])
        await g_redis[position == 'last' ? 'rpush' : 'lpush'](key, value)
        return {}
    }

    async hset(data) {
        const g_redis = await getRedis(data)
        const { key, field, value } = data
        dbInsertCommands([
            `HSET ${key} ${field} ${value}`,
        ])
        await g_redis.hset(key, field, value)
        return {}
    }

    async hdel(data) {
        const g_redis = await getRedis(data)
        const { key, field } = data
        await g_redis.hdel(key, field)
        dbInsertCommands([
            `HDEL ${key} ${field}`,
        ])
        return {}
    }

    async lset(data) {
        const g_redis = await getRedis(data)
        const { key, index, value } = data
        dbInsertCommands([
            `LSET ${key} ${index} ${value}`,
        ])
        await g_redis.lset(key, index, value)
        return {}
    }

    async lremove(data) {
        // const g_redis = await getRedis(data)
        // const { key, index } = data
        // // await g_redis.lrem(key, 1, )
        return {}
    }

    async lremIndex(data) {
        const g_redis = await getRedis(data)
        const { key, index } = data
        const removed_key = '__delete_' + uid(32)
        dbInsertCommands([
            `LSET ${key} ${index} ${removed_key}`,
            `LREM ${key} ${-1} ${removed_key}`,
        ])
        await g_redis.lset(key, index, removed_key)
        await g_redis.lrem(key, -1, removed_key)
        
        return {
        }
    }

    async get(data) {
        const { key } = data
        const g_redis = await getRedis(data)
        if (!key) {
            throw new Error('key 不能为空')
        }

        if ((g_redis as any).httpProxyUrl) {
            const res = await axios.post(`${(g_redis as any).httpProxyUrl}/redis/get`, data)
            return res.data
        }

        let debug = null
        let type = null
        let size = null
        let value = null
        let items = null
        // EXISTS key
        let exists = await g_redis.exists(key)
        let commands = []
        if (exists) {
            type = await g_redis.type(key)
            if (type == 'string') {
                value = await g_redis.get(key) 
                size = await g_redis.strlen(key)
                commands.push(`GET ${key}`)
            }
            else if (type == 'list') {
                const length = await g_redis.llen(key)
                commands.push(`LLEN ${key}`)
                items = await g_redis.lrange(key, 0, length - 1)
                commands.push(`LRANGE ${key} 0 ${length - 1}`)
            }
            else if (type == 'set') {
                items = await g_redis.smembers(key)
                commands.push(`SMEMBERS ${key}`)
            }
            else if (type == 'hash') {
                // items = await g_redis.hkeys(key)
                const kvs = await g_redis.hgetall(key)
                commands.push(`HGETALL ${key}`)
                items = Object.keys(kvs).map(k => {
                    return {
                        key: k,
                        value: kvs[k],
                    }
                })
            }
            else if (type == 'zset') {
                commands.push(`ZCARD ${key}`)
                const length = await g_redis.zcard(key)
                commands.push(`ZRANGE ${key} 0 ${length - 1} WITHSCORES`)
                let _items = await g_redis.zrange(key, 0, length - 1, 'WITHSCORES')
                // console.log('zrange/_items', _items)
                // const pipeline = g_redis.pipeline()
                // _items.forEach(_key => pipeline.zscore(key, _key))
                // const scores = await pipeline.exec()
                
                // debug = scores
                items = []
                for (let idx = 0; idx < _items.length; idx += 2) {
                    items.push({
                        member: _items[idx],
                        score: parseFloat(_items[idx + 1])
                    })
                }
                // items = _items.map((member, idx) => {
                //     const [_null, score] = scores[idx]
                //     return {
                //         member,
                //         score
                //     }
                // })
            }
            else if (type == 'stream') {
                // const length = await g_redis.llen(key)
                // commands.push(`LLEN ${key}`)
                // items = await g_redis.lrange(key, 0, length - 1)
                // commands.push(`LRANGE ${key} 0 ${length - 1}`)
                commands.push(`XLEN ${key}`)
                const length = await g_redis.xlen(key)
                const range = await g_redis.xrange(key, '-', '+')
                console.log('range', range)
                // [
                //     [ '1676710397017-0', [ '', '' ] ],
                //     [ '1676710630887-0', [ 'f1', 'v1', 'f2', 'v2' ] ],
                //     [ '1676710701227-0', [ 'f3', 'v3' ] ],
                //     [ '1676711299032-0', [ 'f4', 'v4', 'f5', 'v5' ] ]
                //   ]
    
                items = range.map(item => {
                    return {
                        id: item[0],
                        fields: item[1],
                    }
                })
            }
            else {
                throw new Error('unknown type')
            }
        }

        insertCommandsPro({
            commands,
            db: (g_redis as any).__db,
        })

        return {
            exists: !!exists,
            type,
            value,
            ttl: await g_redis.pttl(key),
            size,
            items,
            // debug,
            encoding: await g_redis.object('ENCODING', key),
        }
    }

    async ping(data) {
        const { key } = data
        const g_redis = await getRedis(data)
        // if (!key) {
        //     throw new Error('key 不能为空')
        // }
        // dbInsertCommands([
        //     `PING`
        // ])
        return {
            res: await g_redis.ping(),
            // ttl: await g_redis.pttl(key),
            // size: await g_redis.strlen(key),
            // encoding: await g_redis.object('ENCODING', key),

        }
    }

    async publish(data) {
        const { channel, message } = data
        const g_redis = await getRedis(data)
        // if (!key) {
        //     throw new Error('key 不能为空')
        // }
        dbInsertCommands([
            `PUBLISH ${channel} ${message}`
        ])
        return {
            info: await g_redis.publish(channel, message),
            // ttl: await g_redis.pttl(key),
            // size: await g_redis.strlen(key),
            // encoding: await g_redis.object('ENCODING', key),

        }
    }

    
    async pubsub(data) {
        const { connectionId, channel, message } = data
        const g_redis = await getRedis(data)
        
        const all = await g_redis.pubsub('CHANNELS')
        console.log('all', all)


        // dbInsertCommands([
        //     `PUBLISH ${channel} ${message}`
        // ])
        return {}
    }

    async subscribe(data) {
        const { connectionId, channel = '*' } = data
        // const g_redis = await getRedis(data)
        
        const { params } = clients[connectionId]

        const redis = new Redis(params)
        subscribe_clients[connectionId] = redis
        redis.on("pmessage", (pattern, channel, message) => {
            console.log(`Received msg`, {
                // pattern,
                channel,
                message,
            });
            sendRedisMsg({
                channel,
                message,
            })
        //   console.log(`Received ${message} from ${channel}`);
        });
        redis.psubscribe(channel, (err, count) => {
            if (err) {
              // Just like other commands, subscribe() can fail for some reasons,
              // ex network issues.
              console.error("Failed to subscribe: %s", err.message);
            } else {
              // `count` represents the number of channels this client are currently subscribed to.
            //   console.log(
            //     `Subscribed successfully! This client is currently subscribed to ${count} channels.`
            //   );
              console.log('Subscribed successfully')
            }
        });
        //   redis.on("messageBuffer", (channel, message) => {
        //     // Both `channel` and `message` are buffers.
        //     console.log(channel, message);
        //   });


        // dbInsertCommands([
        //     `PUBLISH ${channel} ${message}`
        // ])
        return {
            // info: await g_redis.publish(channel, message),
            // ttl: await g_redis.pttl(key),
            // size: await g_redis.strlen(key),
            // encoding: await g_redis.object('ENCODING', key),

        }
    }

    async unSubscribe(data) {
        const { connectionId, channel = '*' } = data
        
        const redis = subscribe_clients[connectionId]
        
        redis.punsubscribe(channel)
        
        return {}
    }

    async getInfo(data) {
        const { key } = data
        const g_redis = await getRedis(data)
        // if (!key) {
        //     throw new Error('key 不能为空')
        // }
        dbInsertCommands([
            `INFO`
        ])
        return {
            info: await g_redis.info(),
            // ttl: await g_redis.pttl(key),
            // size: await g_redis.strlen(key),
            // encoding: await g_redis.object('ENCODING', key),

        }
    }

    async getConfig(data) {
        const { key } = data
        const g_redis = await getRedis(data)


        if ((g_redis as any).httpProxyUrl) {
            const res = await axios.post(`${(g_redis as any).httpProxyUrl}/redis/config`, data)
            return res.data
        }
        
        // if (!key) {
        //     throw new Error('key 不能为空')
        // }
        dbInsertCommands([
            `INFO`
        ])
        return {
            config: await g_redis.config('GET', 'databases'),
            info: await g_redis.info(),
            // ttl: await g_redis.pttl(key),
            // size: await g_redis.strlen(key),
            // encoding: await g_redis.object('ENCODING', key),

        }
    }

    async delete(data) {
        const { key, keys = [] } = data
        const g_redis = await getRedis(data)
        if (keys.length) {
            for (let key of keys) {
                dbInsertCommands([
                    `DEL ${key}`
                ])
            }
            await g_redis.del(keys)
            return {}
        }
        if (!key) {
            throw new Error('key 不能为空')
        }

        if ((g_redis as any).httpProxyUrl) {
            const res = await axios.post(`${(g_redis as any).httpProxyUrl}/redis/config`, data)
            return res.data
        }
        
        dbInsertCommands([
            `DEL ${key}`
        ])
        await g_redis.del(key)
        return {}
    }

    async expire(data) {
        const { key, seconds } = data
        const g_redis = await getRedis(data)
        if (!key) {
            throw new Error('key 不能为空')
        }
        // if (!seconds) {
        //     throw new Error('value 不能为空')
        // }
        if (seconds == -1) {
            dbInsertCommands([
                `PERSIST ${key}`
            ])
            await g_redis.persist(key)
        }
        else {
            dbInsertCommands([
                `EXPIRE ${key} ${seconds}`
            ])
            await g_redis.expire(key, seconds)
        }
        return {}
    }

    async set(data) {
        const { key, value } = data
        const g_redis = await getRedis(data)
        if (!key) {
            throw new Error('key 不能为空')
        }
        if (!value) {
            throw new Error('value 不能为空')
        }

        if ((g_redis as any).httpProxyUrl) {
            const res = await axios.post(`${(g_redis as any).httpProxyUrl}/redis/set`, data)
            return res.data
        }

        dbInsertCommands([
            `SET ${key} ${value}`
        ])
        await g_redis.set(key, value)
        return {}
    }

    async rename(data) {
        const { key, newKey } = data
        const g_redis = await getRedis(data)
        if (!key) {
            throw new Error('key 不能为空')
        }
        if (!newKey) {
            throw new Error('newKey 不能为空')
        }
        dbInsertCommands([
            `RENAME ${key} ${newKey}`
        ])
        await g_redis.rename(key, newKey)
        return {}
    }

    async health(body) {
        const { connectionId } = body
        const content = fs.readFileSync(redisConnectionFilePath, 'utf-8')
        const connections = JSON.parse(content)
        const connection = connections.find(item => item.id == connectionId)
        return await this.connect(connection)
    }

    async connect(config) {
        const connectionId = `redis_${uid(32 - 6)}`
        const {
            host,
            port,
            // user,
            password,
            db,
            test = false,
            userName,
            httpProxyUrl,
        } = config

        if (httpProxyUrl) {
            clients[connectionId] = {
                redis: {
                    httpProxyUrl,
                }
            }
            return {
                connectionId,
            }
        }
        let g_redis
        const params = {
            host,
            port,
            lazyConnect: true,
            connectTimeout: 1000,
            username: undefined,
            password: undefined,
            maxRetriesPerRequest: 1,
            // This is the default value of `retryStrategy`
            retryStrategy(times) {
                const delay = Math.min(times * 2000, 2000);
                console.log('redis/retry/times', times)
                // console.log('redis/retry/delay', delay)
                if (times > 3) {
                    g_redis.quit()
                    return 9999999999
                }
                return delay;
            },
            reconnectOnError(err) {
                console.log('redis/reconnectOnError', err)
                // MaxRetriesPerRequestError: Reached the max retries per request limit (which is 1). Refer to "maxRetriesPerRequest" option for details.
                // const targetError = "READONLY";
                // if (err.message.includes(targetError)) {
                //   // Only reconnect when the error contains "READONLY"
                //     return true; // or `return 1;`
                // }
                return false
            },
        }
        if (password) {
            params.password = password
        }
        if (userName) {
            params.username = userName 
        }
        // console.log('params', params)
        g_redis = new Redis(params)
        g_redis
            .on('connect', () => {
                // emits when a connection is established to the Redis server.
                // console.log('redis/on/connect', )
            })
            .on('ready', () => {
                // console.log('redis/on/ready', )
            })
            .on('error', () => {
                // console.log('redis/on/error', )
            })
            .on('close', () => {
                console.log('redis/on/close', )
            })
            .on('reconnecting', () => {
                // console.log('redis/on/reconnecting', )
            })
            .on('end', () => {
                console.log('redis/on/end', )
                closeWebSocketByConnectionId(connectionId)
            })
        if (test) {
            // console.log('before connect')
            try {
                await g_redis.connect()
            }
            catch (err) {
                console.log('err', err)
            }
            // console.log('after connect')
            return {
                ping: await g_redis.ping(),
            }
        }
        // g_redis.on()
        (g_redis as any).__db = 0 // 默认数据库 0
        clients[connectionId] = {
            redis: g_redis,
            params,
        }
        try {
            await g_redis.connect()
        }
        catch (err) {
            console.log('err', err)
        }
        await g_redis.ping()
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

    async keys(body) {
        const g_redis = await getRedis(body)

        if ((g_redis as any).httpProxyUrl) {
            const res = await axios.post(`${(g_redis as any).httpProxyUrl}/redis/keys`, body)
            return res.data
        }

        const { db = 0, keyword, cursor, page = 1, pageSize = 100 } = body
        // @ts-ignore
        g_redis.__db = db
        g_redis.select(db)
        async function asyncMap(list, cb) {
            const results = []
            for (let item of list) {
                results.push(await cb(item))
            }
            return results
            // return Promise.all(list.map(item => {
            //     return new Promise((resolve) => {
            //         cb(item).then(() => {
            //             resolve()
            //         })
            //     })
            // }))
        }

        const total = await g_redis.dbsize()
        let { cursor: _cursor, list } = await getRedisKeys(g_redis, keyword, {
            pageSize,
            cursor,
        })
        const pipeline = g_redis.pipeline()
        list.forEach(key => pipeline.type(key))
        const keys = await pipeline.exec()

        // list = await asyncMap(list, async key => {
        //     return {
        //         key,
        //         // type: await g_redis.type(key),
        //         type: 'string',
        //     }
        // })

        const newList = list.map((key, idx) => {
            const [err, type] = keys[idx]
            return {
                key,
                // type: await g_redis.type(key),
                type,
                // type: 'string',
            }
        })
        return {
            total,
            cursor: _cursor,
            list: newList,
            // keys,
        }
    }

    async historyList(params) {
        const { page = 1, pageSize = 10, keyword } = params
        // console.log('historyList', )

        const countSql = `SELECT COUNT(*) FROM redis_history`
        const countResults = await dbQueryList(countSql)
        // console.log('countResults', countResults)
        const total = countResults[0]['COUNT(*)']

        const offset = (page - 1) * pageSize
        const sql = `SELECT * FROM redis_history ORDER BY create_time DESC LIMIT ${offset}, ${pageSize}`
        const list = await dbQueryList(sql)
        // db.each("", (err, row) => {
        //     console.log('row', err, row)
        //     // console.log(row.id + ": " + row.info);
        //     list.push(row)
        // })

        // console.log('historyList end', )
        return {
            total,
            list,
        }
    }

    async historyClear(_data) {
        await historyClear()
    }

    async keyCreate(data) {
        // const g_redis = await getRedis(data)
        const { name, key } = data
        dbInsertKey(name, key)
        return {}
    }

    async keyUpdate(params) {
        const { id, data } = params
        dbUpdateKey(id, data)
    }

    async keyRemove(data) {
        const { id } = data
        dbRemoveKey(id)
        return {}
    }

    async keyList(params) {
        const { page = 1, pageSize = 10, keyword } = params
        // console.log('historyList', )

        let whereSql = ''
        if (keyword) {
            whereSql = ` WHERE name LIKE '%${keyword}%' OR key LIKE '%${keyword}%'`
        }
        let countSql = `SELECT COUNT(*) FROM redis_key${whereSql}`
        const countResults = await dbQueryList(countSql)
        // console.log('countResults', countResults)
        const total = countResults[0]['COUNT(*)']

        const offset = (page - 1) * pageSize
        const sql = `SELECT * FROM redis_key${whereSql} ORDER BY create_time DESC LIMIT ${offset}, ${pageSize}`
        console.log('sql', sql)
        const list = await dbQueryList(sql)
        // db.each("", (err, row) => {
        //     console.log('row', err, row)
        //     // console.log(row.id + ": " + row.info);
        //     list.push(row)
        // })

        // console.log('historyList end', )
        return {
            total,
            list,
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
        fs.writeFileSync(redisConnectionFilePath, JSON.stringify(newList, null, 4), 'utf-8')
        return {}
    }

    async flush(body) {
        const g_redis = await getRedis(body)
        // Redis 没有查看当前是哪个数据库的命令
        await g_redis.flushdb()
        return {}
    }

    async flushAll(body) {
        const g_redis = await getRedis(body)
        // Redis 没有查看当前是哪个数据库的命令
        await g_redis.flushall()
        return {}
    }

    async gen2000(body) {
        const g_redis = await getRedis(body)
        const { number = 100 } = body
        const pipeline = g_redis.pipeline()
        for (let i = 0; i < number; i++) {
            const num = ('' + (i + 1)).padStart(('' + number).length, '0')
            pipeline.set(`gen:${num}`, `value-${num}`)
        }
        await pipeline.exec()
        return {}
    }
}
