import axios from 'axios'
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
          const resourceUrl = new URL(attribute, targetUrl)

          const targetUrlHost = (new URL(targetUrl)).host // для проверки на текущий хост
          if (resourceUrl.host !== targetUrlHost) return

          const changeAttr = getChangeAttr(resourceUrl)
          $(element).attr(attr, `${dirnameFiles}/${changeAttr}`)

          const downloadPromise = axios.get(resourceUrl, { responseType })
            .then(res => writeFile(join(dirpathFiles, changeAttr), res.data))

          downloadPromises.push(downloadPromise)
        })
      })
      return mkdir(dirpathFiles, { recursive: true })
        .then(() => Promise.all(downloadPromises))
        .then(() => $.html())
        .then(modifiedHtml => writeFile(dataFilepath, modifiedHtml).then(() => dataFilepath))
    })
}
