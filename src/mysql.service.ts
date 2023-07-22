// 不依赖框架
import * as moment from 'moment'
import { createConnection } from 'mysql2'
import * as fs from 'fs'
import * as path from 'path'
import { uid } from 'uid'
const axios = require('axios')
import * as sqlite3 from 'sqlite3'
import { Client } from 'pg'
import { closeWebSocketByDbConnectionId } from './ssh.service'
// import * as alasql from 'alasql'

const nodePath = path
const alasql = require('alasql')

var Connection = require('tedious').Connection;
var Request = require('tedious').Request;

const g_taskMap = {}

function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(null)
        }, ms)
    })
}

function getValue(value) {
    if (typeof value == 'number') {
        return `${value}`
    }
    if (value === null) {
        return `NULL`
    }
    if (value instanceof Date) {
        return `'${moment(value).format('YYYY-MM-DD HH:mm:ss')}'`
    }
    return `'${value.replace(/\n/g, '\\n').replace(/'/g, '\\\'')}'`
}

function dbQueryList(hdb: sqlite3.Database, sql: string): Promise<any[]> {
    // console.log('sql', sql)
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
        // const cb = ((st, err) => {
        //     // console.log('row', err, rows)
        //     if (err) {
        //         reject(err)
        //     }
        //     // console.log(row.id + ": " + row.info);

        //     // list.push(row)
        //     resolve(st)
        // }) as any
        // hdb.run(sql, [], cb)
        // resolve(list)
    })
}

function _createMssqlConnect(params) {
    const { host, password, port, user, test } = params

    return new Promise((resolve, reject) => {
        var config = {
            server: host,
            options: {
                database: 'MidDB',
                port,
                // trustServerCertificate: true,
                // encrypted: false,
                encrypt: false
            },
            authentication: {
                type: "default",
                options: {
                    userName: user,
                    password: password,
                }
            }
        };
    
        var connection = new Connection(config);
    
        // Setup event handler when the connection is established. 
        connection.on('connect', function (err) {
            if (err) {
                console.log('Error: ', err)
            }
            console.log('success',)
            // If no error, then good to go...
            resolve(connection)
        });
    
        // Initialize the connection.
        connection.connect();
    })
}

function _mssqlExec(connection, sql): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const rows = []

        const request = new Request(sql, function (err, rowCount) {
            if (err) {
                console.log(err);
                reject(err)
                return
            } else {
                resolve(rows)
                return
                // console.log(rowCount + ' rows');
            }
        });

        
    
        request.on('row', function (columns) {
            console.log('columns', columns)
            const obj = {}
            for (let col of columns) {
                obj[col.metadata.colName] = col.value
            }
            rows.push(obj)
            // columns [
            //     {
            //       value: 7,
            //       metadata: {
            //         userType: 0,
            //         flags: 8,
            //         type: [Object],
            //         collation: undefined,
            //         precision: undefined,
            //         scale: undefined,
            //         udtInfo: undefined,
            //         dataLength: undefined,
            //         schema: undefined,
            //         colName: 'FactoryId',
            //         tableName: undefined
            //       }
            //     },
            //     {
            //       value: 'bst',
            //       metadata: {
            //         userType: 0,
            //         flags: 8,
            //         type: [Object],
            //         collation: [Collation],
            //         precision: undefined,
            //         scale: undefined,
            //         udtInfo: undefined,
            //         dataLength: 40,
            //         schema: undefined,
            //         colName: 'FactoryName',
            //         tableName: undefined
            //       }
            //     },
            //   ]
            // columns.forEach(function (column) {
            //     console.log(column.value);
            // });
        });
    
        connection.execSql(request);
    })
}

function _mssqlExecArr(connection, sql): Promise<any> {
    return new Promise((resolve, reject) => {
        const rows = []
        const fields = []
        const request = new Request(sql, function (err, rowCount) {
            if (err) {
                console.log(err);
                reject(err)
                return
            } else {
                resolve({
                    results: rows,
                    fields,
                })
                return
                // console.log(rowCount + ' rows');
            }
        });

        request.on('row', function (columns) {
            console.log('columns', columns)
            if (rows.length == 0) {
                for (let col of columns) {
                    fields.push({
                        name: col.metadata.colName,
                    })
                }
            }
            const obj = []
            for (let col of columns) {
                obj.push(col.value)
            }
            rows.push(obj)
            // columns [
            //     {
            //       value: 7,
            //       metadata: {
            //         userType: 0,
            //         flags: 8,
            //         type: [Object],
            //         collation: undefined,
            //         precision: undefined,
            //         scale: undefined,
            //         udtInfo: undefined,
            //         dataLength: undefined,
            //         schema: undefined,
            //         colName: 'FactoryId',
            //         tableName: undefined
            //       }
            //     },
            //     {
            //       value: 'bst',
            //       metadata: {
            //         userType: 0,
            //         flags: 8,
            //         type: [Object],
            //         collation: [Collation],
            //         precision: undefined,
            //         scale: undefined,
            //         udtInfo: undefined,
            //         dataLength: 40,
            //         schema: undefined,
            //         colName: 'FactoryName',
            //         tableName: undefined
            //       }
            //     },
            //   ]
            // columns.forEach(function (column) {
            //     console.log(column.value);
            // });
        });
    
        connection.execSql(request);
    })
}



