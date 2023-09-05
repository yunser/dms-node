import * as fs from 'fs'
import * as path from 'path'

async function loadJson(path, defaultValue = null) {
    const content = fs.readFileSync(path, 'utf-8')
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

let redisConnectionFilePath = path.resolve(appFolder, 'es.connection.json')
if (!fs.existsSync(redisConnectionFilePath)) {
    fs.writeFileSync(redisConnectionFilePath, '[]', 'utf8')
}


export class EsService {

    async index(_body) {
        return 'es home'
    }

    async connectionList(body) {
        const list = await loadJson(redisConnectionFilePath, [])
        
        return {
            list,
        }
    }
}
