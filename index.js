let pwd = process.cwd()
import chalk from 'chalk'
import chalkRainbow from 'chalk-rainbow'
import path from 'path'
import fs from 'fs-extra'
import cp from'child_process'
import * as theme from './theme'
import keypress from 'keypress'

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
				fs.readdir(pwd,(err, list) => {
					if(err) out(err)
					out(list.join('\n'))
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
			case 'echo':
				out(args.join(' '))
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

				if(!bin) return  res()//Any command
				
				if(bin.includes('.cmd')){
					var ps = cp.exec(`"${bin.replace(/\\/gm,'/')}" ${args.join(' ')}`,{
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
	const input = data.toString()
	
	if(key.name === 'c' && key.ctrl){ //enter
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
		process.stdout.clearLine()
		await cleanLineAndReRender()
		handleCorretions(data)
		const cursor = require('term-cursor')
		cursor.right(1)
	
	}else if(key.name === 'tab'){ //tab
		pastMessage = autoCompletingNow
		
		process.stdout.clearLine(-1);  // clear current text
	
		const cursor = require('term-cursor')
		cursor.up(1)
		
		const str = await getPrompt()
		promptPrint(`${str}${pastMessage}`);
	}else{
		pastMessage = pastMessage.concat(input)
		
		handleCorretions(data)
	}
});

async function resetPrompt(){
	pastMessage = ''
	shellFocused = true
	const str = await getPrompt()
	promptPrint(`${str}`)
}

async function handleCorretions(data){
	if(!data) return
	
	const goal = getBestAutocompletion(pastMessage)

	if(goal){
		promptPrint(green(data))
		let [_,left] = goal.split(data)
		if(!left) return
		promptPrint(chalk.gray(left))
		const cursor = require('term-cursor')
		cursor.left(left.length)
		autoCompletingNow = goal
	}else{
		let tmp = pastMessage
		pastMessage = ''
		await cleanLineAndReRender()
		pastMessage = tmp
		promptPrint(chalk.red(tmp))
		pastMessageColorizer = red
	}
}

function cleanLineAndReRender(){
	return new Promise( async (res) => {
		process.stdout.clearLine(-1);  // clear current text

		const cursor = require('term-cursor')
		cursor.up(1)

		const str = await getPrompt()
		promptPrint(`${str}${pastMessageColorizer(pastMessage)}`);
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

const getPrompt = () => {
	return new Promise(async (res) => {
		let prompt = await theme.prompt(pwd)
		res(prompt)
	})
}

getPrompt().then(a => out(a))

const getBestAutocompletion = (text) => {
	const command = parseComand(text.split(' '))
	return autocompletions.find(t => {
		if(t.startsWith(command.cmd)) return t
	})
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
	var paths = process.env.Path.split(';').map(p => {
		fs.readdir(p).then(list => {
			list.map(b => {
				autocompletions.push(b)
			})
		})
		return path.basename(p)
	})
}else{
	var paths = process.env.PATH.split(';').map(p => {
		return path.basename(p)
	})
	autocompletions = autocompletions.concat(paths)
}


