import {handleBoardAdmin} from '../../lib/board-admin.mjs';

export function onRequest(context) {
  return handleBoardAdmin(context);
}
