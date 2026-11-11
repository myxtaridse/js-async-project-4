import { extname } from 'node:path'

export const parseUrl = (targetUrl) => {
  const href = targetUrl
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
  return href.replace(/[^A-Za-z0-9]/g, '-')
}

export const getChangeAttr = (resourceUrl) => {
  const pathname = extname(resourceUrl.pathname) === '' ? `${resourceUrl.pathname}.html` : resourceUrl.pathname
  return `${resourceUrl.host}${pathname}`.replace(/(?!\.[^.]*$)[^A-Za-z0-9]/g, '-')
}
