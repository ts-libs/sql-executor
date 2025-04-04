import {isNumber, isString, isBoolean} from './deps.ts';

export function valueOf(thingy: number|string|boolean) : string{
  if (isNumber(thingy)) {
    return thingy+'';
  }
  if (isString(thingy)) {
    return `'${thingy}'`;
  }
  if (isBoolean(thingy)) {
    return thingy ? '1' : '0';
  }
  throw new Error('Unsupported type '+typeof(thingy));
}