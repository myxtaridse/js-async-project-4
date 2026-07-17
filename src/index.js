import { join } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'

import axios from 'axios'
import axiosDebugLog from 'axios-debug-log'
axiosDebugLog.addLogger(axios)

import * as cheerio from 'cheerio'
import Listr from 'listr'
import { getChangeAttr, parseUrl } from './utils.js'

const filesForModified = [
  { tagname: 'script', attr: 'src', responseType: 'arraybuffer' },
  { tagname: 'link', attr: 'href', responseType: 'arraybuffer' },
  { tagname: 'img', attr: 'src', responseType: 'arraybuffer' },
]

const getResources = ($, targetUrl, dirnameFiles) => {
  const recources = []
  const targetUrlHost = (new URL(targetUrl)).host
  filesForModified.forEach(({ tagname, attr, responseType }) => {
    $(tagname).each((i, element) => {
      const attribute = $(element).attr(attr)
      if (!attribute) return

      let resourceUrl
      try {
        resourceUrl = new URL(attribute, targetUrl)
      }
      catch {
        console.warn(`Не удалось скачать ресурс тега <${tagname}> из-за некорректного URL адресу "${attribute}"`)
        return
      }
      if (resourceUrl.host !== targetUrlHost) return

      const changeAttr = getChangeAttr(resourceUrl)
      $(element).attr(attr, `${dirnameFiles}/${changeAttr}`)

      recources.push({ tagname, attribute, responseType, resourceUrl, changeAttr })
    })
  })
  return recources
}
const downloadResource = (resourceUrl, pathname, tagname, attribute, responseType) =>
  axios.get(resourceUrl, { responseType })
    .then(res => writeFile(pathname, res.data))
    .catch(() => {
      console.warn(`Не удалось скачать ресурс тега <${tagname}> по URL адресу "${attribute}", поскольку его не существует`)
    })
const createTask = ({ tagname, attribute, responseType, resourceUrl, changeAttr }, dirpathFiles) => ({
  title: resourceUrl.href,
  task: () => downloadResource(resourceUrl, join(dirpathFiles, changeAttr), tagname, attribute, responseType),
})

export default (targetUrl, outputDir) => {
  const filename = parseUrl(targetUrl)
  const dataFilepath = join(outputDir, `${filename}.html`)

  const dirnameFiles = `${filename}_files` // папка файлов
  const dirpathFiles = join(outputDir, dirnameFiles) // общий путь до папки

  return axios.get(targetUrl)
    .then(({ data }) => {
      const $ = cheerio.load(data)
      const tasks = new Listr(
        getResources($, targetUrl, dirnameFiles)
          .map(resource =>
            createTask(resource, dirpathFiles)),
        { concurrent: true, exitOnError: false })

      return mkdir(dirpathFiles)
        .then(() => tasks.run())
        .then(() => $.html())
        .then(modifiedHtml => writeFile(dataFilepath, modifiedHtml).then(() => dataFilepath))
    }).catch((err) => {
      if (axios.isAxiosError(err)) {
        if (err.response) {
          throw new Error(`Страницы по адресу ${targetUrl} не существует. Попробуйте переписать адрес.`, { cause: err })
        }
        if (err.request) {
          throw new Error(`Не удалось найти соединение со страницей по адресу ${targetUrl}. Проверьте подключение к сети.`, { cause: err })
        }
      }
      throw err
    })
}