// const chalk = require('chalk')

// import('chalk').then(m => [
//     console.log('chalk', chalk)
// ])
// console.log(chalk.green('green'))
class ParamException extends Error { }

function hasValue(value) {
    return !!value || value === 0
}

let g_connections = {
    alasql: {
        type: 'alasql',
    }
}

let g_sqls: any[] = []


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

let sqlDbFilePath = path.resolve(appFolder, 'sqls.json')
if (!fs.existsSync(sqlDbFilePath)) {
    // console.log('创建目录')
    // fs.mkdirSync(yunserFolder)
    fs.writeFileSync(sqlDbFilePath, '', 'utf8')
}

let sqlContentText = fs.readFileSync(sqlDbFilePath, 'utf-8')
if (sqlContentText) {
    g_sqls = JSON.parse(sqlContentText)
}

let historyDbFilePath = path.resolve(appFolder, 'history.json')
if (!fs.existsSync(historyDbFilePath)) {
    // console.log('创建目录')
    // fs.mkdirSync(yunserFolder)
    fs.writeFileSync(historyDbFilePath, '', 'utf8')
}

let sshConnectionFilePath = path.resolve(appFolder, 'mysql.connection.json')
if (!fs.existsSync(sshConnectionFilePath)) {
    // console.log('创建目录')
    // fs.mkdirSync(yunserFolder)
    fs.writeFileSync(sshConnectionFilePath, '[]', 'utf8')
}

let jsonDBPath = path.resolve(appFolder, 'jsondb.json')
if (!fs.existsSync(jsonDBPath)) {
    // console.log('创建目录')
    // fs.mkdirSync(yunserFolder)
    fs.writeFileSync(jsonDBPath, '[]', 'utf8')
}

let g_hostories: any[] = [
    // {
    //     sql: '122',
    // }
]
let historyContentText = fs.readFileSync(historyDbFilePath, 'utf-8')
if (historyContentText) {
    g_hostories = JSON.parse(historyContentText)
}

function saveSqlData() {
    fs.writeFileSync(sqlDbFilePath, JSON.stringify(g_sqls, null, 4), 'utf-8')
}

function saveHistorylData() {
    fs.writeFileSync(historyDbFilePath, JSON.stringify(g_hostories, null, 4), 'utf-8')
}


// query.error.code undefined
// query.error Error: Can't add new command when connection is in closed state

// query.error.code EADDRNOTAVAIL
// query.error Error: read EADDRNOTAVAIL
//     at TCP.onStreamRead (internal/stream_base_commons.js:209:20) {
//   errno: -49,
//   code: 'EADDRNOTAVAIL',
//   syscall: 'read',
//   fatal: true
// }


export class MySqlService {

    async index() {
        return 'mysql index'
    }

    async _httpConnect(options, agentUrl, httpProxyToken) {
        const res = await axios.post(`${agentUrl}/mysql/connect`, options, {
            headers: {
                'Authorization': httpProxyToken || '',
            }
        })
        console.log('res', res.data)
        return {
            rawConnectionId: res.data.id,
        }
    }

    async _mssqlConnect(params) {
        // const { host, password, port, user, test } = params
        return _createMssqlConnect(params)
    }

    async _sqliteConnect(params) {
        const { databasePath, password, port, user, test } = params
        const hdb = new sqlite3.Database(databasePath)
        await dbQueryList(hdb, 'SELECT 1 + 1')
        return hdb
    }

    async _alasqlConnect(params) {
        const { tables = [] } = params
        // const dataId = uid(8)
        const dataId = moment().format('HHmmss')
        // const tableName = `t${dataId}`
        for (let table of tables) {
            const tableName = table.name
            alasql(`CREATE TABLE IF NOT EXISTS \`${tableName}\``)
            alasql.tables[tableName].data = table.rows || []
        }
        return {
            dataId,
        }
    }

    async _jsondbConnect(params) {
        const {  } = params
        // const dataId = uid(8)
        // const dataId = moment().format('HHmmss')
        // const tableName = `t${dataId}`
        // for (let table of tables) {
        //     const tableName = table.name
        //     alasql(`CREATE TABLE IF NOT EXISTS \`${tableName}\``)
        //     alasql.tables[tableName].data = table.rows || []
        // }
        return {
            isJsonDb: true,
            // dataId,
        }
    }

