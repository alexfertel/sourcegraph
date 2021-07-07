import esbuild from 'esbuild'
import path from 'path'
//import sassPlugin from 'esbuild-plugin-sass-modules'
// import { sassPlugin } from 'esbuild-sass-plugin'
import cssModulesPlugin from 'esbuild-css-modules-plugin'
import sass from 'sass'
import postcss from 'postcss'
import postcssConfig from './postcss.config.js'
import postcssModules from 'postcss-modules'
import fs from 'fs'
import os from 'os'

const resolveFile = (modulePath, dir) => {
    if (modulePath.startsWith('.')) {
        return path.resolve(dir, modulePath)
    }

    if (modulePath.startsWith('wildcard/') || modulePath.startsWith('shared/')) {
        return path.resolve(`client/${modulePath}`)
    }

    let p = path.resolve(`node_modules/${modulePath}`)
    try {
        p = fs.realpathSync(p)
    } catch (err) {}
    return p
}
const resolveCache = new Map()
const cachedResolveFile = (modulePath, dir) => {
    const key = `${modulePath}:${dir}`
    const existing = resolveCache.get(key)
    if (existing) {
        return existing
    }

    const resolvedPath = resolveFile(modulePath, dir)
    resolveCache.set(key, resolvedPath)
    return resolvedPath
}

const tmpDirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'esbuild-'))
const cleanup = () => fs.rmdirSync(tmpDirPath, { recursive: true })

/** @type esbuild.Plugin */
const sassPlugin = {
    name: 'sass',
    setup: build => {
        let buildStarted
        build.onStart(() => {
            buildStarted = Date.now()
        })
        build.onEnd(() => console.log(`> ${Date.now() - buildStarted}ms`))

        /** @type {path:string; map: {[key: string]: string}}[] */
        const modulesMap = new Map()
        const modulesPlugin = postcssModules({
            generateScopedName: '[name]__[local]___[hash:base64:5]',
            localsConvention: 'camelCase',
            modules: true,
            getJSON: (cssPath, json) => modulesMap.set(cssPath, json),
        })

        const CWD = process.cwd()
        const cssRender = async (sourceFullPath, fileContent) => {
            const sourceExt = path.extname(sourceFullPath)
            const sourceBaseName = path.basename(sourceFullPath, sourceExt)
            const sourceDir = path.dirname(sourceFullPath)
            const sourceRelDir = path.relative(CWD, sourceDir)
            const isModule = sourceBaseName.endsWith('.module')
            const tmpDir = path.resolve(tmpDirPath, sourceRelDir)
            await fs.promises.mkdir(tmpDir, { recursive: true })

            const tmpFilePath = path.join(tmpDir, `${sourceBaseName}.css`)

            let css
            switch (sourceExt) {
                case '.css':
                    css = fileContent
                    break

                case '.scss':
                    css = sass
                        .renderSync({
                            file: sourceFullPath,
                            data: fileContent,
                            importer: url => {
                                return { file: cachedResolveFile(url) }
                            },
                            quiet: true,
                        })
                        .css.toString()
                    break

                default:
                    throw new Error(`unknown file extension: ${sourceExt}`)
            }

            const result = await postcss({
                ...postcssConfig,
                plugins: isModule ? [...postcssConfig.plugins, modulesPlugin] : postcssConfig.plugins,
            }).process(css, {
                from: sourceFullPath,
                to: tmpFilePath,
            })

            await fs.promises.writeFile(tmpFilePath, result.css)
            return tmpFilePath
        }
        /** @type Map<string, {path: string, originalContent: string, outPath: string}> */
        const cssRenderCache = new Map()
        const cachedCSSRender = async (sourceFullPath, fileContent) => {
            // TODO(sqs): invalidate
            const key = sourceFullPath
            const existing = cssRenderCache.get(key)
            if (false)
                console.log(
                    'CACHE',
                    existing ? (existing.originalContent === fileContent ? 'HIT' : 'STALE') : 'MISS',
                    sourceFullPath
                )
            if (existing && existing.originalContent === fileContent) {
                if (sourceFullPath.includes('UsagePage')) {
                    if (false) console.log('CACHE HIT', sourceFullPath, fileContent)
                }
                return existing.outPath
            }

            const outPath = await cssRender(sourceFullPath, fileContent)
            cssRenderCache.set(key, { path: sourceFullPath, originalContent: fileContent, outPath: outPath })
            return outPath
        }

        build.onResolve({ filter: /\.s?css$/, namespace: 'file' }, async args => {
            // Namespace is empty when using CSS as an entrypoint
            if (args.namespace !== 'file' && args.namespace !== '') {
                return
            }

            const sourceFullPath = cachedResolveFile(args.path, args.resolveDir)
            const fileContent = await fs.promises.readFile(sourceFullPath, 'utf8')
            const tmpFilePath = await cachedCSSRender(sourceFullPath, fileContent)

            const isModule = sourceFullPath.endsWith('.module.css') || sourceFullPath.endsWith('.module.scss')

            return {
                namespace: isModule ? 'postcss-module' : 'file',
                path: tmpFilePath,
                watchFiles: [sourceFullPath],
                pluginData: {
                    originalPath: sourceFullPath,
                },
            }
        })

        build.onResolve({ filter: /\.ttf$/, namespace: 'file' }, args => {
            // TODO(sqs): hack, need to resolve this from the original path
            if (args.path === './codicon.ttf') {
                return {
                    path: path.resolve('node_modules/monaco-editor/esm/vs/base/browser/ui/codicons/codicon', args.path),
                }
            }
        })
        build.onResolve({ filter: /\.png$/, namespace: 'file' }, args => {
            // TODO(sqs): hack, need to resolve this from the original path
            if (args.path === 'img/bg-sprinkles-2x.png') {
                return {
                    path: path.resolve('ui/assets', args.path),
                }
            }
        })

        build.onLoad({ filter: /./, namespace: 'postcss-module' }, async args => {
            const mod = modulesMap.get(args.pluginData.originalPath)
            const resolveDir = path.dirname(args.path)

            const contents = `import ${JSON.stringify(args.path)}
            export default ${JSON.stringify(mod || {})}`

            return {
                resolveDir,
                contents,
            }
        })

        // Handle the `import`ed CSS files from the previous onLoad filter.
        build.onResolve({ filter: /./, namespace: 'postcss-module' }, args => {
            return {
                path: args.path,
                namespace: 'file',
            }
        })
    },
}

const PORT = 3099

/** @type esbuild.BuildOptions */
const BUILD_OPTIONS = {
    entryPoints: ['client/web/src/enterprise/main.tsx', 'client/shared/src/api/extension/main.worker.ts'],
    bundle: true,
    format: 'esm',
    outdir: 'ui/assets/esbuild',
    logLevel: 'error',
    splitting: false, // TODO(sqs): need to have splitting:false for main.worker.ts entrypoint
    plugins: [sassPlugin],
    define: {
        'process.env.NODE_ENV': '"development"',
        global: 'window',
        'process.env.SOURCEGRAPH_API_URL': JSON.stringify(process.env.SOURCEGRAPH_API_URL),
    },
    loader: {
        '.yaml': 'text',
        '.ttf': 'file',
        '.png': 'file',
    },
    target: 'es2020',
    sourcemap: true,
    incremental: true,
}
if (process.env.SERVE) {
    await esbuild.serve(
        {
            port: PORT,
        },
        BUILD_OPTIONS
    )
} else {
    await esbuild.build({ ...BUILD_OPTIONS, watch: !!process.env.WATCH })
}
// cleanup()