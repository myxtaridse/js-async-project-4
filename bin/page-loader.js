#!/usr/bin/env node
import { program } from 'commander'
import pageLoader from '../src/index.js'

const thenLog = filepath => `Page was successfully downloaded into '${filepath}'`
const catchLog = message => `Ошибка: ${message}`

program
  .name('page-loader')
  .description('Page loader utility')
  .version('1.0.0')
  .option('-o, --output [dir]', 'output dir', process.cwd())
  .argument('<targetUrl>')
  .action((targetUrl, { output }) => {
    return pageLoader(targetUrl, output)
      .then(({ filepath }) => console.log(thenLog(filepath)))
      .catch((err) => {
        console.error(catchLog(err.message))
        process.exit(1)
      })
  })

program.parseAsync()