    async _postgresConnect(params) {
        const { host, password, port, user, test } = params
        const client = new Client({
            user,
            // database?: string | undefined;
            password,
            port,
            host,
            // keepAlive?: boolean | undefined;
            // statement_timeout?: false | number | undefined;
            // query_timeout?: number | undefined;
        })
        await client.connect()
        return client
    }

    async _mysqlConnect(params, connectionId) {
        // console.log('connect2', params)
        return new Promise((resolve, reject) => {
            let connection = createConnection({
                ...params,
                supportBigNumbers: true,
                bigNumberStrings: true,
            })
            connection.on('error', function (err) {

                console.error('db/on/error', err)
                console.error('err.code', err.code)
                // PROTOCOL_CONNECTION_LOST
                console.error('connectionId', connectionId)
                closeWebSocketByDbConnectionId(connectionId)
                // 这种错误还可以正常请求的，不清楚为什么
                // db on error Error: read ETIMEDOUT
                //     at TCP.onStreamRead (internal/stream_base_commons.js:209:20) {
                // errno: -60,
                // code: 'ETIMEDOUT',
                // syscall: 'read',
                // fatal: true
                // }

                // if(err.code === 'PROTOCOL_CONNECTION_LOST') {

                //     logger.error('db error执行重连:'+err.message)

                //     handleDisconnection()

                // } else {

                //     throw err

                // }

            })
            connection.connect(function (err) {
                if (err) {
                    console.error('error connecting: ' + err.stack)
                    reject(err)
                    return
                }
                // console.log('nonnect ok', connection)
                resolve(connection)
            })

        })
    }

    async connectionDatabases(body) {
        let { connectionId } = await this.connect(body)
        const sql = `SELECT * FROM \`information_schema\`.\`SCHEMATA\` LIMIT 20`
        // let id = uid(32)
        // g_connections[id] = {
        //     id,
        //     options: {},
        //     connection,
        //     createTime: new Date().getTime(),
        //     updateTime: new Date().getTime(),
        // }
        return await this.query(sql, {
            connectionId,
        })
    }

    async connectionCompareData(body) {
        const { db1Data, db2Data } = body

        const connections = (await this.connectionList()).list
        const getSchemaData = async (dbData) => {
            const { connectionId: _connectionId, schemaName } = dbData
            const _connection = connections.find(item => item.id == _connectionId)
            console.log('_connection', _connection)
            let { connectionId } = await this.connect(_connection)
            const tableSql = `SELECT * FROM \`information_schema\`.\`TABLES\` where TABLE_SCHEMA = '${schemaName}' and TABLE_TYPE = 'BASE TABLE'`
            const tables = await this.query(tableSql, {
                connectionId,
            })
            const colSql = `SELECT * FROM \`information_schema\`.\`COLUMNS\` where TABLE_SCHEMA = '${schemaName}'`
            const columns = await this.query(colSql, {
                connectionId,
            })
            return {
                tables,
                columns,
                ignoreTables: _connection.ignoreTables || [],
                connectionName: _connection.name,
                _connectionId: connectionId,
            }
        }
        return {
            db1Result: await getSchemaData(db1Data),
            db2Result: await getSchemaData(db2Data),
        }
    }

    async connect(body) {
        const { test, type = 'mysql', httpProxyUrl, httpProxyToken, ...options } = body
        const httpAgent = !!httpProxyUrl
        // console.log('options', options)
        const agentUrl = httpProxyUrl
        let connection
        let connectionId = uid(32)
        if (type == 'postgresql') {
            connection = await this._postgresConnect(options)
        }
        else if (type == 'alasql') {
            connection = await this._alasqlConnect(options)
        }
        else if (type == 'jsondb') {
            connection = await this._jsondbConnect(options)
        }
        else if (type == 'sqlite') {
            connection = await this._sqliteConnect(options)
        }
        else if (type == 'mssql') {
            connection = await this._mssqlConnect(options)
        }
        else if (httpAgent) {
            connection = await this._httpConnect(options, agentUrl, httpProxyToken)
        }
        else {
            connection = await this._mysqlConnect(options, connectionId)
        }
        if (test) {
            return {}
        }
        
        g_connections[connectionId] = {
            type,
            connectionId,
            httpAgent,
            agentUrl,
            httpProxyToken,
            options,
            connection,
            createTime: new Date().getTime(),
            updateTime: new Date().getTime(),
        }
        return {
            connectionId,
        }
    }

    async reconnect({ connectionId }) {
        // if (!connectionId) {
        //     throw new Error('No connection')
        // }
        // if (!g_connections[connectionId]) {
        //     throw new Error('ConnectionId not exits')
        // }
        // const { options } = g_connections[connectionId]
        // let connection = await this._connect2(options)
        // g_connections[connectionId].connection = connection
        // g_connections[connectionId].updateTime = new Date().getTime()
        // return {}
    }

