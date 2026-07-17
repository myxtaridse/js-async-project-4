#!/usr/bin/env node
import { resolve } from 'node:path'
import { stat } from 'node:fs/promises'
import { program } from 'commander'
import reqTargetUrl from '../src/index.js'

const thenLog = filepath => `Page was successfully downloaded into '${filepath}'`
const catchLog = message => `Ошибка: ${message}`

program
  .name('page-loader')
  .description('')
  .version('1.0.0')
  .option('-o, --output [dir]', 'output dir', '/home/user/current-dir')
  .argument('<targetUrl>')
  .action(async (targetUrl, { output }) => {
    const resolvedOutput = resolve(output)
    try {
      new URL(targetUrl)
      const stats = await stat(resolvedOutput)
      if (!stats.isDirectory()) {
        throw new Error()
      }
    }
    catch (err) {
      if (err.code === 'EACCES' || err.code === 'ENOENT') {
        console.error(catchLog(`Директория ${resolvedOutput} не существует или недоступна для записи.`))
      }
      else if (err.code === 'ERR_INVALID_URL') {
        console.error(catchLog(`Ссылка ${targetUrl} является синтаксически неверной. Попробуйте переписать ее.`))
      }
      process.exit(1)
    }
    reqTargetUrl(targetUrl, resolvedOutput)
      .then(filepath => console.log(thenLog(filepath)))
      .catch((err) => {
        console.error(catchLog(err.message))
        process.exit(1)
      })
  })

program.parse()
