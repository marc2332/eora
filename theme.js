import chalk from 'chalk'
import chalkRainbow from 'chalk-rainbow'
import path from 'path'
import fs from 'fs'

export async function prompt(pwd) {
	if(process.platform === 'win32'){
		var string = `\n[${chalkRainbow(process.env.USERNAME)}] (${pwd})`;
	}else{
		var string = `\n[${chalkRainbow(process.env.USER)}] (${pwd})`;
	}

	const npm = await npmPackage(pwd)
	if(npm){
		string = string.concat(chalk.green(` npm v${npm.version}`))
	}

	return `${string} -> `
}

const npmPackage = pwd => {
	return new Promise(res => {
		const pkg = path.join(pwd, 'package.json')
		fs.lstat(pkg, (err) => {
			if(err){
				res(false)
			}else{
				res(req(pkg))
			}
		})
	})
}

const req = (w) => eval(`require("${w.replace(/\\/gm,'/')}")`) 