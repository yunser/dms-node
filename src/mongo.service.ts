import * as fs from 'fs'
import * as path from 'path'
const nodePath = path
import { uid } from 'uid'
import { MongoClient, ObjectId } from 'mongodb'


const g_connections = {}


const USER_HOME = process.env.HOME || process.env.USERPROFILE

let yunserFolder = path.resolve(USER_HOME, '.yunser') // TODO package，npm install cmd-core
// if (!fs.existsSync(yunserFolder)) {
//     // console.log('创建目录')
//     fs.mkdirSync(yunserFolder)
// }

let appFolder = path.resolve(yunserFolder, 'dms-cli') // TODO package，npm install cmd-core
// if (!fs.existsSync(appFolder)) {
//     fs.mkdirSync(appFolder)
// }



let collectionDbFilePath = path.resolve(appFolder, 'file.collection.json')
if (!fs.existsSync(collectionDbFilePath)) {
    // console.log('创建目录')
    // fs.mkdirSync(yunserFolder)
    fs.writeFileSync(collectionDbFilePath, '[]', 'utf8')
}

const mongoDefault = {
    version: '1.0.0',
    connections: [],
}

let mongoDbFilePath = path.resolve(appFolder, 'mongo.json')
if (!fs.existsSync(mongoDbFilePath)) {
    // console.log('创建目录')
    // fs.mkdirSync(yunserFolder)
    fs.writeFileSync(mongoDbFilePath, JSON.stringify(mongoDefault, null, 4), 'utf8')
}

export class MongoService {

    async home(_body) {
        return 'mongo home'
    }
    
    async connectionList(body) {
        const content = fs.readFileSync(mongoDbFilePath, 'utf-8')
        const list = JSON.parse(content).connections
        return {
            list,
        }
    }

    async connectionCreate(body) {
        const {
            name,
            host,
            port,
            password,
            username,
        } = body
        const content = fs.readFileSync(mongoDbFilePath, 'utf-8')
        const storeData = JSON.parse(content)
        storeData.connections.push({
            id: uid(32),
            name,
            host,
            port,
            password,
            username,
        })
        fs.writeFileSync(mongoDbFilePath, JSON.stringify(storeData, null, 4), 'utf-8')
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
        const content = fs.readFileSync(mongoDbFilePath, 'utf-8')
        const storeData = JSON.parse(content)
        const idx = storeData.connections.findIndex(_item => _item.id == id)
        storeData.connections[idx] = {
            ...storeData.connections[idx],
            ...data,
        }
        fs.writeFileSync(mongoDbFilePath, JSON.stringify(storeData, null, 4), 'utf-8')
    }

    async connectionDelete(body) {
        const {
            id,
        } = body
        const content = fs.readFileSync(mongoDbFilePath, 'utf-8')
        const storeData = JSON.parse(content)
        storeData.connections = storeData.connections.filter(item => item.id != id)
        fs.writeFileSync(mongoDbFilePath, JSON.stringify(storeData, null, 4), 'utf-8')
    }

    async connect(config) {
        const connectionId = uid(32)
        const {
            host,
            port,
            username,
            password,
            db,
            test = false,
        } = config
        
        const url = `mongodb://${username}:${password}@${host}:${port}`
        const client = new MongoClient(url)
        await client.connect()

        if (test) {
            return {}
        }
        
        g_connections[connectionId] = {
            client,
            config,
        }
        
        return {
            connectionId,
        }
    }

    async databases(body) {
        const client = await this._getClient(body)
        const admin = client.db().admin()
        const dbInfo = await admin.listDatabases()
        return {
            list: dbInfo.databases,
            dbInfo,
        }
    }

    async databaseCreate(body) {
        const { database } = body
        const client = await this._getClient(body)
        const db = client.db(database)
        db.createCollection('new_collection')
        // const collections = await db.listCollections().toArray()
        // console.log('dbInfo', dbInfo)
        return {}
    }

    async databaseDrop(body) {
        const { database } = body
        const client = await this._getClient(body)
        const db = await client.db(database).dropDatabase()
        return {}
    }

    async collections(body) {
        const { database } = body
        const client = await this._getClient(body)
        const db = client.db(database)
        const collections = await db.listCollections().toArray()
        // console.log('dbInfo', dbInfo)
        return {
            list: collections,
        }
    }

    async collectionCreate(body) {
        const {
            database,
            collection,
        } = body
        const client = await this._getClient(body)
        const db = client.db(database)
        console.log('collection', collection)
        db.createCollection(collection)
        return {}
    }

    async collectionDrop(body) {
        const {
            database,
            collection,
        } = body
        const client = await this._getClient(body)
        const db = client.db(database)
        const col = db.collection(collection)
        await col.drop()
        return {}
    }

