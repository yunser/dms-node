import { Command, default as Redis } from "ioredis"
import { uid } from "uid";
import * as fs from 'fs'
import * as path from 'path'
import * as mqtt from 'mqtt'
import { MqttClient } from 'mqtt'
import * as moment from 'moment'
import { sendMqttMsg, sendRedisMsg, sendTcpMsg } from "./ssh.service";
const { Kafka } = require('kafkajs')

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

let redisConnectionFilePath = path.resolve(appFolder, 'kafka.connection.json')
if (!fs.existsSync(redisConnectionFilePath)) {
    fs.writeFileSync(redisConnectionFilePath, '[]', 'utf8')
}

async function loadJson(path, defaultValue = null) {
    // console.log('path', path)
    const content = fs.readFileSync(path, 'utf-8')
    // console.log('content', content)
    if (content) {
        return JSON.parse(content)
    }
    return defaultValue
}

let g_kafka
let g_kafka_admin
let g_kafka_consumer
let g_kafka_producer

export class KafkaService {

    async index(_body) {
        return 'kafka home'
    }

    async connectionList(_body) {
        const list = await loadJson(redisConnectionFilePath, [])
        return {
            list,
        }
    }

    async connectionCreate(body) {
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

    async connectionUpdate(body) {
        const {
            id,
            data,
        } = body
        // name,
        // host,
        // port,
        // password,
        // username,
        const content = fs.readFileSync(redisConnectionFilePath, 'utf-8')
        const storeData = JSON.parse(content)
        const idx = storeData.findIndex(_item => _item.id == id)
        storeData[idx] = {
            ...storeData[idx],
            ...data,
        }
        fs.writeFileSync(redisConnectionFilePath, JSON.stringify(storeData, null, 4), 'utf-8')
    }

    async connect(body) {
        const { host, port, test = false } = body

        const kafka = new Kafka({
            clientId: 'client-dms-test',
            brokers: [
                `${host}:${port}`,
            ],
            connectionTimeout: 6000, // default 1000
            retries: 1, // default 5
            maxRetryTime: 8 * 1000, // default 30 s
        })
        const admin = kafka.admin()
    
        await admin.connect()

        return {}
    }

    async init(body) {
        const { connectionId, clientId, groupId, test = false } = body
        const list = await loadJson(redisConnectionFilePath, [])
        const item = list.find(item => item.id == connectionId)
        console.log('init/item', item)
        const { host, port } = item

        // https://kafka.js.org/docs/1.10.0/configuration#connection-timeout
        const kafka = new Kafka({
            clientId,
            brokers: [
                `${host}:${port}`,
            ],
            connectionTimeout: 6000, // default 1000
            retries: 1, // default 5
            maxRetryTime: 8 * 1000, // default 30 s
        })
        g_kafka = kafka

        const admin = kafka.admin()

        g_kafka_admin = admin
    
        await admin.connect()

        if (test) {
            return {}
        }

        const consumer = kafka.consumer({
            groupId,
        })
        g_kafka_consumer = consumer
        await consumer.connect()

        const producer = kafka.producer()
        g_kafka_producer = producer
        await producer.connect()

        return {}
    }

    async topics(_body) {
        const topics = await g_kafka_admin.listTopics()
        return {
            list: topics.map(item => {
                return {
                    name: item,
                }
            }),
        }
    }

    async topicDetail(body) {
        const { topic } = body
        const topicOffsets = await g_kafka_admin.fetchTopicOffsets(topic)
        const { groups } = await g_kafka_admin.listGroups()
        for (let group of groups) {
            const offsets = await g_kafka_admin.fetchOffsets({
                groupId: group.groupId,
                topics: [topic],
            })
            let partitions = []
            if (offsets.length) {
                partitions = offsets[0].partitions
            }
            group.partitions = partitions
        }
        return {
            name: topic,
            offsets: topicOffsets,
            groups,
        }
    }

    async groups(_body) {
        // const topics = await g_kafka_admin.listTopics()
        const { groups } = await g_kafka_admin.listGroups()
        return {
            list: groups,
        }
    }

    async groupDetail(body) {
        const { groupId } = body
        // const topics = await g_kafka_admin.listTopics()
        const topics = await g_kafka_admin.listTopics()
        // const { groups } = await g_kafka_admin.listGroups()
        const topic2OffsetMap = {}
        for (let topic of topics) {
            const topicOffsets = await g_kafka_admin.fetchTopicOffsets(topic)
            // [ { partition: 0, offset: '21', high: '21', low: '0' } ]
            // console.log('topicOffsets', topicOffsets)
            // topic.offsets = topicOffsets
            topic2OffsetMap[topic] = topicOffsets
        }
        const offsets = await g_kafka_admin.fetchOffsets({
            groupId,
            topics,
            // resolveOffsets: true,
        })
        // [
        //     {
        //         "topic": "mac-topic-test",
        //         "partitions": [
        //             {
        //                 "partition": 0,
        //                 "offset": "19",
        //                 "metadata": null
        //             }
        //         ]
        //     }
        // ]
        return {
            offsets: offsets.map(offset => {
                const topicOffsets = topic2OffsetMap[offset.topic]
                const partitions = offset.partitions.filter(item => item.offset != -1)
                partitions.forEach(item => {
                    const { partition } = item
                    const fOs = topicOffsets.find(_item => _item.partition == partition)
                    if (fOs) {
                        item.topicOffset = parseInt(fOs.offset)
                    }
                    else {
                        item.topicOffset = -1
                    }
                })
                if (partitions.length == 0) {
                    return null
                }
                return {
                    ...offset,
                    partitions,
                }
            }).filter(item => item),
            // list: groups,
        }
    }

    async send(body) {
        const { topic, content } = body

        const res = await g_kafka_producer.send({
            // topic: 'ntopic-test',
            // topic: 'mac-topic-test',
            topic,
            messages: [
                {
                    value: content,
                },
            ],
        })
        // console.log('res', res)
        return {}
    }

    async subscribe(body) {
        const { webSocketId, topic } = body

        
        await g_kafka_consumer.subscribe({
            // topic: 'test-topic', 
            // topic: /ntopic-.*/i, 
            // topic: 'mac-topic-test',
            topic,
            // fromBeginning: true
        })
        // console.log('consumer/subscribed')
        await g_kafka_consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                const msg = message.value.toString()
                console.log('consumer/eachMessage', topic, partition, msg)
                const time = moment().format('YYYY-MM-DD HH:mm:ss')
                sendTcpMsg({
                    webSocketId,
                    message: {
                        id: uid(8),
                        time,
                        type: 'message',
                        data: {
                            type: 'message',
                            topic,
                            partition,
                            content: msg,
                        }
                    }
                })
            },
        })
        return {}
    }

    async removeTopic(body) {
        const { topic } = body
        await g_kafka_admin.deleteTopics({
            topics: [topic],
        })
        return {}
    }

    async removeGroup(body) {
        const { groupId } = body
        await g_kafka_admin.deleteGroups([groupId])
        return {}
    }
}