    async query(sql: string, { connectionId }): Promise<Array<any>> {
        if (!g_connections[connectionId]) {
            console.log('g_connections', g_connections)
            throw new ParamException(`ConnectionId ${connectionId} not exits`)
        }
        const conn = g_connections[connectionId]
        if (conn.type == 'postgresql') {
            const client = conn.connection as Client
            const res = await client.query(sql, [])
            console.log('res', res)
            console.log('res.rows', res.rows)
            // console.log(res.rows[0].message) // Hello world!
            return res.rows
        }
        if (conn.type == 'sqlite') {
            const hdb = conn.connection as sqlite3.Database
            const result = await dbQueryList(hdb, sql)
            // console.log('res.rows', res.rows)
            // console.log(res.rows[0].message) // Hello world!
            return result
        }
        if (conn.httpAgent) {
            // axios.post
            // console.log('??', {
            //     connectionId: conn.connection.rawConnectionId,
            //     sql,
            // })
            const res = await axios.post(`${conn.agentUrl}/mysql/execSqlSimple`, {
                connectionId: conn.connection.rawConnectionId,
                sql,
            })
            // console.log('res', res.data)
            return res.data

        }
        return new Promise((resolve, reject) => {
            conn.connection.query({
                sql,
                // rowsAsArray: true,
            }, function (error, results, fields) {
                if (error) {
                    console.log('query.error.code', error.code)
                    console.log('query.error', error)
                    reject(error)
                }
                // console.log('results', results)
                resolve(results)
            })
        })
    }

    async queryArr(sql: string, { connectionId }): Promise<any> {
        const conn = g_connections[connectionId]
        if (!conn) {
            throw new ParamException('ConnectionId not exits')
        }
        if (conn.type == 'postgresql') {
            const client = conn.connection as Client
            const res = await client.query({
                text: sql,
                rowMode: 'array'
            })
            console.log('pg/res', res)
            // fields
            // [
            //     {
            //         name: 'id',
            //         tableID: 16397,
            //         columnID: 1,
            //         dataTypeID: 1043,
            //         dataTypeSize: -1,
            //         dataTypeModifier: 36,
            //         format: 'text'
            //     }
            // ]
            return {
                results: res.rows,
                fields: res.fields,
            }
        }
        else if (conn.type == 'mssql') {
            const connection = conn.connection
            return await _mssqlExecArr(connection, sql)
        }
        else if (conn.type == 'sqlite') {
            const hdb = conn.connection as sqlite3.Database
            const result = await dbQueryList(hdb, sql)
            console.log('result', result)
            const fields = []
            let results = []
            if (result && result.length) {
                const item0 = result[0]
                for (let fieldName in item0) {
                    fields.push({
                        name: fieldName,
                    })
                }
                results = result.map(obj => {
                    const arr = []
                    for (let field of fields) {
                        arr.push(obj[field.name])
                    }
                    return arr
                })
            }
            return {
                results,
                fields,
            }
        }
        else if (conn.type == 'alasql') {
            // const alaConn = conn.connection
            const result = alasql(sql)
            console.log('alasql/result', result)
            const fields = []
            let results = []
            if (result && result.length) {
                const item0 = result[0]
                for (let fieldName in item0) {
                    fields.push({
                        name: fieldName,
                    })
                }
                results = result.map(obj => {
                    const arr = []
                    for (let field of fields) {
                        arr.push(obj[field.name])
                    }
                    return arr
                })
            }
            return {
                results,
                fields,
            }
        }
        if (conn.httpAgent) {
            // axios.post
            // console.log('??', {
            //     connectionId: conn.connection.rawConnectionId,
            //     sql,
            // })
            const res = await axios.post(`${conn.agentUrl}/mysql/execSql`, {
                connectionId: conn.connection.rawConnectionId,
                sql,
            })
            // console.log('res', res.data)
            return res.data

        }
        return new Promise((resolve, reject) => {
            conn.connection.query({
                sql,
                rowsAsArray: true,
            }, function (error, results, fields, c) {
                // console.log('query.c', c)
                if (error) {
                    console.log('query.error', error)
                    reject(error)
                }
                // console.log('results', results)
                resolve({ results, fields })
            })
        })
    }

