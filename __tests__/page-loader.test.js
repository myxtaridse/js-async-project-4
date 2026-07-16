import { mkdtemp, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import nock from 'nock'
import reqTargetUrl from '../src/index.js'

const getFixturePath = filename => join(resolve(), '__fixtures__', filename)

// общие значения для различных тестов
const targetUrl = 'https://ru.hexlet.io/courses'
const href = 'https://ru.hexlet.io'

const expectedFileName = 'ru-hexlet-io-courses.html'
const expectedDirNameAssets = 'ru-hexlet-io-courses_files'

describe('page-loader', () => {
  let mkdtempPath, expectedFilePath
  beforeEach(async () => {
    mkdtempPath = await mkdtemp(join(tmpdir(), 'page-loader-'))
    expectedFilePath = join(mkdtempPath, expectedFileName)
  })

  // обычный правильный случай
  test('should download page and return correct path', async () => {
    const expectedFileNameAssets = 'ru-hexlet-io-assets-professions-nodejs.png'
    const expectedImgFullPath = join(mkdtempPath, expectedDirNameAssets, expectedFileNameAssets)

    const basicBody = await readFile(getFixturePath('basic1.html'), 'utf-8')
    const expectedBody = await readFile(getFixturePath('expected1.html'), 'utf-8')
    const expectedImg = 'fake image content'

    nock(href).get('/courses').reply(200, basicBody)
    nock(href).get('/assets/professions/nodejs.png').reply(200, expectedImg)

    // проверка полученного пути
    await expect(reqTargetUrl(targetUrl, mkdtempPath)).resolves.toBe(expectedFilePath)
    // проверка измененного html
    await expect(readFile(expectedFilePath, 'utf-8')).resolves.toBe(expectedBody)
    // проверка наличия скачанных файлов
    await expect(readFile(expectedImgFullPath, 'utf-8')).resolves.toBe(expectedImg)
  })

  // правильный случай с большим количеством файлов
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

  // пограничные случаи
  // страницы нет в интернете
  test('failure to load a non-existent page on the Internet', async () => {
    nock('https://ruhexlet.io').get('/courses').reply(404)

    await expect(reqTargetUrl('https://ruhexlet.io/courses', mkdtempPath)).rejects.toThrow()
  })
  // синтаксически неправильный адрес страницы
  test('failure when loading a page with a syntactically incorrect URL', async () => {
    await expect(reqTargetUrl('https://', mkdtempPath)).rejects.toThrow()
    await expect(reqTargetUrl('', mkdtempPath)).rejects.toThrow()
  })
  // измененная страница должна загрузиться, несуществующие файлы не обрабатываются
  test('must download the modified page, even if some of the resources are unavailable', async () => {
    const expectedFileNameAssets = 'ru-hexlet-io-assets-professions-nodejs.png'
    const expectedImgFullPath = join(mkdtempPath, expectedDirNameAssets, expectedFileNameAssets)

    const basicBody = await readFile(getFixturePath('basic1.html'), 'utf-8')
    const expectedBody = await readFile(getFixturePath('expected1.html'), 'utf-8')

    nock(href).get('/courses').reply(200, basicBody)
    nock(href).get('/assets/professions/nodejs.png').reply(404)

    await expect(reqTargetUrl(targetUrl, mkdtempPath)).resolves.toBe(expectedFilePath)
    await expect(readFile(expectedFilePath, 'utf-8')).resolves.toBe(expectedBody)
    await expect(readFile(expectedImgFullPath, 'utf-8')).rejects.toThrow()
  })

  // ошибка доступа при сохранении данных в системные директории
  test('access failure when saving data to the system directory', async () => {
    nock(href).get('/courses').reply(200, 'Hello, World!')
    await expect(reqTargetUrl(targetUrl, '/bin')).rejects.toThrow()
  })
  // ошибка при сохранении данных в несуществующую директорию
  test('failure when saving data to a non-existent directory', async () => {
    nock(href).get('/courses').reply(200, 'Hello, World!')
    await expect(reqTargetUrl(targetUrl, '/no_exist')).rejects.toThrow()
  })
})
