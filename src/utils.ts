import { Command, default as Redis } from "ioredis"
import { uid } from "uid";
import * as fs from 'fs'
import * as path from 'path'
import * as sqlite3 from 'sqlite3'
import * as moment from 'moment'
import { closeWebSocketByConnectionId, sendRedisMsg } from "./ssh.service";
const stringSplit = require('string-split-by')

const nodePath = path

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

let historyDbFilePath = path.resolve(appFolder, 'redis-v0.5.db')
if (!fs.existsSync(historyDbFilePath)) {
    // fs.mkdirSync(yunserFolder)
    // fs.writeFileSync(historyDbFilePath, '', 'utf8')
}

export async function loadDbJson(fileName: string, defaultValue = null) {
    const path = nodePath.resolve(appFolder, fileName)
    // console.log('path', path)
    const content = fs.readFileSync(path, 'utf-8')
    // console.log('content', content)
    if (content) {
        return JSON.parse(content)
    }
    return defaultValue
}

export async function writeDbJson(fileName: string, list) {
    const path = nodePath.resolve(appFolder, fileName)
    // console.log('path', path)
    const content = fs.readFileSync(path, 'utf-8')
    // console.log('content', content)
    fs.writeFileSync(path, JSON.stringify(list, null, 4))
    return {}
}

export async function pushDbJson(fileName: string, item) {
    const path = nodePath.resolve(appFolder, fileName)
    // console.log('path', path)
    const content = fs.readFileSync(path, 'utf-8')
    // console.log('content', content)
    let list = []
    if (content) {
        list = JSON.parse(content)
    }
    list.unshift(item)
    fs.writeFileSync(path, JSON.stringify(list, null, 4))
    return {}
}
