#!/usr/bin/env node
// Creates only source-identified directory/target rows. Never sends or publishes availability.
const fs = require('node:fs/promises'), path = require('node:path')
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function parseOptions(args) {
  const options = { apply: false, resume: false, batch: false, limit: 1000, pageSize: 100, snapshot: null, checkpoint: null }
  const values = { '--limit': 'limit', '--page-size': 'pageSize', '--snapshot': 'snapshot', '--checkpoint': 'checkpoint' }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--batch') options.batch = true
    else if (arg === '--apply') options.apply = true
    else if (arg === '--resume') options.resume = true
    else if (arg === '--help') options.help = true
    else if (values[arg]) {
      const value = args[++i]
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`)
      options[values[arg]] = ['--limit','--page-size'].includes(arg) ? Number(value) : value
    } else throw new Error(`Unknown option: ${arg}`)
  }
  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 100000) throw new Error('--limit must be 1..100000; default 1000')
  if (!Number.isInteger(options.pageSize) || options.pageSize < 1 || options.pageSize > (options.batch ? 1000 : 200)) throw new Error('--page-size must be 1..200 (batch: 1000); default 100')
  if (options.snapshot && !UUID.test(options.snapshot)) throw new Error('--snapshot must be a UUID')
  if (options.apply && (!options.snapshot || !options.checkpoint)) throw new Error('--apply requires the reviewed --snapshot UUID and --checkpoint path')
  if (options.resume && (!options.apply || !options.checkpoint)) throw new Error('--resume requires --apply and --checkpoint')
  return options
}

function repository(client) {
  const check = (result, label) => { if (result.error) throw new Error(`${label} failed; no further rows were processed`); return result }
  return {
    async activeSnapshot() {
      const result = check(await client.from('welfare_directory_snapshots').select('id,version').eq('source','wam_disability').eq('state','active').limit(2), 'Snapshot lookup')
      if (result.data?.length !== 1) throw new Error('Exactly one active WAM snapshot is required')
      return result.data[0]
    },
    async count(snapshot) {
      return check(await client.from('welfare_directory_entries').select('id',{count:'exact',head:true}).eq('snapshot_id',snapshot).eq('searchable',true), 'Source count').count
    },
    async page(snapshot, cursor, size) {
      let query = client.from('welfare_directory_entries').select('id,service_type').eq('snapshot_id',snapshot).eq('searchable',true).order('id',{ascending:true}).limit(size)
      if (cursor) query = query.gt('id',cursor)
      return check(await query, 'Source page').data || []
    },
    async listings(ids) {
      return check(await client.from('cares_listings').select('id,source_entry_id,source_version,service_type').eq('source_kind','welfare').in('source_entry_id',ids), 'Listing lookup').data || []
    },
    async batch(snapshot, cursor, size) {
      return check(await client.rpc('cares_backfill_welfare_availability',{p_snapshot:snapshot.id,p_version:snapshot.version,p_after:cursor,p_limit:size}), 'Batch RPC').data
    },
    async ensure(entry) {
      // The server validates the active source and exact service. A WAM number is never a join key.
      const result = check(await client.rpc('ensure_service_availability_target',{p_source_kind:'welfare',p_source_entry_id:entry.id}), 'Source-target RPC')
      if (!UUID.test(result.data || '')) throw new Error('Target RPC returned an invalid identifier')
      // A new snapshot may reuse an older canonical URL. Verify the immutable
      // source alias and its target instead of requiring the page's original ID.
      const alias = check(await client.from('service_availability_target_aliases').select('target_id').eq('source_kind','welfare').eq('source_entry_id',entry.id).maybeSingle(), 'Alias lookup').data
      const target = check(await client.from('service_availability_targets').select('id,listing_id,service_type').eq('id',result.data).maybeSingle(), 'Target lookup').data
      if (!target?.listing_id || alias?.target_id !== target.id || target.service_type !== entry.service_type) throw new Error('Post-write source/service verification failed; inspect mapping before resuming')
      const listing = check(await client.from('cares_listings').select('id,service_type').eq('id',target.listing_id).maybeSingle(), 'Canonical listing lookup').data
      if (listing?.id !== target.listing_id || listing.service_type !== entry.service_type) throw new Error('Post-write canonical listing verification failed; inspect mapping before resuming')
    },
  }
}

function checkpointStore(filename) {
  let lock
  return {
    async acquire() {
      await fs.mkdir(path.dirname(path.resolve(filename)),{recursive:true})
      lock = await fs.open(`${filename}.lock`,'wx',0o600)
      await lock.writeFile(String(process.pid)+'\n')
    },
    async release() { if (lock) { await lock.close(); await fs.unlink(`${filename}.lock`); lock=null } },
    async read() {
      try {
        const stat = await fs.lstat(filename)
        if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Checkpoint must be a regular file')
        return JSON.parse(await fs.readFile(filename,'utf8'))
      } catch (error) { if (error.code === 'ENOENT') return null; throw error }
    },
    async write(value) {
      await fs.mkdir(path.dirname(path.resolve(filename)),{recursive:true})
      const temporary = `${filename}.tmp-${process.pid}`
      await fs.writeFile(temporary,JSON.stringify(value,null,2)+'\n',{mode:0o600,flag:'wx'})
      await fs.rename(temporary,filename)
    },
  }
}

async function runBackfill(repo, options, store) {
  const snapshot = await repo.activeSnapshot()
  if (options.snapshot && options.snapshot !== snapshot.id) throw new Error('Requested snapshot is not active; review the new snapshot before continuing')
  const total = await repo.count(snapshot.id)
  if (!Number.isInteger(total) || total < 0) throw new Error('Source count is unavailable')
  let checkpoint = { schemaVersion:1,source:'wam_disability',snapshotId:snapshot.id,snapshotVersion:snapshot.version,sourceCount:total,lastEntryId:null,processed:0,complete:false }
  if (options.apply) {
    const existing = await store.read()
    if (existing && !options.resume) throw new Error('Checkpoint already exists; review it and use --resume instead of overwriting it')
    if (options.resume && !existing) throw new Error('Resume checkpoint not found')
    if (existing) {
      if (existing.schemaVersion !== 1 || existing.source !== 'wam_disability' || existing.snapshotId !== snapshot.id || existing.snapshotVersion !== snapshot.version || existing.sourceCount !== total
        || (existing.lastEntryId !== null && !UUID.test(existing.lastEntryId)) || !Number.isInteger(existing.processed) || existing.processed < 0 || existing.processed > total || typeof existing.complete !== 'boolean') throw new Error('Checkpoint does not match the active immutable snapshot; do not reuse it')
      checkpoint = existing
    }
    // Persist the zero cursor before the first RPC so an uncertain first result
    // can be retried via the same checkpoint and idempotent source identity.
    if (!existing) await store.write(checkpoint)
  }
  const summary = { mode:options.apply?'apply':'dry-run',batch:options.batch,snapshotId:snapshot.id,snapshotVersion:snapshot.version,sourceCount:total,processedThisRun:0,existingListings:0,newListingCandidates:0,completed:checkpoint.complete,cursor:checkpoint.lastEntryId }
  const confirmSnapshot = async () => {
    const active = await repo.activeSnapshot()
    if (active.id !== snapshot.id || active.version !== snapshot.version) throw new Error('Active WAM snapshot changed; stopped without advancing the checkpoint')
  }
  if (checkpoint.complete) return summary
  while (summary.processedThisRun < options.limit) {
    await confirmSnapshot()
    const size = Math.min(options.pageSize,options.limit-summary.processedThisRun)
    const entries = await repo.page(snapshot.id,checkpoint.lastEntryId,size)
    if (!entries.length) { checkpoint.complete = true; break }
    if (options.apply && options.batch) {
      const result = await repo.batch(snapshot,checkpoint.lastEntryId,size)
      if (result?.processed !== entries.length || result.cursor !== entries.at(-1).id) throw new Error('Batch result mismatch; checkpoint not advanced')
      await confirmSnapshot()
      checkpoint.processed += result.processed
      checkpoint.lastEntryId = result.cursor
      summary.processedThisRun += result.processed
      summary.cursor = result.cursor
      await store.write(checkpoint)
      if (entries.length < size) { checkpoint.complete = true; break }
      continue
    }
    const listed = await repo.listings(entries.map(entry=>entry.id))
    for (const entry of entries) {
      if (!UUID.test(entry.id) || typeof entry.service_type !== 'string' || !entry.service_type.trim() || (checkpoint.lastEntryId && entry.id <= checkpoint.lastEntryId)) throw new Error('Invalid or non-monotonic source row; stopped')
      const matches = listed.filter(listing=>listing.source_entry_id===entry.id)
      if (matches.length > 1 || (matches[0] && (matches[0].service_type !== entry.service_type || matches[0].source_version !== snapshot.version))) throw new Error(`Source/service/version mapping conflict at ${entry.id}; no automatic merge is allowed`)
      if (options.apply) {
        await confirmSnapshot()
        await repo.ensure({...entry,source_version:snapshot.version})
        await confirmSnapshot()
      }
      if (matches.length) summary.existingListings++
      else summary.newListingCandidates++
      summary.processedThisRun++
      checkpoint.processed++
      checkpoint.lastEntryId = entry.id
      summary.cursor = entry.id
      if (options.apply) await store.write(checkpoint)
    }
    await confirmSnapshot()
    if (entries.length < size) { checkpoint.complete = true; break }
  }
  await confirmSnapshot()
  if (await repo.count(snapshot.id) !== total) throw new Error('Source row count changed within the active snapshot; inspect it before resuming')
  if (checkpoint.processed === total) checkpoint.complete = true
  if (options.apply) await store.write(checkpoint)
  summary.completed = checkpoint.complete
  return summary
}

async function main() {
  const options = parseOptions(process.argv.slice(2))
  if (options.help) { console.log('Dry run (default): node scripts/backfill-wam-listings.cjs [--limit 1000] [--page-size 100]\nApply: add --apply --snapshot UUID --checkpoint PATH; --batch uses the bounded transactional RPC; add --resume for the same snapshot.\nUses SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY from the process environment. No .env files are read.'); return }
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase URL and service-role key must be supplied in the process environment')
  const { createClient } = require('@supabase/supabase-js')
  const client = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
  const store = options.apply?checkpointStore(options.checkpoint):null
  if (store) await store.acquire()
  try { console.log(JSON.stringify(await runBackfill(repository(client),options,store),null,2)) }
  finally { if (store) await store.release() }
}
if (require.main === module) main().catch(error=>{console.error(error.message);process.exitCode=1})
module.exports = { parseOptions, repository, checkpointStore, runBackfill }
