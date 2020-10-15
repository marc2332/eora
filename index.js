let pwd = process.cwd()
const fs = require('fs')
const path = require('path')
const cp = require('child_process')


let leave = false
let shellFocused = true

setInterval(() => {
	if(leave) process.exit(0)
},1)

const parseComand = (args) => {
	const cmd = args[0].trim()
	return {
		cmd,
		args: args.slice(1)
	}
}

const out = text => process.stdout.write(text);

const cleanArgs = args => args.map(a => a.replace(/(\r\n|\n|\r)/gm,''))

const getPathBins = process.env.Path.split(';')

const executeCommand = async ({ cmd, args}) => {
	return new Promise(async (res) => {
		shellFocused = false
		switch(cmd){
			case 'ls':
				fs.readdir(pwd,(err, list) => {
					if(err) out(err)
					out('\n'+list.join('\n')+'\n')
					res()
				})
				break;
			case 'cd':
				args = cleanArgs(args)
				pwd = path.join(pwd, ...args)
				res()
				break;
			case 'clear':
				console.clear()
				res()
				break;
			case 'pwd':
				out(pwd)
				res()
				break;
			case 'exit':
				leave = true
				res()
				break;
			default:
				args = cleanArgs(args)
				
				const paths = process.env.Path.split(';')
				
				const bin = await new Promise((res) => {
					paths.forEach((dir) => {
						let bin = path.join(dir, cmd)
						if(process.platform === 'win32'){
							bin = bin.concat('.cmd')
						}else{
							bin = bin.concat('.sh')
						}
						fs.lstat(bin, (err) => {
							if(err){
								//
							}else{
								res(bin)
							}
						})
					})
					setTimeout(() => {
						res(cmd)
					},100)
				})

				if(bin.includes('.cmd')){
					var ps = cp.exec(`"${bin.replace(/\\/gm,'/')}" ${args.join('')}`,{
						detached: true,
						cwd: pwd
					});
				}else{
					var ps = cp.spawn(bin,args,{
						detached: true,
						cwd: pwd
					});
				}



				ps.on('close', (code) => {
					process.stdin.removeListener('data', writingListener)
					res()
				})
				
				ps.on('error', ({ code, path }) => {
					switch(code){
						case 'ENOENT':
							out(`Command '${path}' not found`)
							break;
						default:
							out(`Could not execute command '${path}'`)
							break;
					}
				})
				
				function writingListener(input){
					ps.stdin.write(input.toString())
				}
				
				process.stdin.on('data', writingListener)
				
				ps.stdout.on('data', (data) => {
					out(data)
				})
				
				break;
		}
	})
}


process.stdin.on('data', async input  => {
	if(!shellFocused) return
	const command = parseComand(input.toString().split(' '))
	await executeCommand(command)
	shellFocused = true
	showPrompt()
})

const theme = require('./theme')

const showPrompt = async () => {
	out(await theme.prompt(pwd))
}

showPrompt()

