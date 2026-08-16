import { domain, fill } from 'plena'
import { runTimeRange, TIME_RANGE_ATOMS, wantTimeRange } from './time-range'

fill(domain(TIME_RANGE_ATOMS, {
  name: 'time-range',
  require: { spec: ['day', 'overnight', 'bad', 'empty'], now: ['noon', 'night'] },
  contract: ['inRange', 'profileOk', 'emits'],
}), {
  run: runTimeRange,
  want: wantTimeRange,
})
