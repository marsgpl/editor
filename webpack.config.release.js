const { resolve } = require('node:path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')

module.exports = {
    mode: 'production',
    entry: './src/index.tsx',
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'main.css',
            ignoreOrder: false,
        }),
    ],
    optimization: {
        minimizer: [
            `...`,
            new CssMinimizerPlugin(),
        ],
        splitChunks: {
            cacheGroups: {
                defaultVendors: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendor',
                    chunks: 'all',
                    priority: -10,
                    reuseExistingChunk: true,
                }
            },
        }
    },
    output: {
        filename: '[name].js',
        path: resolve(__dirname, 'dst'),
        assetModuleFilename: 'f/[hash][ext]',
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.jsx'],
    },
    module: {
        noParse: [
            require.resolve('typescript/lib/typescript.js'),
        ],
        rules: [
            {
                test: /\.[jt]sx?$/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        configFile: 'tsconfig.release.json',
                    },
                },
                exclude: /node_modules/,
            },
            {
                test: /\.module\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                ],
            },
            {
                test: /\.(jpg|png|svg|woff2)$/,
                type: 'asset/resource',
            },
        ],
    },
}
