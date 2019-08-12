/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import express from 'express';
import http from 'http';

const atlasModeProxy = () => {
  const router = new express.Router();

  router.get('/', (req, res) => {
    const options = {
      // host to forward to
      host:   'localhost',
      // port to forward to
      port:   9877,
      // path to forward to
      path:   '/mode',
      // request method
      method: req.method,
      // headers to send
      headers: req.headers
    };

    const proxy = http.request(options, (cres) => {
      res.writeHead(cres.statusCode, cres.headers);
      cres.pipe(res, {
        end: true
      });
    });

    req.pipe(proxy, {
      end: true
    });
  });

  router.post('/', (req, res) => {
    const options = {
      // host to forward to
      host:   'localhost',
      // port to forward to
      port:   9877,
      // path to forward to
      path:   '/mode',
      // request method
      method: req.method,
      // headers to send
      headers: req.headers
    };

    const proxy = http.request(options, (cres) => {
      res.writeHead(cres.statusCode, cres.headers);
      cres.pipe(res, {
        end: true
      });
    });

    req.pipe(proxy, {
      end: true
    });
  });

  return router;
};

export default atlasModeProxy;