    async databases(params) {
        if (!params.connectionId) {
            throw new ParamException('Need connectionId')
        }
        const conn = g_connections[params.connectionId]
        let sql
        if (conn.type == 'sqlite') {
            return [
                {
                    $_name: 'main',
                }
            ]
        }
        else if (conn.type == 'alasql') {
            const res = alasql(`show databases`)
            // res:
            // [ { databaseid: 'alasql' }, { databaseid: 'dbo' } ]
            return res.map(item => {
                return {
                    $_name: item.databaseid,
                }
            })
        }
        else if (conn.type == 'jsondb') {
            // const res = alasql(`show databases`)
            // res:
            // [ { databaseid: 'alasql' }, { databaseid: 'dbo' } ]
            const content = fs.readFileSync(jsonDBPath, 'utf-8')
            const list = JSON.parse(content)
            return list.map(item => {
                return {
                    $_name: item.name,
                }
            })
        }
        else if (conn.type == 'mssql') {
            const connection = conn.connection
            const sql = `SELECT Name from Master..SysDatabases ORDER BY Name`
            const results = await _mssqlExec(connection, sql)
            return results.map(item => {
                return {
                    ...item,
                    $_name: item.Name,
                }
            })
        }

        if (conn.type == 'postgresql') {
            sql = 'select * from information_schema.schemata'
            // throw new ParamException('postgres not support')
        }
        else {
            sql = 'SELECT * FROM `information_schema`.`SCHEMATA`'
        }

        const result = await this.query(sql, {
            connectionId: params.connectionId,
        })
        return result.map(item => {
            return {
                ...item,
                $_name: item.SCHEMA_NAME || item.schema_name,
            }
        })
    }

    async taskDetail(params) {
        const { id } = params
        return {
            task: g_taskMap[id] || null,
        }
    }

    async exportDataDownload(params) {
        const { taskId } = params
        const task = g_taskMap[taskId]
        return fs.readFileSync(task.path)
    }

    async exportTableData(params) {
        if (!params.connectionId) {
            throw new ParamException('Need connectionId')
        }
        const { dbName, tableName, pageSize = 1000 } = params
        const sql = `SELECT COUNT(*) FROM \`${dbName}\`.\`${tableName}\``

        const countResult = await this.query(sql, {
            connectionId: params.connectionId,
        })
        const total = countResult[0]['COUNT(*)']

        const taskId = uid(32)

        g_taskMap[taskId] = {
            total,
            current: 0,
            status: 'ing',
            id: taskId,
        }

        this._exportData({
            connectionId: params.connectionId,
            dbName,
            tableName,
            total,
            taskId,
            pageSize,
        })

        return {
            taskId,
        }
    }

    async _exportData({ connectionId, dbName, tableName, total, taskId, pageSize = 1000 }) {
        const totalPage = Math.ceil(total / pageSize)
        
        const task = g_taskMap[taskId]

        const colSql = `select * from \`information_schema\`.\`COLUMNS\` where TABLE_SCHEMA = '${dbName}' AND TABLE_NAME = '${tableName}' ORDER BY ORDINAL_POSITION ASC`
        const columns = await this.query(colSql, {
            connectionId,
        })

        const exportSqls = []
        for (let page = 0; page < totalPage; page++) {
            const offset = page * pageSize
            const dataSql = `SELECT * FROM \`${dbName}\`.\`${tableName}\` LIMIT ${pageSize} OFFSET ${offset}`

            const dataList = await this.query(dataSql, {
                connectionId,
            })

            for (let data of dataList) {
                const fields = []
                const values = []
                for (let column of columns) {
                    fields.push(column.COLUMN_NAME)
                    values.push(data[column.COLUMN_NAME])
                }
                
                const fields_sql = fields.map(field => `\`${field}\``).join(', ')
                const values_sql = values.map(value => getValue(value)).join(', ')
                const exportSql = `INSERT INTO \`${dbName}\`.\`${tableName}\` (${fields_sql}) VALUES (${values_sql});`
                exportSqls.push(exportSql)
            }

            if (task) {
                task.current += pageSize
            }
            // await sleep(2 * 1000)
        }

        const allSql = exportSqls.join('\n') + '\n'

        // TODO
        const tmpPath = nodePath.join(appFolder, 'tmp.sql')
        fs.writeFileSync(tmpPath, allSql, 'utf-8')

        if (task) {
            task.current = total
            task.status = 'success'
            task.path = tmpPath
        }
    }

    async execSqlSimple(params) {
        if (!params.connectionId) {
            throw new ParamException('Need connectionId')
        }
        // const { dbName } = params
        return await this.query(params.sql, {
            connectionId: params.connectionId,
        })
    }

    async schemas(params) {
        if (!params.connectionId) {
            throw new ParamException('Need connectionId')
        }
        const conn = g_connections[params.connectionId]
        if (conn.type == 'mssql') {
            const connection = conn.connection
            const { dbName } = params
            // XType='U':表示所有用户表;
            // XType='S':表示所有系统表;
            const sql = `select * from sys.schemas`
            const results = await _mssqlExec(connection, sql)
            return results.map(item => {
                return {
                    ...item,
                    $_schema_db: dbName,
                    $_schema_name: item.name,
                }
            })
        }
    }

