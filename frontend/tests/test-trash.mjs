import { RETENTION_DAYS, daysLeft, isExpired } from '../src/lib/store.js'

const DAY = 24 * 60 * 60 * 1000
const ago = (days) => ({ deletedAt: Date.now() - days * DAY })

const checks = [
  ['retention is 15 days', RETENTION_DAYS === 15],
  ['just deleted → not expired', !isExpired(ago(0))],
  ['14 days old → not expired', !isExpired(ago(14))],
  ['15 days old → expired', isExpired(ago(15))],
  ['20 days old → expired', isExpired(ago(20))],
  ['fresh entry shows 15 days left', daysLeft(ago(0)) === 15],
  ['10 days old shows 5 days left', daysLeft(ago(10)) === 5],
  ['expired never goes negative', daysLeft(ago(40)) === 0],
]

let failed = 0
for (const [name, ok] of checks) {
  if (!ok) {
    failed++
    console.log(`FAIL ${name}`)
  }
}

console.log(failed ? `\n${failed} check(s) failed` : `All ${checks.length} trash checks passed`)
process.exit(failed ? 1 : 0)
