// Usage: node scripts/sync-service-types.cjs /path/to/CareSpace-AI.Project [ref] [--check]
const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process')
const [repository, ref = 'origin/main'] = process.argv.slice(2).filter(arg => arg !== '--check')
if (!repository) throw new Error('CareSpace OS repository path is required')
const source = 'src/constants/facility-types.ts'
const sha = execFileSync('git', ['rev-parse', ref], { cwd: repository, encoding: 'utf8' }).trim()
const content = execFileSync('git', ['show', `${sha}:${source}`], { cwd: repository, encoding: 'utf8' })
const cutoff = content.indexOf('// 簡略表記から正式名称へのマッピング')
if (cutoff < 0 || !content.includes('export const FACILITY_TYPES_BY_CATEGORY =')) throw new Error('Unexpected OS catalog format')
const output = `// Generated from CareSpace OS ${source}\n// Source commit: ${sha}\n// Regenerate with scripts/sync-service-types.cjs; do not edit by hand.\n\n${content.slice(0, cutoff).trim()}\n`
const target = path.join(__dirname, '../lib/carespace-service-types.ts')
if (process.argv.includes('--check')) {
 if (fs.readFileSync(target, 'utf8') !== output) throw new Error('Cares catalog differs from the selected CareSpace OS revision')
 console.log('Cares service catalog matches CareSpace OS ' + sha)
} else { fs.writeFileSync(target, output); console.log('Updated service catalog from ' + sha) }
