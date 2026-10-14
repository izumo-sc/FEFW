import {recordPageView} from '../../lib/page-counter.mjs';

// Keep previously cached HOME pages working without changing their accumulated count.
export function onRequest(context) {
  return recordPageView(context, 'home');
}
