/// <reference path="./wx.d.ts">
function generateResponse(res:any) {
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
      get: (n:string) => header[n.toLowerCase()],
      has: (n:string) => n.toLowerCase() in header
    }
  };
}

async function fetch(input:any, init:any): Promise<any> {
  return new Promise(function(resolve, reject) {
    wx.request({
      url: input,
      header: init.headers || {},
      data: init.body || {},
      method: init.method || 'GET',
      dataType: '',
      responseType: 'arraybuffer',
      success: function(res:any) {
        resolve(generateResponse(res))
      },
      fail: function(res:any) {
        reject(generateResponse(res))
      }
    })
  })
}

export {
  fetch,
};