    async tables(params) {
        const { dbName, schemaName } = params
        if (!params.connectionId) {
            throw new ParamException('Need connectionId')
        }
        const conn = g_connections[params.connectionId]
        if (conn.type == 'sqlite') {
            const hdb = conn.connection as sqlite3.Database
            const sql = "SELECT * from sqlite_master WHERE type = 'table'"
            const result = await dbQueryList(hdb, sql)
            // console.log('res.rows', res.rows)
            // console.log(res.rows[0].message) // Hello world!
            return result.map(item => {
                return {
                    $table_schema: 'main',
                    $_table_name: item.name,
                }
            })
        }
        else if (conn.type == 'alasql') {
            const res = alasql(`show tables from ${dbName}`)
            // res:
            // [ { tableid: 't2c477ea3' } ]
            return res.map(item => {
                return {
                    $table_schema: dbName,
                    $_table_name: item.tableid,
                }
            })
        }
        else if (conn.type == 'jsondb') {
            // const res = alasql(`show tables from ${dbName}`)
            // res:
            // [ { tableid: 't2c477ea3' } ]
            const content = fs.readFileSync(jsonDBPath, 'utf-8')
            const list = JSON.parse(content)
            const db = list.find(item => item.name == dbName)
            return db.tables.map(item => {
                return {
                    $table_schema: db.name,
                    $_table_name: item.name,
                }
            })
        }
        else if (conn.type == 'mssql') {
            const connection = conn.connection
            const { dbName } = params
            // XType='U':表示所有用户表;
            // XType='S':表示所有系统表;
            const sql = `SELECT Name from ${dbName}..SysObjects Where XType='U' ORDER BY Name`
            const results = await _mssqlExec(connection, sql)
            return results.map(item => {
                return {
                    ...item,
                    $table_schema: dbName,
                    $_table_name: item.Name,
                    $__schemaName: schemaName,
                }
            })
        }

        // const { dbName } = params
        let sql = `SELECT * FROM information_schema.tables WHERE TABLE_SCHEMA = '${dbName}'`
        const results = await this.query(sql, {
            connectionId: params.connectionId,
        })
        return results.map(item => {
            return {
                ...item,
                $table_schema: item.TABLE_SCHEMA || item.table_schema,
                $_table_name: item.TABLE_NAME || item.table_name,
            }
        })
    }

    // async tableNames() {
    //     const { ctx } = this
    //     const { name } = ctx.params
    //     let sql = `SELECT * FROM information_schema.tables WHERE TABLE_SCHEMA = '${name}'`
    //     ctx.body = (await this.query(sql)).map(item => item.TABLE_NAME)
    // }

    async tableDetailOld(params) {
        if (!params.connectionId) {
            throw new ParamException('Need connectionId')
        }

        const { dbName, tableName } = params
        let sql = `describe ${dbName}.${tableName};`
        return await this.query(sql, {
            connectionId: params.connectionId,
        })
    }

    async historyList(body) {
        const { page = 1, pageSize = 10, keyword } = body
        let list = g_hostories
        if (keyword) {
            // list = g_sqls.filter(item => item.name.toLowerCase().includes(keyword.toLowerCase()))
        }
        return {
            total: list.length,
            list: list.slice((page - 1) * pageSize, page * pageSize),
        }
    }

    async historyClear(body) {
        g_hostories = []
        saveHistorylData()
    }

    async sqlList(body: any = {}) {
        const { page = 1, pageSize = 10, keyword } = body
        let list = g_sqls
        if (keyword) {
            list = g_sqls.filter(item => item.name.toLowerCase().includes(keyword.toLowerCase()))
        }
        return {
            total: list.length,
            list: list.slice((page - 1) * pageSize, page * pageSize),
        }
    }

    async sqlCreate(body) {
        g_sqls.unshift({
            ...body,
            id: uid(32),
        })
        saveSqlData()
    }

    async sqlRemove(body) {
        const idx = g_sqls.findIndex(item => item.id == body.id)
        if (idx != -1) {
            g_sqls.splice(idx, 1)
        }
        saveSqlData()
    }

