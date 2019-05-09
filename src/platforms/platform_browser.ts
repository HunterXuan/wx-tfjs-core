/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
import { ENV } from '../environment';
import { Platform } from './platform';
/// <reference path="./wx.d.ts">
function generateResponse(res: any) {
  let header = res.header || {};
  return {
    ok: ((res.statusCode / 200) | 0) === 1, // 200-299
    status: res.statusCode,
    statusText: res.errMsg,
    url: '',
    clone: () => {
      return generateResponse(res);
    },
    text: () => Promise.resolve(String.fromCharCode.apply(null, new Uint8Array(res.data))),
    json: () => {
      var json = {};
      try {
        json = JSON.parse(String.fromCharCode.apply(null, new Uint8Array(res.data)));
      }
      catch (err) {
        console.error(err);
      }
      return Promise.resolve(json);
    },
    arrayBuffer: () => Promise.resolve(res.data),
    blob: () => Promise.resolve(res.data),
    headers: {
      keys: () => Object.keys(header),
      entries: () => {
        let all = [];
        for (let key in header) {
          if (header.hasOwnProperty(key)) {
            all.push([key, header[key]]);
          }
        }
        return all;
      },
      get: (n: string) => header[n.toLowerCase()],
      has: (n: string) => n.toLowerCase() in header
    }
  };
}

export class PlatformBrowser implements Platform {
  fetch(path: string, init?: RequestInit): Promise<Response> {
    return new Promise(function (resolve, reject) {
      wx.request({
        url: path,
        header: init.headers as any || {},
        data: init.body || {},
        method: init.method as any || 'GET',
        dataType: '',
        responseType: 'arraybuffer',
        success: function (res: any) {
          resolve(generateResponse(res) as any)
        },
        fail: function (res: any) {
          reject(generateResponse(res))
        }
      })
    })
  }
}

if (ENV.get('IS_BROWSER')) {
  ENV.setPlatform('browser', new PlatformBrowser());
}
