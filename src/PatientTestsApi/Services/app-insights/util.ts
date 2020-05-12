/**
 * Stripped down utility class from NodeJS SDK for App Insights
 */
export class Util {
  public static MAX_PROPERTY_LENGTH = 8192;

  /**
   * helper method to access userId and sessionId cookie
   */
  public static getCookie(name: string, cookie: string): string {
    let value = '';
    if (name && name.length && typeof cookie === 'string') {
      const cookieName = name + '=';
      const cookies = cookie.split(';');

      for (let c of cookies) {
        c = Util.trim(c);
        if (c && c.indexOf(cookieName) === 0) {
          value = c.substring(cookieName.length, c.length);
          break;
        }
      }
    }

    return value;
  }

  /**
   * helper method to trim strings (IE8 does not implement String.prototype.trim)
   */
  public static trim(str: string): string {
    if (typeof str === 'string') {
      return str.replace(/^\s+|\s+$/g, '');
    } else {
      return '';
    }
  }

  /**
   * generate a random 32bit number (-0x80000000..0x7FFFFFFF).
   */
  public static random32(): number {
    return (0x100000000 * Math.random()) | 0;
  }

  /**
   * generate a random 32bit number (0x00000000..0xFFFFFFFF).
   */
  public static randomu32(): number {
    return Util.random32() + 0x80000000;
  }

  /**
   * generate W3C-compatible trace id
   * https://github.com/w3c/distributed-tracing/blob/master/trace_context/HTTP_HEADER_FORMAT.md#trace-id
   */
  public static w3cTraceId() {
    const hexValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

    // rfc4122 version 4 UUID without dashes and with lowercase letters
    let oct = '';
    let tmp;
    for (let a = 0; a < 4; a++) {
      tmp = Util.random32();
      oct +=
        hexValues[tmp & 0xF] +
        hexValues[tmp >> 4 & 0xF] +
        hexValues[tmp >> 8 & 0xF] +
        hexValues[tmp >> 12 & 0xF] +
        hexValues[tmp >> 16 & 0xF] +
        hexValues[tmp >> 20 & 0xF] +
        hexValues[tmp >> 24 & 0xF] +
        hexValues[tmp >> 28 & 0xF];
    }

    // "Set the two most significant bits (bits 6 and 7) of the clock_seq_hi_and_reserved to zero and one, respectively"
    const clockSequenceHi = hexValues[8 + (Math.random() * 4) | 0];
    return oct.substr(0, 8) + oct.substr(9, 4) + '4' + oct.substr(13, 3) + clockSequenceHi + oct.substr(16, 3) + oct.substr(19, 12);
  }
}
