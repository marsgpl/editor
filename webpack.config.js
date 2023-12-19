const path = require('path')

module.exports = {
    mode: 'development',
    entry: './src/index.tsx',
    output: {
        filename: 'a.js',
        path: path.resolve('dst'),
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    module: {
        noParse: [
            require.resolve('typescript/lib/typescript.js'),
        ],
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.module\.css$/,
                use: [
                    {
                        loader: 'style-loader',
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            modules: {
                                localIdentName: '[path][local]',
                            },
                        },
                    },
                ],
            }
        ],
    },
    devServer: {
        host: '127.0.0.1',
        port: 33001,
        static: 'public',
    },
}
