import { domain, fill } from 'plena'
import {
  COMPILE_HEADER_ATOMS,
  compileHeaderLegal,
  runCompileHeader,
  wantCompileHeader,
} from './compile-header'

fill(domain(COMPILE_HEADER_ATOMS, {
  name: 'compile-header',
  where: compileHeaderLegal,
  require: { op: ['set', 'append', 'remove'], name: ['live', 'blank'] },
  contract: ['bucket', 'headers'],
}), {
  run: runCompileHeader,
  want: wantCompileHeader,
})
