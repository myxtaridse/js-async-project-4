import axios from 'axios'
import * as cheerio from 'cheerio'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'

const parseUrl = (targetUrl) => {
  const href = targetUrl.replace(/https?:\/\//, '')
  return href.replace(/[^A-Za-z0-9]/g, '-')
}

const getFileSrc = (targetUrl, srcImg) => {
  const hostUrl = new URL(targetUrl).host
  const filepath = `${hostUrl}${srcImg}`.replace(/(?!\.[^.]*$)[^A-Za-z0-9]/g, '-')
  return filepath
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
      const changeSrc = getFileSrc(targetUrl, srcImg) // измененный src

      $('img').attr('src', `${dirnameFiles}/${changeSrc}`)
      const modifiedHtml = $.html()

      const imgUrl = (new URL(targetUrl)).origin + srcImg

      // если каталога не существует, добавляем
      return mkdir(dirpathFiles, { recursive: true })
        .then(() => axios.get(imgUrl, { responseType: 'arraybuffer' }))
        .then(res => writeFile(join(dirpathFiles, changeSrc), res.data))
        .then(() => modifiedHtml)
    })
    .then((data) => {
      return writeFile(dataFilepath, data).then(() => dataFilepath)
    })
}
