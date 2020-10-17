/**
 * SOLUTION 2
 *
 * This solution first asks WEBSITE1 for every resourse.
 * If it is 404 not found, it remembers this so it can avoid asking in the future,
 * and then asks WEBSITE2 for the resource.
 *
 */

'use strict';

const chalk = require('chalk');
const express = require('express');
const request = require('request');
const router = express.Router();

const config = require('../config');
const { WEBSITE1, WEBSITE2 } = config;

// Allow proxying self-signed SSL certificates
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

const hashHapOf404s = {};

router.use('/', (req, res) => {
  const url1 = WEBSITE1 + req.path;
  const url2 = WEBSITE2 + req.path;

  // If we already know WEBSITE1 will be 404, just ask WEBSITE2
  if (hashHapOf404s[url1]) {
    requestFromUrl(req, url2, (proxyRes2) => {
      setHeaders(proxyRes2, res);
      proxyRes2.pipe(res);
    });
    return;
  }

  // Ask WEBSITE1
  requestFromUrl(req, url1, (proxyRes1) => {
    const statusCode = proxyRes1.statusCode;
    const contentType = proxyRes1.headers['content-type'];

    // 404 -> remember is 404 and ask WEBSITE2
    if (statusCode === 404) {
      hashHapOf404s[url1] = true;
      requestFromUrl(req, url2, (proxyRes2) => {
        setHeaders(proxyRes2, res);
        proxyRes2.pipe(res);
      });

      // Non-HTML files -> send
    } else if (!contentType || !contentType.includes('html')) {
      setHeaders(proxyRes1, res);
      proxyRes1.pipe(res);

      // HTML file -> combine with WEBSITE2 HTML
    } else {
      requestFromUrl(req, url2, (proxyRes2) => {
        const html2in1 = injectWebsite2Into1(proxyRes1.html, proxyRes2.html);
        setHeaders(proxyRes1, res);
        res.end(html2in1);
      });
    }
  });
});

const requestFromUrl = (req, url, callback) => {
  const { _body, body, headers, method } = req;

  const bodyStr = _body === true ? JSON.stringify(body) : undefined;

  headers['accept-encoding'] = 'identity'; // Request non-gzipped code, so we can alter the HTML below and inject our own code]
  delete headers['host']; // So the request doesn't seem to come from localhost

  const proxy = request({ body: bodyStr, headers, method, url });

  proxy.on('error', (error) => {
    console.error(`${chalk.red('ERROR:')} ${url}`, error);
  });

  proxy.on('response', (proxyRes) => {
    logResponse(url, proxyRes);

    // non-HTML -> return proxyRes so we can pipe it
    const contentType = proxyRes.headers['content-type'];
    if (!contentType || !contentType.includes('html')) {
      callback(proxyRes);

      // HTML -> get HTML as string
    } else {
      const dataArr = [];
      proxyRes.on('data', (chunk) => dataArr.push(chunk));
      proxyRes.on('end', () => {
        proxyRes.html = Buffer.concat(dataArr).toString();
        callback(proxyRes);
      });
    }
  });
};

const injectWebsite2Into1 = (html1, html2) => {
  const html2Modified = html2
    .replace('<!DOCTYPE html>', '')
    .replace(/<html[\w\W]*?>/gi, '')
    .replace(/<head[\w\W]*?>/gi, '')
    .replace(/<meta[\w\W]*?>/gi, '')
    .replace('</head>', '')
    .replace('<body', '<div class="WEBSITE2"')
    .replace('</body>', '</div>')
    .replace('</html>', '');

  const html2in1 = html1
    .replace(new RegExp(WEBSITE1, 'gi'), '') // Ensure all absolute links to relative so links don't navigate to the actual website
    .replace(
      '</body>',
      `
        <style>
          .WEBSITE2 {
            position: fixed;
            top: 0;
            width: 100vw;
            z-index: 999999;
            pointer-events: none;             /* Allow click through to WEBSITE1 */
            text-shadow: 1px 1px 1px black;
          }
        
          .WEBSITE2 * {
            background: none !important;      /* Make sure we can see WEBSITE1 */
          }
        
          .WEBSITE2 a {
            pointer-events: initial;          /* Links should still be clickable */
          }
        </style>
    
        ${html2Modified}
      </body>
    `,
    );

  return html2in1;
};

const logResponse = (url, res) => {
  const statusCode = res.statusCode;

  // prettier-ignore
  const color = 
    statusCode >= 200 && statusCode < 300 ? 'green' : 
    statusCode > 400 ? 'red' : 
    'yellow';

  console.log(`${chalk[color](statusCode)} ${url}`);
};

const setHeaders = (proxyRes, res) => {
  delete proxyRes.headers['content-length'];
  res.writeHead(proxyRes.statusCode, proxyRes.headers);
};

module.exports = router;
