import { simpleGit, ResetMode, SimpleGit } from 'simple-git'
import { uid } from "uid";
import * as fs from 'fs'
import * as mkdirp from 'mkdirp'
import { exec } from "child_process";
import * as path from 'path'

function localExec(cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
            console.log('err', err)
            if (err) {
                reject(err)
                return
            }
            // console.log('stdout', stdout)
            resolve(stdout)
        })
    })
}

// import * as sqlite3 from 'sqlite3'
// import moment = require("moment");
// import * as cp from 'child-process'
// const cp = require('child-process');
// console.log('cp', cp)
// var exec = require('child-process-promise').exec;

// const client = sqlite3.verbose()

// const db = new client.Database(path.resolve(__dirname, 'db/tester.db'))

let g_gis = {
    
}

function objectSet(obj) {
    const newObj = {}
    for (let key in obj) {
        if (obj[key] != undefined) {
            newObj[key] = obj[key]
        }
    }
    return newObj
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

let gitDbFilePath = path.resolve(appFolder, 'git.projects.json')
if (!fs.existsSync(gitDbFilePath)) {
    // console.log('创建目录')
    // fs.mkdirSync(yunserFolder)
    fs.writeFileSync(gitDbFilePath, '[]', 'utf8')
}

let gitSettingFilePath = path.resolve(appFolder, 'git.settings.json')
if (!fs.existsSync(gitSettingFilePath)) {
    // console.log('创建目录')
    // fs.mkdirSync(yunserFolder)
    fs.writeFileSync(gitSettingFilePath, '{}', 'utf8')
}



const folderPath = '/Users/yunser/app/dms-new'

export class GitService {

    async home(body) {
        return 'git home'
    }

    async version(body) {
        return {
            version: await simpleGit().version(),
        }
    }

    async projectInfo(body) {
        const { projectPath  } = body

        return {
            name: 'dms-new',
            filePath: folderPath
        }
    }

    async commit(body) {
        const { projectPath, message, amend = false,
            pushRemote = false,
            remoteName,
            branchName } = body
        // console.log('files', files)
        let opts = {}
        if (amend) {
            opts['--amend'] = true
        }
        const git = await this.getClient(projectPath)
        // await git.commit(message, [], opts)
        // return {
        //     commands: [
        //         {
        //             id: uid(32),
        //             command: `git commit -m '${message}'`,
        //         }
        //     ]
        // }
        const commands = ['commit', '-m', message]
        if (amend) {
            commands.push('--amend')
        }
        const ret = await this._command(git, commands)

        if (pushRemote) {
            await this._command(git, ['push', '-v', remoteName, `refs/heads/${branchName}:refs/heads/${branchName}`])
        }
        return ret
    }

    async reset(body) {
        const { projectPath, files } = body
        // console.log('files', files)
        const git = await this.getClient(projectPath)
        // await git.reset(ResetMode.MIXED, files)
        // return {}
        return await this._command(git, ['reset', 'HEAD', ...files])
    }

    async add(body) {
        const { projectPath, files } = body
        // console.log('files', files)
        const git = await this.getClient(projectPath)
        // await git.add(files)
        return await this._command(git, ['add', ...files])
    }

    async _command(git, commands) {
        const res = await git.raw(commands)
        return {
            commands: [
                {
                    id: uid(32),
                    command: 'git ' + commands.join(' '),
                    res,
                }
            ]
        }
    }

    async diff(body) {
        const { projectPath, file, cached } = body
        // console.log('files', files)
        const git = await this.getClient(projectPath)
        // const diff = await git.diffSummary(file)
        let params
        if (cached) {
            params = ['--cached', '--', file]
        }
        else {
            params = ['--', file]
        }
        const diff = await git.diff(params)
        // console.log('diff', diff)
        return {
            commands: [
                {
                    id: uid(32),
                    command: 'git diff ' + params.join(' '),
                }
            ],
            content: diff,
        }
    }

    async remote(body) {
        const { projectPath, files } = body
        // console.log('files', files)
        const git = await this.getClient(projectPath)
        
        return await git.getRemotes(true)
    }

    async status(body) {
        const { projectPath } = body
        const git = await this.getClient(projectPath)
        const status = await git.status()
        // {
        //     not_added: [],
        //     conflicted: [],
        //     created: [ 'b.txt' ],
        //     deleted: [ 'a.txt' ],
        //     ignored: undefined,
        //     modified: [ 'README.md' ],
        //     renamed: [],
        //     files: [
        //       FileStatusSummary {
        //         path: 'README.md',
        //         index: ' ',
        //         working_dir: 'M'
        //       },
        //       FileStatusSummary { path: 'a.txt', index: ' ', working_dir: 'D' },
        //       FileStatusSummary { path: 'b.txt', index: 'A', working_dir: ' ' }
        //     ],
        //     staged: [ 'b.txt' ],
        //     ahead: 0,
        //     behind: 0,
        //     current: 'master',
        //     tracking: null,
        //     detached: false,
        //     isClean: [Function (anonymous)]
        //   }
        // 更新列表修改信息
        const content = fs.readFileSync(gitDbFilePath, 'utf-8') || '[]'
        const list = JSON.parse(content)
        const findIndex = list.findIndex(p => p.path == projectPath)
        // console.log('findIndex', findIndex)
        if (findIndex != -1) {
            const fProject = list[findIndex]
            // console.log('fProject', fProject)
            if (fProject.changes != status.files.length) {
                list[findIndex].changes = status.files.length
                fs.writeFileSync(gitDbFilePath, JSON.stringify(list, null, 4), 'utf-8')
            }
        }
        return {
            status,
        }
    }

    async branchRename(body) {
        const { projectPath, oldBranchName, newBranchName } = body
        const git = await this.getClient(projectPath)
        const commands = ['branch', '-m', oldBranchName, newBranchName]
        return await this._command(git, commands)
    }

    async branchDelete(body) {
        const { projectPath, name, force = false, deleteRemote = false } = body
        const git = await this.getClient(projectPath)
        if (name.startsWith('remotes/')) {
            // name like 'remotes/origin/dev'
            // await git.delte
            let idx = name.indexOf('/')
            const after = name.substring(idx + 1)
            console.log('after', after)
            idx = after.indexOf('/')
            const remoteName = after.substring(0, idx)
            const remoteBranchName = after.substring(idx + 1)
            // git push origin --delete [branch_name]
            const commands = ['push', remoteName, '--delete', remoteBranchName]
            console.log('commands', commands)
            return await this._command(git, commands)
        }
        else {
            if (deleteRemote) {
                const remoteName = 'origin'
                const commands = ['push', remoteName, '--delete', name]
                console.log('commands', commands)
                await this._command(git, commands)
            }
            await git.deleteLocalBranch(name, force)
            // console.log('branch', branch)
            return {
                commands: [
                    {
                        id: uid(32),
                        command: `git branch -${force ? 'D' : 'd'} ${name}`,
                    }
                ],
            }
        }
    }

    async branchCreate(body) {
        const { projectPath, name, commit, remoteBranch } = body
        const git = await this.getClient(projectPath)
        if (remoteBranch) {
            // git checkout -b dev origin/dev
            // remotes/origin/on-main 
            const commands = ['checkout', '-b', name, remoteBranch]
            console.log('commandsc', commands)
            return await this._command(git, commands)
        }
        // const branch = await git.checkoutLocalBranch(name)
        const createBranchCommands = ['checkout', '-b', name]
        if (commit) {
            createBranchCommands.push(commit)
        }
        await this._command(git, createBranchCommands)
        // console.log('branch', branch)
        const checkoutCommands = ['checkout', name]
        await this._command(git, checkoutCommands)
        return {
            commands: [
                {
                    id: uid(32),
                    command: `git ${createBranchCommands.join(' ')}`,
                },
                {
                    id: uid(32),
                    command: `git ${checkoutCommands.join(' ')}`,
                },
            ],
        }
    }

    async branchList(body) {
        const { projectPath } = body
        const git = await this.getClient(projectPath)
        const branch = await git.branch()
        // console.log('branch', branch)

        // {
        //     all: [ 'master' ],
        //     branches: {
        //       master: {
        //         current: true,
        //         linkedWorkTree: false,
        //         name: 'master',
        //         commit: '2c838b2',
        //         label: 'first commit!'
        //       }
        //     },
        //     current: 'master',
        //     detached: false
        //   }
        // 更新列表分支信息
        const content = fs.readFileSync(gitDbFilePath, 'utf-8') || '[]'
        const list = JSON.parse(content)
        const findIndex = list.findIndex(p => p.path == projectPath)
        // console.log('findIndex', findIndex)
        if (findIndex != -1) {
            const fProject = list[findIndex]
            // console.log('fProject', fProject)
            if (fProject.branch != branch.current) {
                list[findIndex].branch = branch.current
                fs.writeFileSync(gitDbFilePath, JSON.stringify(list, null, 4), 'utf-8')
            }
        }


        let commits: any[] = []
        try {
            const log = await git.log({})
            // console.log('log', log)
            commits = log.all as any
        }
        catch (err) {
            if (err.message && err.message.includes('does not have any commits yet')) {

            }
            else {
                throw err
            }
        }

        return {
            current: branch.current,
            list: branch.all.map(branchName => {
                const _branch = branch.branches[branchName]
                const fCommit = commits.find(item => item.hash.startsWith(_branch.commit))
                return {
                    ..._branch,
                    commitObj: fCommit || null,
                    // debug: {
                    //     length: commits.length,
                    // }
                }
            })
        }
    }

    async projectList(body) {
        const content = fs.readFileSync(gitDbFilePath, 'utf-8') || '[]'
        const list = JSON.parse(content)
        return {
            list,
        }
    }

    async remoteCreate(body) {
        const { projectPath, name, url } = body
        const git = await this.getClient(projectPath)
        await git.addRemote(name, url)
        return {
            commands: [
                {
                    id: uid(32),
                    command: `git remote add ${name} ${url}`,
                }
            ],
        }
    }

    async tagPush(body) {
        const { projectPath, remoteName, tag, mode } = body
        const git = await this.getClient(projectPath)
        // await git.push(remoteName, branchName)
        // git push origin master
        // git push origin master:master
        // push -v origin refs/heads/master:refs/heads/master 
        let commands
        if (tag) {
            commands = ['push', '-v', remoteName, `refs/tags/${tag}`]
        }
        else {
            commands = ['push', '-v', remoteName, '--tags']
        }
        // if (mode == 'force') {
        //     commands.push('--force')
        // }
        // console.log('commands', commands)
        // return await git.raw(commands)
        return await this._command(git, commands)
    }

    async push(body) {
        const { projectPath, remoteName, branchName, mode } = body
        const git = await this.getClient(projectPath)
        // await git.push(remoteName, branchName)
        // git push origin master
        // git push origin master:master
        // push -v origin refs/heads/master:refs/heads/master 
        const commands = ['push', '-v', remoteName, `refs/heads/${branchName}:refs/heads/${branchName}`]
        if (mode == 'force') {
            commands.push('--force')
        }
        // console.log('commands', commands)
        // return await git.raw(commands)
        return await this._command(git, commands)
    }

    async pull(body) {
        const { projectPath, remoteName, branchName } = body
        const git = await this.getClient(projectPath)
        // 拉取全部
        // await git.pull()

        await git.pull(remoteName, branchName)
        return {
            commands: [
                {
                    id: uid(32),
                    command: `git pull ${remoteName} ${branchName}`,
                }
            ],
        }
    }

    async show(body) {
        const { projectPath, remoteName, commit } = body
        const git = await this.getClient(projectPath)
        const params = [commit, '--stat']
        const res = await git.show(params)
        // console.log('show/res', res)
        // console.log('show/res/end')
        const arr = res.split('\n')
        // console.log('arr', arr)
        // await git.checkoutLocalBranch(branchName)
        const files = []
        for (let idx = arr.length - 2; idx >= 0; idx--) {
            const line = arr[idx]
            if (line == '') {
                break
            }
            if (!line.includes('changed')) {
                files.push(line.split('|')[0].trim())
            }
        }
        // console.log('files', files)
        return {
            files,
            res,
            commands: [
                {
                    id: uid(32),
                    command: 'git show ' + params.join(' '),
                }
            ],
        }
    }

    async commitFileChanged(body) {
        const { projectPath, commit, filePath } = body
        // commit: curCommit.hash,
        //     filePath: file,
        const git = await this.getClient(projectPath)
        // console.log('ppp', commit, filePath)
        const params = [commit, '--', filePath]
        const res = await git.show(params)
        // console.log('res', res)
        // await git.checkoutLocalBranch(branchName)
        // const cmd = `cd ${projectPath} && git show ${commit} ${filePath}`
        // console.log('cmd', cmd)
        // exec(cmd)
        //     .then(function (result) {
        //         console.log('result', result)
        //         var stdout = result.stdout;
        //         var stderr = result.stderr;
        //         console.log('stdout: ', stdout);
        //         console.log('stderr: ', stderr);
        //     })
        //     .catch(function (err) {
        //         console.error('ERROR: ', err);
        //     });
        // const child = cp.exec(, function(err, stdout, stderr){
        //     console.log('?', err, stdout, stderr);
        // })
        
        return {
            res,
            commands: [
                {
                    id: uid(32),
                    command: 'git show ' + params.join(' '),
                }
            ],
            // res: '',
        }
    }

    async cat(body) {
        const { projectPath, filePath, sizeLimit } = body
        const fullPath = path.join(projectPath, filePath)
        if (sizeLimit) {
            const stat = fs.statSync(fullPath)
            // console.log('stat', stat)
            if (stat.size >= sizeLimit) {
                throw new Error('file too large!')
            }
        }
        const content = fs.readFileSync(fullPath, 'utf-8')
        return {
            content,
            commands: [
                {
                    id: uid(32),
                    command: `cat ${filePath}`,
                }
            ],
        }
    }

    async getConfig(body) {
        const { projectPath, remoteName, branchName } = body
        const git = await this.getClient(projectPath)
        const userNameconfig = await git.getConfig('user.name')
        const userEmailconfig = await git.getConfig('user.email')
        // console.log('res', res)
        // await git.checkoutLocalBranch(branchName)
        return {
            config: {
                user: {
                    name: userNameconfig.value,
                    email: userEmailconfig.value,
                }
            },
        }
    }

    async checkout(body) {
        const { projectPath, remoteName, branchName } = body
        const git = await this.getClient(projectPath)
        const res = await git.checkout(branchName)
        // console.log('res', res)
        // await git.checkoutLocalBranch(branchName)
        return {
            commands: [
                {
                    id: uid(32),
                    command: `git checkout ${branchName}`,
                }
            ],
        }
    }

    async cherryPick(body) {
        const { projectPath, commit, branch } = body
        const git = await this.getClient(projectPath)
        await git.checkout(branch)

        // console.log('res', res)
        // await git.checkoutLocalBranch(branchName)
        // return {
        //     commands: [
        //         {
        //             id: uid(32),
        //             command: `git checkout ${branchName}`,
        //         }
        //     ],
        // }
        return await this._command(git, ['cherry-pick', commit])
    }

    async checkoutFile(body) {
        const { projectPath, filePath } = body
        const git = await this.getClient(projectPath)
        // const res = await git.checkout(['--', filePath])
        // console.log('res', res)
        return await this._command(git, ['checkout', '--', filePath])
    }

    async merge(body) {
        const { projectPath, fromBranch, toBranch, pushRemote = false } = body
        const git = await this.getClient(projectPath)
        // const res = await git.merge(fromBranch)
        const res = await git.mergeFromTo(fromBranch, toBranch)
        // console.log('res', res)
        // await git.checkoutLocalBranch(branchName)
        if (pushRemote) {
            const commands = ['push', '-v', 'origin', `refs/heads/${toBranch}`]
            await this._command(git, commands)
        }
        return {
            commands: [
                {
                    id: uid(32),
                    command: `git merge ${fromBranch}`,
                }
            ],
        }
    }

    async fetch(body) {
        const { projectPath, remoteName, branchName } = body
        const git = await this.getClient(projectPath)
        const fetch = await git.fetch(remoteName)
        // console.log('fetch', fetch)
        return {
            fetch,
        }
    }

    async projectCreate(body) {
        const { url, name, path, init = false } = body
        if (url) {
            // console.log('start clone')
            await simpleGit().clone(url, path)
                // .then(() => console.log('finished'))
                // .catch((err) => console.error('failed: ', err));
        }
        if (init) {
            if (!fs.existsSync(path)) {
                await mkdirp(path)
            }
            const git = simpleGit(path, { binary: 'git' })
            git.init()
        }
        
        const content = fs.readFileSync(gitDbFilePath, 'utf-8') || '[]'
        const list = JSON.parse(content)
        list.unshift({
            id: uid(32),
            name,
            path,
        })
        fs.writeFileSync(gitDbFilePath, JSON.stringify(list, null, 4), 'utf-8')
        return {

        }
    }

    async projectUpdate(body) {
        const { id, data } = body
        const { name, isFavorite, favoriteTime } = data
        const content = fs.readFileSync(gitDbFilePath, 'utf-8') || '[]'
        const list = JSON.parse(content)
        const findIndex = list.findIndex(p => p.id == id)
        // console.log('findIndex', findIndex)
        if (findIndex != -1) {
            const fProject = list[findIndex]
            list[findIndex] = {
                ...list[findIndex],
                ...objectSet({
                    name,
                    isFavorite,
                    favoriteTime,
                })
            }
            // list[findIndex].name = name
            // name, isFavorite
            // console.log('fProject', fProject)
            fs.writeFileSync(gitDbFilePath, JSON.stringify(list, null, 4), 'utf-8')
        }
        return {}
    }

    async projectDelete(body) {
        const { id } = body
        const content = fs.readFileSync(gitDbFilePath, 'utf-8') || '[]'
        const list = JSON.parse(content)
        // const findIndex = list.findIndex(p => p.id == id)
        // console.log('findIndex', findIndex)
        // if (findIndex != -1) {
        //     const fProject = list[findIndex]
        //     console.log('fProject', fProject)
        //     if (fProject.branch != branch.current) {
        //         list[findIndex].branch = branch.current
        //         fs.writeFileSync(gitDbFilePath, JSON.stringify(list, null, 4), 'utf-8')
        //     }
        // }
        const newProjects = list.filter(item => item.id != id)
        fs.writeFileSync(gitDbFilePath, JSON.stringify(newProjects, null, 4), 'utf-8')
        return {}

    }
    
    async tagList(body) {
        const { projectPath } = body
        const git = await this.getClient(projectPath)
        const tag = await git.tags()
        // console.log('log', log)

        // console.log('removeList')
        // git.listRemote(['--tags'], console.log)
        // git.listRemote(['--heads'], console.log)

        return {
            list: tag.all.map(name => {
                return {
                    name,
                }
            })
        }
    }

    async tagRemoteList(body) {
        const { projectPath, remoteName } = body
        const git = await this.getClient(projectPath)
        // git.listRemote(['--tags'], console.log)
        const tagsRes = await git.raw(['ls-remote', '--tags', remoteName])
        console.log('tagsRes', tagsRes)
        
        const list = tagsRes.split('\n')
            .filter(item => item)
            .map(item => {
                const arr = item.split('\t')
                return {
                    commit: arr[0],
                    name: arr[1],
                }
            })
        // console.log('list', list)
        return {
            list,
        }
    }

    async tagDelete(body) {
        const { projectPath, name, deleteRemote = false } = body
        const git = await this.getClient(projectPath)
        if (deleteRemote) {
            await this._command(git, ['push', 'origin', `:refs/tags/${name}`])
        }
        return await this._command(git, ['tag', '--delete', name])
    }

    async tagDeleteRemote(body) {
        const { projectPath, remoteName, name } = body
        const git = await this.getClient(projectPath)
        // git push origin :refs/tags/prod1.0
        const commands = ['push', remoteName, `:${name}`]
        console.log('commands', commands)
        return await this._command(git, commands)
    }

    async command(body) {
        const { projectPath, commands = [] } = body
        const git = await this.getClient(projectPath)
        // console.log('cmd', commands.join(' '))
        // await git.raw(commands)
        return await this._command(git, commands)
        // console.log('log', log)
        // return {}
    }

    async deleteFile(body) {
        const { projectPath, filePath } = body
        await fs.unlinkSync(path.join(projectPath, filePath))
        return {}
    }

    async userConfig(body) {
        // const { projectPath, filePath } = body
        // await fs.unlinkSync(path.join(projectPath, filePath))
        const content = fs.readFileSync(gitSettingFilePath, 'utf-8')
        return {
            userHome: USER_HOME,
            fileSeparator: path.sep,
            ...JSON.parse(content),
        }
    }

    async userConfigUpdate(body) {
        const content = fs.readFileSync(gitSettingFilePath, 'utf-8')
        const configs = JSON.parse(content)
        fs.writeFileSync(gitSettingFilePath, JSON.stringify({
            ...configs,
            defaultClonePath: body.defaultClonePath,
        }, null, 4), 'utf-8')
        return {}
    }

    async fileContent(body) {
        const { projectPath, commit, file } = body
        const git = await this.getClient(projectPath)
        // const tag = await git.addTag(name)
        // console.log('log', log)
        const res = await git.raw(['show', `${commit}:${file}`])
        console.log('res', res)
        
        return {
            content: res,
        }
    }

    async tagCreate(body) {
        const { projectPath, name, commit, pushRemote } = body
        const git = await this.getClient(projectPath)
        // const tag = await git.addTag(name)
        // console.log('log', log)
        const params = ['tag', name]
        if (commit) {
            params.push(commit)
        }
        const ret = await this._command(git, params)
        if (pushRemote) {
            const commands = ['push', '-v', 'origin', `refs/tags/${name}`]
            await this._command(git, commands)
        }
        return ret
        // return {
        //     commands: [
        //         {
        //             command: `git tag ${name}`,
        //         }
        //     ],
        // }
    }

    async graph(body) {
        const { projectPath, limit, file, author } = body
        const git = await this.getClient(projectPath)
        // git log --oneline --graph --decorate --all
        const commands = [`log', '--oneline', '--graph', '--decorate', '--all`]
        const log = await git.log({
            format: '%h|%p|%D|(%cr)|%cn|%s'
        })
        
        const cmd = `cd ${projectPath} && git log --graph --all | cat`
        const result = await localExec(cmd)
        return {
            result: result.substring(0, 20000) + '\n...',
        }
        // await this._command(git, commands)
    }

    async commitList(body) {
        const { projectPath, limit, file, author } = body
        const git = await this.getClient(projectPath)
        let commits: any[] = []
        const opts: any = {
            // file: 'README.md'
        }
        if (limit) {
            opts.maxCount = limit
        }
        if (file) {
            opts.file = file
        }
        if (author) {
            opts.author_email = author
        }
        
        try {
            const log = await git.log(opts)
            // console.log('log', log)
            commits = log.all as any
        }
        catch (err) {
            if (err.message && err.message.includes('does not have any commits yet')) {

            }
            else {
                throw err
            }
        }
        // {
        //     all: [
        //       {
        //         hash: '489deea0f6bf7e90a7434f4ae22c5e17214bdf5d',
        //         date: '2022-09-23T19:23:59+08:00',
        //         message: '「add」b',
        //         refs: 'HEAD -> master',
        //         body: '',
        //         author_name: 'cjhgit',
        //         author_email: '1418503647@qq.com'
        //       },
        //       {
        //         hash: '2c838b2a6b7550564774fad18e505631fb0c9322',
        //         date: '2022-09-23T19:01:14+08:00',
        //         message: 'first commit!',
        //         refs: '',
        //         body: '',
        //         author_name: 'cjhgit',
        //         author_email: '1418503647@qq.com'
        //       }
        //     ],
        //     latest: {
        //       hash: '489deea0f6bf7e90a7434f4ae22c5e17214bdf5d',
        //       date: '2022-09-23T19:23:59+08:00',
        //       message: '「add」b',
        //       refs: 'HEAD -> master',
        //       body: '',
        //       author_name: 'cjhgit',
        //       author_email: '1418503647@qq.com'
        //     },
        //     total: 2
        //   }
        return commits
    }

    async getClient(projectPath = folderPath): Promise<SimpleGit> {
        if (!projectPath) {
            throw new Error('projectPath required')
        }
        if (!g_gis[projectPath]) {
            g_gis[projectPath] = simpleGit(projectPath, { binary: 'git' });
        }
        // const git: SimpleGit = simpleGit(folderPath, { binary: 'git' });
        return g_gis[projectPath]
    }

    async stashList(body) {
        const { projectPath } = body
        const git = await this.getClient(projectPath)
        const result = await git.stashList()
        const list = Object.keys(result.all).map(idx => {
            return {
                ...result.all[idx],
                index: idx,
            }
        })
        return {
            list,
            total: result.total,
            latest: result.latest,
        }
    }

    async stashCreate(body) {
        const { projectPath, message } = body
        const git = await this.getClient(projectPath)
        git.stash({
            '--message': message,
        })
        return {}
    }

    async stashApply(body) {
        const { projectPath, index } = body
        const git = await this.getClient(projectPath)
        const command = ['stash', 'apply', `stash@{${index}}`]
        return await this._command(git, command)
    }
    
    async stashDelete(body) {
        const { projectPath, index } = body
        const git = await this.getClient(projectPath)
        const command = ['stash', 'drop', `stash@{${index}}`]
        return await this._command(git, command)
    }

    async stashClear(body) {
        const { projectPath } = body
        const git = await this.getClient(projectPath)
        const command = ['stash', 'clear']
        return await this._command(git, command)
    }
}
