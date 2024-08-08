// This suppresses error in the console caused by runtime.sendMessage expecting a response in the callback that it will never get
// https://stackoverflow.com/questions/71520198/manifestv3-new-promise-error-the-message-port-closed-before-a-response-was-rece
import { isBrowserCompatible } from '../../../misc/browserCompatible';

const acceptableErrors = [
  /the message channel closed before/i,
  /the message port closed before/i,
  /receiving end does not exist/i,
];

// TODO: Fix msg type
export function sendRuntimeMessage(msg: any) {
  if (!isBrowserCompatible) return;

  return new Promise((resolve, reject) => {
    // @ts-ignore
    chrome.runtime.sendMessage(
      process.env.NEXT_PUBLIC_EXTENSION_ID,
      msg,
      (res) => {
        // @ts-ignore
        let err2 = chrome.runtime.lastError;

        if (!err2) {
          resolve(res);
        } else if (acceptableErrors.some((x) => err2?.message?.match(x))) {
          console.log(err2.message);
        } else {
          err2 = new Error(err2.message);
          reject(err2);
        }
      },
    );
  });
}
