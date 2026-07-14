import axios from 'axios'
import { writeFile } from 'fs/promises'
import path from 'path'

const parseUrl = (targetUrl) => {
  const href = targetUrl.replace(/https?:\/\//, '')
  const newHref = href.replace(/[^A-Za-z0-9]/g, '-')
  return `${newHref}.html`
}

export default (targetUrl, outputDir = process.cwd()) => {
  const filename = parseUrl(targetUrl)
  const filepath = path.join(outputDir, filename)
  return axios.get(targetUrl)
    .then(({ data }) => writeFile(filepath, data))
    .then(() => filepath)
}
