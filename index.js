let cwd = process.cwd()
import chalk from 'chalk'
import chalkRainbow from 'chalk-rainbow'
import path from 'path'
import fs from 'fs-extra'
import cp from'child_process'
import * as theme from './theme'
import keypress from 'keypress'
import termCursor from 'term-cursor'

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

const out = text => {
	console.log('')
	process.stdout.write(text)
}

const promptPrint = text => {
	process.stdout.write(text)
}

const cleanArgs = args => args.map(a => a.replace(/(\r\n|\n|\r)/gm,''))

const executeCommand = async ({ cmd, args}) => {
	return new Promise(async (res) => {
		shellFocused = false
		switch(cmd){
			case 'ls':
				fs.readdir(cwd,(err, list) => {
					if(err) out(err)
					out(list.join('\n'))
					res()
				})
				break;
			case 'cd':
				args = cleanArgs(args)
				fs.lstat(path.join(cwd, ...args),(err) => {
					if(err) {
						out(`Directory <${args}> doesn't exist.`)
					} else {
						cwd = path.join(cwd, ...args)
					}
					res()
				})

				break;
			case 'clear':
				console.clear()
				res()
				break;
			case 'echo':
				out(args.join(' '))
				res()
				break;
			case 'pwd':
				out(cwd)
				res()
				break;
			case 'exit':
				leave = true
				res()
				break;
			default:
				args = cleanArgs(args)
				
				if(process.platform === 'win32'){
					var paths = process.env.Path.split(';')
				}else{
					var paths = process.env.PATH.split(';')
				}
			
				const bin = await new Promise((res) => {
					paths.forEach((dir) => {
						let bin = path.join(dir, cmd)
						if(process.platform === 'win32'){
							bin = bin.concat('.cmd')
						}else{
							bin = bin.concat('.sh')
						}
						fs.lstat(bin, err => {
							if(!err){
								res(bin)
							}
						})
					})
					setTimeout(() => {
						res(cmd)
					},100)
				})

				if(!bin) return  res() //Any command

				if(bin.includes('.cmd')){
					var ps = cp.exec(`"${bin.replace(/\\/gm,'/')}" ${args.join(' ')}`, {
						detached: true,
						cwd
					})
				}else{
					var ps = cp.spawn(bin,args,{
						cwd
					})
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
				
				ps.stdout.on('data', (data) => {
					out(data)
				})
				
				break;
		}
	})
}

const empty = (s) => s
const red = (s) => chalk.red(s)
const green = (s) => chalk.green(s)

let pastMessage = ''
let autoCompletingNow = ''
let pastMessageColorizer = empty

process.stdin.on('keypress', async function (data, key = { name: 'unknown'}) {
	if(!data){
		out(`Error: Unhandled key press.`)
		resetPrompt()
		return
	}
	const input = data.toString()
	
	if(!shellFocused && !key.ctrl){
		return
	}
	
	if(key.name === 'c' && key.ctrl){ //ctrl+c
		out(chalk.pink('Cancelling...'))
		resetPrompt()
		
	}else if(key.name === 'return'){ //enter
		if(!shellFocused) return
		if(pastMessage !== ''){
			const command = parseComand(pastMessage.split(' '))
			await executeCommand(command)
		}
		resetPrompt()
	}else if(key.name === 'backspace'){ //delete
		if(!shellFocused) return
		pastMessage = pastMessage.slice(0, -1)
		
		handleCorretions(data)
	
	}else if(key.name === 'tab'){ //tab
		await cleanLineAndReRender()
		const { goal, completed } = getBestAutocompletion(pastMessage)

		if(goal && !completed){
			promptPrint(green(goal))
			pastMessage = goal
		}
	}else if(!key.ctrl){ //any other key
		pastMessage = pastMessage.concat(input)
		handleCorretions(data)
	}
})

async function resetPrompt(){
	pastMessage = ''
	shellFocused = true
	const str = await getPrompt()
	promptPrint(`${str}`)
}

async function handleCorretions(data){
	if(!data) return
	
	const { goal, completed } = getBestAutocompletion(pastMessage)
	
	await cleanLineAndReRender(goal || pastMessage != '' ? 'good' : 'bad')
	
	if(goal){
		promptPrint(green(pastMessage))
		if(!completed) showRight(data, goal)
	}else{
		promptPrint(chalk.red(pastMessage))
	}
}

function showRight(data, goal){
	let [_,left] = goal.split(data)
	if(!left) return
	promptPrint(chalk.gray(left))
	termCursor.left(left.length)
	autoCompletingNow = goal
}

function cleanLineAndReRender(status){
	return new Promise( async (res) => {
		process.stdout.clearLine(0)  // clear current text

		termCursor.up(1)

		const str = await getPrompt(status)
		promptPrint(`${str}`);
		res()
	})
}

process.stdin.setRawMode(true);
process.stdin.setEncoding('utf-8');
process.stdin.resume();
keypress(process.stdin)

process.on('SIGINT', function() {
	out(chalk.blue('\n bye ! '))
	process.exit(0)
})

const getPrompt = (status = 'good') => {
	return new Promise(async (res) => {
		let prompt = await theme.prompt(cwd, status)
		res(prompt)
	})
}

getPrompt().then(a => out(a))

const getBestAutocompletion = text => {
	if(text === '') return {}
	const command = parseComand(text.split(' '))
	let res = {}
	autocompletions.find(t => {
		if(t.startsWith(command.cmd) && res.goal === undefined)  {
			res = {
				goal: t,
				completed: command.args.length > 0
			}
			return t
		}
	})
	return res
}

let autocompletions = [
	'ls',
	'pwd',
	'cd',
	'exit',
	'clear',
	'echo'
]


if(process.platform === 'win32'){
	process.env.Path.split(';').map(p => {
		fs.readdir(p).then(list => {
			list.map(b => {
				autocompletions.push(b.replace(/(.exe)|(.cmd)/gm, ''))
			})
		})
		return path.basename(p)
	})
}else{
	autocompletions = [...autocompletions, ...process.env.PATH.split(';').map(p => {
		return path.basename(p)
	}).filter(Boolean)]
}


