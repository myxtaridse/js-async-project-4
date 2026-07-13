import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, access } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
const execPromisify = promisify(exec)

// использовать beforeAll - для использования общего кода
// mkdtemp в beforeEach - для создания временной директории
describe('page-loader', () => {
  let mkdtempPath
  beforeEach(async () => {
    mkdtempPath = await mkdtemp(join(tmpdir(), 'page-loader-'))
  })

  test('should download page and return correct path', async () => {
    const targetUrl = 'https://ru.hexlet.io/courses'
    const expectedFileName = 'ru-hexlet-io-courses.html'
    const expectedFilePath = join(mkdtempPath, expectedFileName)

    const { stdout } = await execPromisify(`page-loader --output ${mkdtempPath} ${targetUrl}`)
    expect(stdout.trim()).toBe(expectedFilePath)
    expect(await access(expectedFileName))
  })
})
