const path = require('path')

module.exports = [
	{
		name: 'eora',
		mode: 'development',
		optimization: {
			minimize: false,
		},
		entry: {
			index: './index.js',
		},
		node: {
			__dirname: true,
		},
		resolve: {
			extensions: ['.js'],
		},
		module: {
			rules: [
				{
					test: /\.jsx?$/,
					loader: 'babel-loader',
					exclude: path.resolve(__dirname, './node_modules'),
				},
			],
		},
		externals:[
			'bufferutil',
			'utf-8-validate'
		],
		target: 'node',
		output: {
			filename: 'index.js',
			path: path.resolve(__dirname, 'dist'),
		}
	},
]