import { extname } from 'path'

export const parseUrl = (targetUrl) => {
  const href = targetUrl
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
  return href.replace(/[^A-Za-z0-9]/g, '-')
}

export const getChangeAttr = (srcUrl) => {
  const pathname = extname(srcUrl.pathname) === '' ? `${srcUrl.pathname}.html` : srcUrl.pathname
  return `${srcUrl.host}${pathname}`.replace(/(?!\.[^.]*$)[^A-Za-z0-9]/g, '-')
}
