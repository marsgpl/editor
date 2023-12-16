const path = require('path')

module.exports = {
    mode: 'development',
    entry: './src/index.ts',
    output: {
        filename: 'a.js',
        path: path.resolve('dst'),
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    devServer: {
        client: {
            overlay: {
                errors: true,
                runtimeErrors: true,
                warnings: true,
            },
        },
        compress: false,
        host: '127.0.0.1',
        port: 33001,
        static: 'public',
    },
}
