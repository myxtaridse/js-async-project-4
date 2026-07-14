import { mkdtemp, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import nock from 'nock'
import reqTargetUrl from '../src/index.js'

const getFixturePath = filename => join(resolve(), '__fixtures__', filename)

const targetUrl = 'https://ru.hexlet.io/courses'
const href = 'https://ru.hexlet.io'

const expectedFileName = 'ru-hexlet-io-courses.html'
const expectedDirNameAssets = 'ru-hexlet-io-courses_files'

describe('page-loader', () => {
  let mkdtempPath
  let expectedFilePath
  beforeEach(async () => {
    mkdtempPath = await mkdtemp(join(tmpdir(), 'page-loader-'))
    expectedFilePath = join(mkdtempPath, expectedFileName)
  })

  test('should download page and return correct path', async () => {
    const expectedFileNameAssets = 'ru-hexlet-io-assets-professions-nodejs.png'

    const basicBody = await readFile(getFixturePath('basic1.html'), 'utf-8')
    const expectedBody = await readFile(getFixturePath('expected1.html'), 'utf-8')
    const expectedImg = 'fake image content'

    nock(href).get('/courses').reply(200, basicBody)
    nock(href).get('/assets/professions/nodejs.png').reply(200, expectedImg)

    // запрос на запись данных страницы в файл
    expect(reqTargetUrl(targetUrl, mkdtempPath)).resolves.toBe(expectedFilePath) // тут просто проверяем путь, ничего не меняется

    await expect(readFile(expectedFilePath, 'utf-8')).resolves.toBe(expectedBody) // должны записываться измененные данные

    // также нужно проверить скачанную картинку
    // получаем путь до картинки
    // читаем ее и проверяем содержимое с фейковыми данными
    const expectedImgFullPath = join(mkdtempPath, expectedDirNameAssets, expectedFileNameAssets)
    await expect(readFile(expectedImgFullPath, 'utf-8')).resolves.toBe(expectedImg)
  })

  test('should load the page and related files and return the correct path', async () => {
    const expectedFiles = [
      {
        pathname: '/assets/application.css',
        filename: 'ru-hexlet-io-assets-application.css',
        fakeData: 'fake css content',
      },
      {
        pathname: '/courses',
        filename: 'ru-hexlet-io-courses.html',
        fakeData: 'fake html content',
      },
      {
        pathname: '/assets/professions/nodejs.png',
        filename: 'ru-hexlet-io-assets-professions-nodejs.png',
        fakeData: 'fake png content',
      },
      {
        pathname: '/packs/js/runtime.js',
        filename: 'ru-hexlet-io-packs-js-runtime.js',
        fakeData: 'fake js content',
      },
    ]

    const basicBody = await readFile(getFixturePath('basic2.html'), 'utf-8')
    const expectedBody = await readFile(getFixturePath('expected2.html'), 'utf-8')

    nock(href).get('/courses').reply(200, basicBody)
    expectedFiles.forEach(({ pathname, fakeData }) => {
      nock(href).get(pathname).reply(200, fakeData)
    })

    await expect(reqTargetUrl(targetUrl, mkdtempPath)).resolves.toBe(expectedFilePath)

    await expect(readFile(expectedFilePath, 'utf-8')).resolves.toBe(expectedBody)

    for (const item of expectedFiles) {
      const expectedImgFullPath = join(mkdtempPath, expectedDirNameAssets, item.filename)
      await expect(readFile(expectedImgFullPath, 'utf-8')).resolves.toBe(item.fakeData)
    }
  })
})
