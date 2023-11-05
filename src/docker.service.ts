import { Command, default as Redis } from "ioredis"
import { uid } from "uid";
import * as fs from 'fs'
import * as path from 'path'
import * as mqtt from 'mqtt'
import { MqttClient } from 'mqtt'
import * as moment from 'moment'
import { sendMqttMsg, sendRedisMsg, sendTcpMsg, SshService } from "./ssh.service";
const { Kafka } = require('kafkajs')
const axios = require('axios')
const { exec } = require('child_process')

const sshService = new SshService()

const clients = {}

function myExec(command): Promise<object> {
    return new Promise((resolve, reject) => {
        exec(command, ((stderr, stdout) => {
            resolve({
                stderr: stderr || null,
                stdout: stdout || '',
            })
        }))
    })
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

let redisConnectionFilePath = path.resolve(appFolder, 'docker.connection.json')
if (!fs.existsSync(redisConnectionFilePath)) {
    fs.writeFileSync(redisConnectionFilePath, '[]', 'utf8')
}


export class DockerService {

    async index(_body) {
        return 'docker home'
    }

    async version(body) {
        // const { id } = body
        return await this._getObject(body, `/version`)
    }
    
    async run(body) {
        const { command } = body
        const res = await myExec(command)
        console.log('res', res)
        return {
            ...res,
        }
    }

    async connectionList(body) {
        const list = await loadJson(redisConnectionFilePath, [])
        
        return {
            list,
        }
    }

    async configs(body) {
        return await this._getList(body, '/configs')
    }

    async containers(body) {
        return await this._getList(body, '/containers/json?all=1')
    }

    async containerStop(body) {
        const { id } = body
        return await this._post(body, `/containers/${id}/stop`)
    }

    async containerStart(body) {
        const { id } = body
        return await this._post(body, `/containers/${id}/start`)
    }

    async volumeDetail(body) {
        const { id } = body
        return await this._getObject(body, `/volumes/${id}`)
    }

    async containerRemove(body) {
        const { id } = body
        return await this._delete(body, `/containers/${id}`)
    }

    async imageRemove(body) {
        const { id } = body
        return await this._delete(body, `/images/${id}`)
    }

    async networkRemove(body) {
        const { id } = body
        return await this._delete(body, `/networks/${id}`)
    }

    async serviceRemove(body) {
        const { id } = body
        return await this._delete(body, `/services/${id}`)
    }

    async volumeRemove(body) {
        const { id } = body
        return await this._delete(body, `/volumes/${id}`)
    }
    
    async images(body) {
        return await this._getList(body, '/images/json')
    }

    async services(body) {
        return await this._getList(body, '/services')
    }

    async plugins(body) {
        return await this._getList(body, '/plugins')
    }

    async stats(body) {
        const res = await this._command(body, `docker stats --no-stream --format json`)
        console.log('stats/res', res)
        const { stderr, stdout } = res.data
        if (stderr) {
            throw new Error(stderr)
        }
        console.log('stdout', stdout)
        // const json = stdout.split('\r\n')[1]
        // console.log('json', json)
        return {
            list: stdout.split('\n')
                .map(json => json)
                .filter(item => item)
                .map(item => JSON.parse(item)),
            // json,
        }
    }

    async networks(body) {
        return await this._getList(body, '/networks')
    }

    async volumes(body) {
        return await this._getList(body, '/volumes')
    }

    async _getObject(body, path, method = 'GET') {
        const res = await this._command(body, `curl -i -s --unix-socket /var/run/docker.sock -X ${method} http://localhost${path}`)

        const { stderr, stdout } = res.data
        // const idx = stdout.findIndex('\r\n\r\n')
        const m = stdout.match(/\r\n\r\n/)
        const obj = JSON.parse(stdout.substring(m.index))
        return obj
    }

    async _getList(body, path, method = 'GET') {
        const res = await this._command(body, `curl -i -s --unix-socket /var/run/docker.sock -X ${method} http://localhost${path}`)
        console.log('_getList/res', res)

        const { stderr, stdout } = res.data
        // const idx = stdout.findIndex('\r\n\r\n')
        const m = stdout.match(/\r\n\r\n/)
        const _list = JSON.parse(stdout.substring(m.index))
        return {
            list: _list,
        }
    }

    async _get(body, path) {
        await this._command(body, `curl -i -s --unix-socket /var/run/docker.sock -X GET http://localhost${path}`)
        return {}
    }

    async _post(body, path) {
        await this._command(body, `curl -i -s --unix-socket /var/run/docker.sock -X POST http://localhost${path}`)
        return {}
    }

    async _delete(body, path) {
        await this._command(body, `curl -i -s --unix-socket /var/run/docker.sock -X DELETE http://localhost${path}`)
        return {}
    }

    async _command(body, command) {
        const { connectionId } = body
        const list = await loadJson(redisConnectionFilePath, [])
        if (!connectionId) {
            throw new Error('connectionId required')
        }

        let item
        if (connectionId.startsWith('ssh:')) {
            item = list.find(item => item.sshId == connectionId.split(':')[1])
        }
        else {
            item = list.find(item => item.id == connectionId)
        }
        if (!item) {
            throw new Error('connectionId error')
        }
        const { type, url } = item

        // console.log('item', item)
        if (type == 'ssh') {
            const { sshId } = item
            if (!sshId) {
                throw new Error('sshId required')
            }
            const ret = await sshService._exec({
                id: sshId,
                command,
            })
            console.log('ret', ret)
            return {
                data: ret,
            }
        }
        else {

        }
        const res = await axios.post(`${url}/docker/run`, {
            "command": command,
        })
        // console.log('res', res)
        // data: { stderr, stdout }
        return res

    }
}
