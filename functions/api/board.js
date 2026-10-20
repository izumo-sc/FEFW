import {handleBoard} from '../../lib/board.mjs';

export function onRequest(context) {
  return handleBoard(context);
}
