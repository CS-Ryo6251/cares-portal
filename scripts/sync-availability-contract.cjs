// Usage: node scripts/sync-availability-contract.cjs /path/to/os [--check]
const fs = require('node:fs'), path = require('node:path')
const repository = process.argv[2]
if (!repository) throw new Error('CareSpace OS repository path is required')
const output = '// Generated from CareSpace OS src/lib/availability-calendar.ts; run scripts/sync-availability-contract.cjs.\n' + fs.readFileSync(path.join(repository, 'src/lib/availability-calendar.ts'), 'utf8')
const target = path.join(__dirname, '../lib/availability-calendar.ts')
if (process.argv.includes('--check')) {
  if (fs.readFileSync(target, 'utf8') !== output) throw new Error('OS/Cares availability contracts differ')
  console.log('OS/Cares availability contracts match')
} else fs.writeFileSync(target, output)
const migration = '20261106131710_service_availability_state.sql'
const sql = '-- Generated OS contract fixture; run scripts/sync-availability-contract.cjs.\n' + fs.readFileSync(path.join(repository, 'supabase/migrations', migration), 'utf8')
const fixture = path.join(__dirname, '../tests/fixtures/service-availability-state.sql')
if (process.argv.includes('--check')) {
  if (fs.readFileSync(fixture, 'utf8') !== sql) throw new Error('OS/Cares SQL contract fixtures differ')
} else { fs.mkdirSync(path.dirname(fixture), { recursive: true }); fs.writeFileSync(fixture, sql) }
