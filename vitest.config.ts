import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // DSH Windows 沙箱禁止 fork/子进程管道，使用 worker_threads。
    pool: 'threads',
    maxWorkers: 1,
  },
})
