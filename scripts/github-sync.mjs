// 通过 GitHub REST API 同步当前 git 索引到远端分支。
// 用途：本机 git 协议被网络阻断时的回退路径；仅上传有变化的文件（字体等大文件未变化则跳过）。
// 环境变量：
//   GITHUB_TOKEN（必填）、GITHUB_REPO=owner/repo、GITHUB_BRANCH=main、
//   GITHUB_MESSAGE（提交信息）、GITHUB_AUTHOR_NAME/EMAIL（可选）
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { closeSync, openSync, readFileSync, statSync } from 'node:fs'

const token = process.env.GITHUB_TOKEN
const repo = process.env.GITHUB_REPO
const branch = process.env.GITHUB_BRANCH ?? 'main'
const message = process.env.GITHUB_MESSAGE ?? 'chore: sync'
if (!token || !repo) {
  console.error('缺少 GITHUB_TOKEN 或 GITHUB_REPO')
  process.exit(1)
}

const apiBase = `https://api.github.com/repos/${repo}`
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'train-signs-sync',
  'X-GitHub-Api-Version': '2022-11-28',
}

async function api(path, init = {}) {
  const res = await fetch(`${apiBase}${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${body.slice(0, 500)}`)
  }
  return res.json()
}

function git(args) {
  const out = `./.git/sync-${Date.now()}.tmp`
  const fd = openSync(out, 'w')
  const result = spawnSync('git', args, { stdio: ['ignore', fd, 'inherit'] })
  closeSync(fd)
  const text = readFileSync(out, 'utf8')
  return { status: result.status, text }
}

function gitConfig(key, fallback) {
  const { status, text } = git(['config', '--get', key])
  return status === 0 && text.trim() ? text.trim() : fallback
}

// 1. 远端当前提交与树
const ref = await api(`/git/ref/heads/${branch}`)
const remoteCommitSha = ref.object.sha
const remoteCommit = await api(`/git/commits/${remoteCommitSha}`)
const remoteTreeSha = remoteCommit.tree.sha
const remoteTree = await api(`/git/trees/${remoteTreeSha}?recursive=1`)
const remoteFiles = new Map()
for (const entry of remoteTree.tree) {
  if (entry.type === 'blob') remoteFiles.set(entry.path, entry)
}

// 2. 本地索引（git add -A 之后）
const indexResult = git(['ls-files', '-s', '-z'])
if (indexResult.status !== 0) throw new Error('git ls-files 失败')
const localFiles = new Map()
for (const record of indexResult.text.split('\0')) {
  if (!record) continue
  const tab = record.indexOf('\t')
  if (tab < 0) continue
  const meta = record.slice(0, tab).split(' ')
  const path = record.slice(tab + 1).trim()
  if (!path) continue
  localFiles.set(path, { mode: meta[0], sha: meta[1] })
}

const changes = []
const deletions = []
for (const [path, entry] of localFiles) {
  const remote = remoteFiles.get(path)
  if (!remote || remote.sha !== entry.sha) changes.push({ path, mode: entry.mode })
}
for (const path of remoteFiles.keys()) {
  if (!localFiles.has(path)) deletions.push(path)
}

console.log(`远端 ${branch}: ${remoteCommitSha.slice(0, 7)}，变更 ${changes.length}，删除 ${deletions.length}`)

// 3. 上传变更文件
const treeEntries = []
for (const change of changes) {
  const size = statSync(change.path).size
  if (size > 20 * 1024 * 1024) {
    throw new Error(`文件过大，无法通过 API 上传：${change.path} (${size} bytes)`)
  }
  const content = readFileSync(change.path).toString('base64')
  const blob = await api('/git/blobs', {
    method: 'POST',
    body: JSON.stringify({ content, encoding: 'base64' }),
  })
  const expected = createHash('sha1')
    .update(Buffer.from(`blob ${size}\0`))
    .update(readFileSync(change.path))
    .digest('hex')
  if (blob.sha !== expected) {
    console.warn(`警告：${change.path} 的远端 blob 与本地 git blob 不一致`)
  }
  treeEntries.push({
    path: change.path,
    mode: change.mode === '100755' ? '100755' : '100644',
    type: 'blob',
    sha: blob.sha,
  })
}
for (const path of deletions) {
  treeEntries.push({ path, mode: '100644', type: 'blob', sha: null })
}

const newTree = await api('/git/trees', {
  method: 'POST',
  body: JSON.stringify({ base_tree: remoteTreeSha, tree: treeEntries }),
})

// 4. 提交并更新分支
const now = new Date().toISOString()
const author = {
  name: process.env.GITHUB_AUTHOR_NAME ?? gitConfig('user.name', 'train-signs'),
  email: process.env.GITHUB_AUTHOR_EMAIL ?? gitConfig('user.email', 'noreply@github.com'),
  date: now,
}
const commit = await api('/git/commits', {
  method: 'POST',
  body: JSON.stringify({
    message,
    tree: newTree.sha,
    parents: [remoteCommitSha],
    author,
    committer: author,
  }),
})
await api(`/git/refs/heads/${branch}`, {
  method: 'PATCH',
  body: JSON.stringify({ sha: commit.sha, force: false }),
})
console.log(`已推送：${commit.sha}`)
