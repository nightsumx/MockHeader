import { domain, fill } from 'plena'
import {
  COMPILE_REDIRECT_ATOMS,
  runCompileRedirect,
  wantCompileRedirect,
} from './compile-redirect'

fill(domain(COMPILE_REDIRECT_ATOMS, {
  name: 'compile-redirect',
  require: { mode: ['url', 'regex'], from: ['live', 'empty'], to: ['live', 'empty'] },
  contract: ['bucket', 'type', 'url', 'regexSubstitution', 'urlFilter', 'regexFilter'],
}), {
  run: runCompileRedirect,
  want: wantCompileRedirect,
})
