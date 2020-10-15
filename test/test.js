let leave = false

setInterval(() => {
	console.log('weew')
	if(leave) process.exit(0)
},500)

setTimeout(() => {
	leave = true
},1500)
