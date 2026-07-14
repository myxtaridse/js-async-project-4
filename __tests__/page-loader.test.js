import { mkdtemp, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import nock from 'nock'
import reqTargetUrl from '../src/index.js'

describe('page-loader', () => {
  let mkdtempPath
  beforeEach(async () => {
    mkdtempPath = await mkdtemp(join(tmpdir(), 'page-loader-'))
  })

  test('should download page and return correct path', async () => {
    const targetUrl = 'https://ru.hexlet.io/courses'
    const expectedFileName = 'ru-hexlet-io-courses.html'
    const expectedFilePath = join(mkdtempPath, expectedFileName)
    const expectedBody = '<html></html>'

    nock('https://ru.hexlet.io')
      .get('/courses')
      .reply(200, expectedBody)

    const res = await reqTargetUrl(targetUrl, mkdtempPath)
    expect(res).toBe(expectedFilePath)

    const content = await readFile(expectedFilePath, 'utf-8')
    expect(content).toBe(expectedBody)
  })
})
