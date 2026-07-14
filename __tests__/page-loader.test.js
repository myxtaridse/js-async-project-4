import { mkdtemp, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import nock from 'nock'
import reqTargetUrl from '../src/index.js'

const getFixturePath = filename => join(resolve(), '__fixtures__', filename)

describe('page-loader', () => {
  let mkdtempPath
  beforeEach(async () => {
    mkdtempPath = await mkdtemp(join(tmpdir(), 'page-loader-'))
  })

  test('should download page and return correct path', async () => {
    const targetUrl = 'https://ru.hexlet.io/courses'
    const href = 'https://ru.hexlet.io'

    const expectedFileName = 'ru-hexlet-io-courses.html'
    const expectedFilePath = join(mkdtempPath, expectedFileName)

    const expectedDirNameAssets = 'ru-hexlet-io-courses_files'
    const expectedFileNameAssets = 'ru-hexlet-io-assets-professions-nodejs.png'

    const basicBody = await readFile(getFixturePath('basic1.html'), 'utf-8')
    const expectedBody = await readFile(getFixturePath('expected1.html'), 'utf-8')
    const expectedImg = 'fake image content'

    nock(href).get('/courses').reply(200, basicBody)
    nock(href).get('/assets/professions/nodejs.png').reply(200, expectedImg)

    const resHTML = await reqTargetUrl(targetUrl, mkdtempPath) // запрос на запись данных страницы в файл
    expect(resHTML).toBe(expectedFilePath) // тут просто проверяем путь, ничего не меняется

    const content = await readFile(expectedFilePath, 'utf-8')
    expect(content).toBe(expectedBody) // должны записываться измененные данные

    // также нужно проверить скачанную картинку
    // получаем путь до картинки
    // читаем ее и проверяем содержимое с фейковыми данными
    const expectedImgFullPath = join(mkdtempPath, expectedDirNameAssets, expectedFileNameAssets)
    const imgContent = await readFile(expectedImgFullPath, 'utf-8')
    expect(imgContent).toBe(expectedImg)
  })
})
