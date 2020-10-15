const chalk = require('chalk')
const chalkRainbow = require('chalk-rainbow')
const path = require('path')
const fs = require('fs')

module.exports = {
	prompt: async (pwd) => {
		let string = `\n[${chalkRainbow(process.env.USERNAME)}] (${pwd})`
		
		const npm = await npmPackage(pwd)
		if(npm){
			string = string.concat(chalk.green(` npm v${npm.version}`))
		}
		
		return `${string} -> `
	}
}

const npmPackage = pwd => {
	return new Promise(res => {
		const pkg = path.join(pwd, 'package.json')
		fs.lstat(pkg, (err) => {
			if(err){
				res(false)
			}else{
				res(require(pkg))
			}
		})
	})
}