    async tableDetail(params) {
        if (!params.connectionId) {
            throw new ParamException('Need connectionId')
        }
        const { dbName, tableName } = params
        // let sql = `describe ${dbName}.${tableName};`
        // let sql = 
        const conn = g_connections[params.connectionId]
        

        
        let tableSql
        let table
        if (conn.type == 'sqlite') {
            tableSql = `SELECT * from sqlite_master
WHERE type = 'table'
AND name='${tableName}'
`
// tableSql
            const tables = await this.query(tableSql, {
                connectionId: params.connectionId,
            })
            table = {
                TABLE_NAME: tables[0].name,
                ...tables[0],
            }
        }
        else {
            tableSql = `SELECT * FROM information_schema.tables 
WHERE TABLE_SCHEMA = '${dbName}'
AND TABLE_NAME = '${tableName}'`
            const tables = await this.query(tableSql, {
                connectionId: params.connectionId,
            })
            table = tables[0]
        }
        // console.log('tableSql', tableSql)

        // sqlite
        // 记录项目的类型，如table、index、view、trigger
        
        let result = {
            table,
            columns: [],
            indexes: [],
            partitions: [],
            triggers: [],
        }
        if (conn.type == 'sqlite') {
            const cols = await this.query(`PRAGMA table_info(${tableName})`, {
                connectionId: params.connectionId,
            })
            // [
            //     "cid": 0,
            //     "name": "id",
            //     "type": "TEXT",
            //     "notnull": 1,
            //     "dflt_value": null,
            //     "pk": 1
            // ]
            result.columns = cols.map(item => {
                return {
                    // CHARACTER_MAXIMUM_LENGTH
                    // CHARACTER_OCTET_LENGTH
                    // CHARACTER_SET_NAME
                    // COLLATION_NAME
                    COLUMN_KEY: item.pk == 1 ? 'PRI' : 'NOT_PRI',
                    COLUMN_NAME: item.name,
                    COLUMN_TYPE: item.type,
                    COLUMN_COMMENT: '',
                    COLUMN_DEFAULT: item.dflt_value,
                    IS_NULLABLE: item.notnull == 1 ? 'NO' : 'YES',
                    'x-raw': item,
                    // DATA_TYPE
                    // DATETIME_PRECISION
                    // EXTRA
                    // GENERATION_EXPRESSION
                    // NUMERIC_PRECISION
                    // NUMERIC_SCALE
                    // ORDINAL_POSITION
                    // PRIVILEGES
                    // TABLE_CATALOG
                    // TABLE_NAME
                    // TABLE_SCHEMA
                }
            })

            const indexes = await this.query(`select * from sqlite_master where type='index' AND tbl_name = '${tableName}'`, {
                connectionId: params.connectionId,
            })
            console.log('indexes', indexes)
            // [
            //     {
            //         "type": "index",
            //         "name": "idx_db_time",
            //         "tbl_name": "redis_history",
            //         "rootpage": 7,
            //         "sql": "CREATE INDEX \"idx_db_time\"\nON \"redis_history\" (\n  \"db\",\n  \"create_time\"\n)"
            //     }
            // ]
            result.indexes = indexes.map(item => {
                return {
                    INDEX_NAME: item.name,
                    INDEX_COMMENT: '',
                    NON_UNIQUE: 1,
                    'x-raw': item,
                }
            })
        }
        else if (conn.type == 'postgresql') {
            let indexSql = `SELECT *
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = '${dbName}'
	and TABLE_NAME = '${tableName}'`

            const columns = await this.query(`SELECT *
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = '${dbName}'
            and TABLE_NAME = '${tableName}'`, {
                                connectionId: params.connectionId,
                            })
            result = {
                ...result,
                columns: columns.map(item => {
                    return {
                        // COLUMN_KEY: item.pk == 1 ? 'PRI' : 'NOT_PRI',
                        COLUMN_NAME: item.column_name,
                        COLUMN_TYPE: item.data_type,
                        COLUMN_COMMENT: '',
                        COLUMN_DEFAULT: item.column_default,
                        IS_NULLABLE: item.is_nullable,
                        positon: item.ordinal_position,
                        'x-raw': item,
                    }
                }),
                indexes: conn.type == 'postgresql' ? [] : await this.query(indexSql, {
                    connectionId: params.connectionId,
                }),
                triggers: await this.query(`SELECT *
    FROM information_schema.TRIGGERS
    WHERE EVENT_OBJECT_SCHEMA = '${dbName}'
        and EVENT_OBJECT_TABLE = '${tableName}'`, {
                    connectionId: params.connectionId,
                }),
            }
        }
        else {
            let indexSql = `SELECT *
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = '${dbName}'
	and TABLE_NAME = '${tableName}'`


            result = {
                ...result,
                columns: await this.query(`SELECT *
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = '${dbName}'
and TABLE_NAME = '${tableName}'`, {
                    connectionId: params.connectionId,
                }),
                indexes: conn.type == 'postgresql' ? [] : await this.query(indexSql, {
                    connectionId: params.connectionId,
                }),
                partitions: conn.type == 'postgresql' ? [] : await this.query(`SELECT *
    FROM information_schema.PARTITIONS
    WHERE TABLE_SCHEMA = '${dbName}'
        and TABLE_NAME = '${tableName}'`, {
                    connectionId: params.connectionId,
                }),
                triggers: await this.query(`SELECT *
    FROM information_schema.TRIGGERS
    WHERE EVENT_OBJECT_SCHEMA = '${dbName}'
        and EVENT_OBJECT_TABLE = '${tableName}'`, {
                    connectionId: params.connectionId,
                }),
            }
        }
        return result
    }

