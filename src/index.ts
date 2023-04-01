#! /usr/bin/env node

// import * as path from 'path';


const os = require('os');
import * as fs from 'fs'
import * as path from 'path'
// const path = require('path');
const open = require('open');
// const cp = require('child_process')
const portfinder = require('portfinder');
// const qrcode = require('qrcode-terminal');
// const handler = require('serve-handler')
// const http = require('http')
const commander = require('commander')
// const publicIp = require('public-ip');
// const ncp = require("copy-paste");
import { createServer } from './server'



const content = fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8')
const pkg = JSON.parse(content)
// console.log('pkg', pkg)
const verson = pkg.version

commander
    .version('v' + verson)
    .description('MySQL manager.')

commander
    .option('-v, --version', 'show version')
//     .option('-l, --list', 'show all cmd')
//     .option('-a, --add', 'Add bbq sauce')
//     .option('-c, --cheese [type]', 'Add the specified type of cheese [marble]', 'marble')
// console.log('demo-cli', process.cwd())

commander
    .helpOption('-h, --HELP')

// program.parse(process.argv);


///获取本机ip///
function getIPAdress() {
    let interfaces = os.networkInterfaces();
    for (let devName in interfaces) {
        var iface = interfaces[devName];
        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
}


// console.log('cwd', process.cwd())
// console.log('process.argv /', process.argv)


// commander.option('-o, --open', 'Open url in browser.')
// commander.option('-pu, --public', 'Use public ip.')

commander
    .command('web')
    // .argument('-api', 'Use as API')
    // .argument('<username>', 'user to login')
    // .option('-p, --port <number>', 'Port number')
    .option('-o, --open', 'Open in browser.')
    .description('Start Web service.')
    .action(async function (folder) {
        const options = commander.opts();
        // console.log('options', options)
        // console.log('folder', folder)
        // const publicPath = path.resolve(process.cwd(), folder || '.')
        // console.log(`share path: ${publicPath}`)

        const opts = this.opts()
        // console.log('opts', opts)
        let port = opts.port
        if (!port) {
            port = await portfinder.getPortPromise()
        }

        // console.log('port: ' + port)
            // .then((port) => {
            //     //
            //     // `port` is guaranteed to be a free port
            //     // in this scope.
            //     //
            // })
            // .catch((err) => {
            //     //
            //     // Could not get a free port, `err` contains the reason.
            //     //
            // });

        // const ipv4 = await publicIp.v4() 
        // console.log('ipv4', ipv4)
        
        // let myHost
        // if (options.public) {
        //     myHost = await publicIp.v4() 
        // } else {
        //     myHost = getIPAdress();
        // }
        
        // console.log('myHost', myHost)
        // const url = `http://${myHost}:${port}`
        // console.log(`share url: ${url} （local, copied）`)
        
        // const _publicIp = await publicIp.v4() 
        // const publicUrl = `http://${_publicIp}:${port}`
        // console.log(`share url: ${publicUrl} （network）`)
        
        // ncp.copy(url, function () {
        //       // complete...
        // })

        // http-server
        // cp.exec(`serve -p ${port}`, {  }, function(err, stdout, stderr){
        //     console.log(iconv.decode(new Buffer(stdout, binaryEncoding), encoding), "error"+iconv.decode(new Buffer(stderr, binaryEncoding), encoding));
        // });
        
    // console.log('process.argv /', process.argv)


        const apiPort = 10086
        createServer({
            port: apiPort,
            // rootPath: publicPath,
        })
        const url = `http://localhost:${apiPort}`
        console.log(url)

        // console.log('You can scan the QR code with your mobile phone.')
        // qrcode.generate(url)



        // cp.exec(`start ${url}`)
        // console.log('?', `start ${url}`)
        if (opts.open) {
            open(url)
        }
    })

// commander
//     .command('text <text>')
//     .description('Text to QR code.')
//     .action(async (text) => {
//         // console.log('You can scan the QR code with your mobile phone.')
//         qrcode.generate(text)
//     })

// commander
//     .command('server')
//     .description('Create a share server.')
//     .action(async () => {
//         // console.log('You can scan the QR code with your mobile phone.')
//         // qrcode.generate(text)
//         let myHost
//         myHost = getIPAdress();
//         // if (options.public) {
//         //     myHost = await publicIp.v4() 
//         // } else {
//         // }
//         const port = await portfinder.getPortPromise()
//         // console.log('myHost', myHost)
//         const url = `http://${myHost}:${port}`
//         console.log(`server url: ${url} （local, copied）`)
        
//         const _publicIp = await publicIp.v4() 
//         const publicUrl = `http://${_publicIp}:${port}`
//         console.log(`share url: ${publicUrl} （network）`)
        
//         createServer({
//             port,
//         })

//         qrcode.generate(url)

//         // ncp.copy(url, function () {
//         //       // complete...
//         // })

//         // http-server
//         // cp.exec(`serve -p ${port}`, {  }, function(err, stdout, stderr){
//         //     console.log(iconv.decode(new Buffer(stdout, binaryEncoding), encoding), "error"+iconv.decode(new Buffer(stderr, binaryEncoding), encoding));
//         // });
        
//     // console.log('process.argv /', process.argv)

//         // const server = http.createServer(async (request, response) => {
//         //     // You pass two more arguments for config and middleware
//         //     // More details here: https://github.com/vercel/serve-handler#options
//         //     return await handler(request, response, {
//         //         public: publicPath,
//         //     });
//         // })
        
//     })

commander.parse(process.argv)