    async collectionClear(body) {
        const {
            database,
            collection,
        } = body
        const client = await this._getClient(body)
        const db = client.db(database)
        const col = db.collection(collection)
        await col.deleteMany({})
        return {}
    }

    async documents(body) {
        const {
            database,
            collection,
            skip = 0,
            limit = 1000,
            conditions = {},
        } = body
        console.log('conditions', conditions)
        const client = await this._getClient(body)
        const db = client.db(database)
        // const code = `db.getCollection("users").find({"_id" : ObjectId("60938c33fed16f003090d268")}).limit(20).skip(0)`
        // await db.command(code)
        const col = db.collection(collection)
        if (conditions['_id']) {
            conditions['_id'] = new ObjectId(conditions['_id'])
        }
        const documents = await col.find(conditions, {
            limit,
            skip,
        }).toArray()
        console.log('documents', documents)
        const count = await col.countDocuments(conditions)
        return {
            total: count,
            list: documents,
        }
    }

    async documentCreate(body) {
        const {
            database,
            collection,
            data,
        } = body
        const client = await this._getClient(body)
        const db = client.db(database)
        const col = db.collection(collection)
        // const 
        const saveData = {
            ...data,
        }
        if (saveData._id) {
            const objId = ('' + saveData._id).padStart(24, '0').slice(0, 24)
            console.log('objId', objId)
            saveData._id = new ObjectId(objId)
        }
        const ret = await col.insertOne(saveData)
        console.log('ret', ret)
        return {}
    }

    async documentUpdate(body) {
        const {
            database,
            collection,
            id,
            data,
        } = body
        const client = await this._getClient(body)
        const db = client.db(database)
        const col = db.collection(collection)

        // var obj_id = BSON.ObjectID.createFromHexString(id);
        const ret = await col.findOneAndReplace({
            _id: new ObjectId(id),
        }, data)
        console.log('ret', ret)
        return {}
    }

    async documentUpdateByQuery(body) {
        const {
            database,
            collection,
            query,
            data,
        } = body
        const client = await this._getClient(body)
        const db = client.db(database)
        const col = db.collection(collection)

        const ret = await col.updateMany(query, {
            $set: data,
        })
        console.log('ret', ret)
        return {}
    }

    async documentRemoveByQuery(body) {
        const {
            database,
            collection,
            query,
            data,
        } = body
        const client = await this._getClient(body)
        const db = client.db(database)
        const col = db.collection(collection)

        const ret = await col.deleteMany(query)
        console.log('ret', ret)
        return {}
    }

    async documentRemove(body) {
        const {
            database,
            collection,
            id,
            ids = [],
        } = body
        const client = await this._getClient(body)
        const db = client.db(database)
        const col = db.collection(collection)

        if (ids.length) {
            // await col.deleteMany({
            //     _id: new ObjectId(id),
            // })
            for (let id of ids) {
                await col.deleteOne({
                    _id: new ObjectId(id),
                })
            }
        }
        else {
            // var obj_id = BSON.ObjectID.createFromHexString(id);
            const ret = await col.deleteOne({
                _id: new ObjectId(id),
            })
            console.log('ret', ret)
        }
        return {}
    }

    async indexList(body) {
        const {
            database,
            collection,
            id,
        } = body
        const client = await this._getClient(body)
        const db = client.db(database)
        const col = db.collection(collection)

        // var obj_id = BSON.ObjectID.createFromHexString(id);
        const ret = await col.indexes()
        console.log('ret', ret)
        return {
            list: ret,
        }
    }

    async indexCreate(body) {
        const {
            database,
            collection,
            id,
        } = body
        const client = await this._getClient(body)
        const db = client.db(database)
        const col = db.collection(collection)

        // var obj_id = BSON.ObjectID.createFromHexString(id);
        await col.createIndex({
            'account': 1,
        })
        // console.log('ret', ret)
        return {
            // list: ret,
        }
    }

    async mock(body) {
        const { database, collection } = body
        const client = await this._getClient(body)
        const db = client.db('test')
        const col = db.collection('big-data-v2')
        for (let i = 0; i < 1000; i++) {
            const res = await col.insertOne({
                name: 'name-' + (i + 1),
            })
            console.log('res', res)
        }
        return {}
    }

    async _getClient(body): Promise<MongoClient> {
        const { connectionId } = body
        return g_connections[connectionId].client
    }

    async serverInfo(body) {
        const client = await this._getClient(body)
        const admin = client.db().admin()
        const serverInfo = await admin.serverInfo() 
        console.log('serverInfo', serverInfo)
        return {
            ...serverInfo,
        }
    }
}
