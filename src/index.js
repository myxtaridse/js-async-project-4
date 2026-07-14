import axios from 'axios'
import * as cheerio from 'cheerio'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'

const parseUrl = (targetUrl) => {
  const href = targetUrl.replace(/https?:\/\//, '')
  return href.replace(/[^A-Za-z0-9]/g, '-')
}

const getFileSrc = (srcUrl) => {
  return `${srcUrl.host}${srcUrl.pathname}`.replace(/(?!\.[^.]*$)[^A-Za-z0-9]/g, '-')
}

export default (targetUrl, outputDir = process.cwd()) => {
  const filename = parseUrl(targetUrl)
  const dataFilepath = join(outputDir, `${filename}.html`)

  const dirnameFiles = `${filename}_files` // папка файлов
  const dirpathFiles = join(outputDir, dirnameFiles) // общий путь до папки

  return axios.get(targetUrl)
    .then(({ data }) => {
      // модифицируем данные
      const $ = cheerio.load(data)
      const srcImg = $('img').attr('src') // src
      const srcUrl = new URL(srcImg, targetUrl)
      const changeSrc = getFileSrc(srcUrl)

      $('img').attr('src', `${dirnameFiles}/${changeSrc}`)
      const modifiedHtml = $.html()

      // если каталога не существует, добавляем
      return mkdir(dirpathFiles, { recursive: true })
        .then(() => axios.get(srcUrl, { responseType: 'arraybuffer' }))
        .then(res => writeFile(join(dirpathFiles, changeSrc), res.data))
        .then(() => modifiedHtml)
    })
    .then((data) => {
      return writeFile(dataFilepath, data).then(() => dataFilepath)
    })
}
