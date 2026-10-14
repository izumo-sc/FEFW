import {recordPageView} from '../../lib/page-counter.mjs';

export function onRequest(context) {
  return recordPageView(context, new URL(context.request.url).searchParams.get('page'));
}
