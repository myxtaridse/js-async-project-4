import axios from 'axios'
import axiosDebugLog from 'axios-debug-log'
axiosDebugLog.addLogger(axios)

import * as cheerio from 'cheerio'
import { mkdir, writeFile } from 'fs/promises'
import { extname, join } from 'path'

const filesForModified = [
  { tagname: 'script', attr: 'src', responseType: 'text' },
  { tagname: 'link', attr: 'href', responseType: 'text' },
  { tagname: 'img', attr: 'src', responseType: 'arraybuffer' },
]

const parseUrl = (targetUrl) => {
  const href = targetUrl.replace(/https?:\/\//, '')
  return href.replace(/[^A-Za-z0-9]/g, '-')
}

const getChangeAttr = (srcUrl) => {
  const pathname = extname(srcUrl.pathname) === '' ? `${srcUrl.pathname}.html` : srcUrl.pathname
  return `${srcUrl.host}${pathname}`.replace(/(?!\.[^.]*$)[^A-Za-z0-9]/g, '-')
}

export default (targetUrl, outputDir = process.cwd()) => {
  try {
    new URL(targetUrl)
  }
  catch (err) {
    return Promise.reject(new Error(`Ссылка ${targetUrl} является синтаксически неверной. Попробуйте переписать ее.`, { cause: err }))
  }
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

          const downloadPromise = axios.get(resourceUrl, { responseType })
            .then(res => writeFile(join(dirpathFiles, changeAttr), res.data))
            .catch(() => {
              console.warn(`Не удалось скачать ресурс тега <${tagname}> по URL адресу "${attribute}", поскольку его не существует`)
              return null
            })

          downloadPromises.push(downloadPromise)
        })
      })
      return mkdir(dirpathFiles, { recursive: true })
        .then(() => Promise.all(downloadPromises))
        .then(() => $.html())
        // ! проверка на существование директории и прав на нее
        .then(modifiedHtml => writeFile(dataFilepath, modifiedHtml).then(() => dataFilepath))
    }).catch((err) => {
      if (err.code === 'ECONNRESET') {
        throw new Error(`Для скачивания файла в директорию ${outputDir} необходимо обладать правами администратора.`, { cause: err })
      }
      if (err.code === 'EACCES') {
        throw new Error(`Не удалось найти директорию ${outputDir}. Попробуйте еще раз.`, { cause: err })
      }
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
