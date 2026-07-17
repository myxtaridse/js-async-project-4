import axios from 'axios'
import axiosDebugLog from 'axios-debug-log'
axiosDebugLog.addLogger(axios)

import * as cheerio from 'cheerio'
import { mkdir, writeFile } from 'fs/promises'
import Listr from 'listr'
import { join } from 'path'
import { getChangeAttr, parseUrl } from './utils.js'

const filesForModified = [
  { tagname: 'script', attr: 'src', responseType: 'text' },
  { tagname: 'link', attr: 'href', responseType: 'text' },
  { tagname: 'img', attr: 'src', responseType: 'arraybuffer' },
]

export default (targetUrl, outputDir = process.cwd()) => {
  const filename = parseUrl(targetUrl)
  const dataFilepath = join(outputDir, `${filename}.html`)

  const dirnameFiles = `${filename}_files` // папка файлов
  const dirpathFiles = join(outputDir, dirnameFiles) // общий путь до папки

  return axios.get(targetUrl)
    .then(({ data }) => {
      const $ = cheerio.load(data)
      const downloadPromises = [] // чтобы все операции завершились применим Promise.all
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

          const targetUrlHost = (new URL(targetUrl)).host // для проверки на текущий хост
          if (resourceUrl.host !== targetUrlHost) return

          const changeAttr = getChangeAttr(resourceUrl)
          $(element).attr(attr, `${dirnameFiles}/${changeAttr}`)

          downloadPromises.push({
            tagname,
            attribute,
            responseType,
            resourceUrl,
            changeAttr,
          })
        })
      })
      const tasks = new Listr(downloadPromises.map(({ tagname, attribute, responseType, resourceUrl, changeAttr }) => ({
        title: resourceUrl.href,
        task: () => axios.get(resourceUrl, { responseType })
          .then(res => writeFile(join(dirpathFiles, changeAttr), res.data))
          .catch(() => {
            console.warn(`Не удалось скачать ресурс тега <${tagname}> по URL адресу "${attribute}", поскольку его не существует`)
            // return null
          }),
      })),
      {
        concurrent: true,
        exitOnError: false,
      },
      )

      return mkdir(dirpathFiles, { recursive: true })
        .then(() => tasks.run())
        .then(() => $.html())
        // ! проверка на существование директории и прав на нее
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