    async execSql(params) {
        if (!params.connectionId) {
            throw new ParamException('Need connectionId')
        }
        let {
            sql,
            tableName,
            dbName,
            logger = false,
        } = params
        let results
        let fields
        let time: number | null = null
        // console.log('execSql', sql)
        try {
            const startTime = new Date()
            const ret = await this.queryArr(sql, {
                connectionId: params.connectionId,
            })
            time = new Date().getTime() - startTime.getTime()
            results = ret.results
            fields = ret.fields
        }
        catch (err) {
            if (logger) {
                g_hostories.unshift({
                    id: uid(32),
                    sql,
                    schema: dbName,
                    time: new Date().toISOString(),
                    status: 'fail',
                    rows: 0,
                    execTime: time,
                    message: err.message || 'Unknown Error',
                })
                saveHistorylData()
            }
            throw new Error(err.message)
        }

        let newResults: [][] = []
        let result = null
        let rows = null
        if (Array.isArray(results)) {
            rows = results.length
            newResults = results.map(row => {

                return row.map(cell => {
                    if (typeof cell == 'string' || typeof cell == 'number' || cell == null) {
                        return cell
                        // console.log('is-string')
                    }
                    else if (cell instanceof Date) {
                        return moment(cell).format('YYYY-MM-DD HH:mm:ss')
                        // console.log('is-string')
                    }
                    else if (typeof cell == 'object') {
                        return JSON.stringify(cell)
                    }
                    else {
                        // console.log('not-string')
                        console.warn('typeof cell', typeof cell)
                        // else if (typeof key == 'object') {
                        return JSON.stringify(cell)
                    }
                })
                // const newObj: any = {}
                // for (let key of item) {
                //     // console.log('key', key)
                // }
                // // console.log('newObj', newObj)
                // return newObj
            })
        }
        else {
            // changedRows 返回更新了多少行(表中有几条数据中的字段值发生变化)
            // affectedRows返回知足where条件影响的行
            if (results && hasValue(results.changedRows)) {
                rows = results.changedRows
            }
            fields = []
            result = results
        }

        const ret = {
            result,
            results: newResults,
            fields,
            time,
            columns: [],
        }
        if (dbName && tableName) {
            // 防止前端解析有问题，比如 tableName 不存在，故捕获异常
            try {
                ret.columns = await this.query(`SELECT *
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = '${dbName}'
        and TABLE_NAME = '${tableName}'`, {
                    connectionId: params.connectionId,
                })
            }
            catch (err) {
                console.error(err)
            }
        }

        if (logger) {
            g_hostories.unshift({
                id: uid(32),
                sql,
                schema: dbName,
                time: new Date().toISOString(),
                status: 'success',
                rows,
                execTime: time,
                message: '',
            })
            saveHistorylData()
        }
        return ret
    }

    async users() {
        // const { ctx } = this
        // await this.connect()
        // ctx.body = await this.query("describe user;")
        // ctx.body = await this.query("SELECT * FROM target.user;")
    }

    async connectionList(body = {}) {
        const content = fs.readFileSync(sshConnectionFilePath, 'utf-8')
        return {
            list: JSON.parse(content)
        }
    }

    async connectionEdit(body) {
        const { id, data } = body

        const content = fs.readFileSync(sshConnectionFilePath, 'utf-8')
        const list = JSON.parse(content)
        const idx = list.findIndex(_item => _item.id == id)
        list[idx] = {
            ...list[idx],
            ...data,
        }
        console.log('list', list)
        fs.writeFileSync(sshConnectionFilePath, JSON.stringify(list, null, 4), 'utf-8')
        return {}
    }

    async connectionCreate(body) {
        // const { id, data } = body

        const content = fs.readFileSync(sshConnectionFilePath, 'utf-8')
        const list = JSON.parse(content)
        list.unshift({
            ...body,
            id: uid(32),
        })
        fs.writeFileSync(sshConnectionFilePath, JSON.stringify(list, null, 4), 'utf-8')
        return {}
    }

    async connectionDelete(body) {
        const { id } = body
        const content = fs.readFileSync(sshConnectionFilePath, 'utf-8')
        const list = JSON.parse(content)
        const newList = list.filter(item => item.id != id)
        console.log('id', id)
        console.log('newList', newList)
        fs.writeFileSync(sshConnectionFilePath, JSON.stringify(newList, null, 4), 'utf-8')
        return {}
    }

    async compare(body) {
        const content = fs.readFileSync('/Users/yunser/app/dms-projects/dms-cli/_mysql_compare.json', 'utf-8')
        return JSON.parse(content)
    }
}
