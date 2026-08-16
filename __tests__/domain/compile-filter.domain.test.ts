import { domain, fill } from 'plena'
import { FILTER_KINDS } from '../../src/types'
import {
  COMPILE_FILTER_ATOMS,
  compileFilterLegal,
  runCompileFilter,
  wantCompileFilter,
} from './compile-filter'

fill(domain(COMPILE_FILTER_ATOMS, {
  name: 'compile-filter',
  where: compileFilterLegal,
  require: { kind: [...FILTER_KINDS] },
  contract: ['session', 'urlFilter', 'regexFilter', 'excluded', 'resources', 'tabIds'],
}), {
  run: runCompileFilter,
  want: wantCompileFilter,
})
