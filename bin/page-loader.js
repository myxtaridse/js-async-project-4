#!/usr/bin/env node
import { program } from 'commander'
import reqTargetUrl from '../src/index.js'
import debug from 'debug'

const log = debug('page-loader')

program
  .name('page-loader')
  .description('')
  .version('1.0.0')
  .option('-o, --output [dir]', 'output dir', '/home/user/current-dir')
  .argument('<targetUrl>')
  .action((targetUrl, { output }) => {
    reqTargetUrl(targetUrl, output)
      .then(filepath => log(filepath))
      .catch((err) => {
        console.error(`Ошибка: ${err.message}`)
        process.exit(1)
      })
  })

program.parse()
