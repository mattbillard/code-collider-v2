/**
 * SOLUTION 1 - <base> tag
 *
 * This solution relies on a "creative" use of the HTML <base> tag.
 * After requesting WEBSITE1's HTML, it first sets <base href="${WEBSITE2}/"> and then injects WEBSITE2's HTML
 * causing all of WEBSITE2's resources to be requested from WEBITE2's domain
 *
 * There are a few disadvantages of this approach
 * - Base tags are not meant to be used like this, so it's confusing
 * - Content is loaded from 2 domains. Also very non-standard. Potentially leading to CORS issues
 * - If some of WEBSITE1's content loads slowly, it could mistakenly request it from WEBSITE2
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

router.use('/', (req, res) => {
  const url = WEBSITE1 + req.path;
  const method = req.method;
  const body = req._body ? JSON.stringify(req.body) : undefined;

  const headers = req.headers;
  headers['accept-encoding'] = 'identity'; // Request non-gzipped code, so we can alter the HTML below and inject our own code]
  delete headers['host'];

  const proxy = request({
    body,
    headers,
    method,
    url,
    /* proxy: config.proxy */
  });

  proxy.on('response', (proxyRes) => {
    const statusCode = proxyRes.statusCode;
    // prettier-ignore
    const color = 
      statusCode >= 200 && statusCode < 300 ? 'green' : 
      statusCode > 400 ? 'red' : 
      'yellow';

    console.log(`${chalk[color](statusCode)} ${url}`);

    // Non-HTML files
    const contentType = proxyRes.headers['content-type'];
    if (!contentType || !contentType.includes('html')) {
      setHeaders(proxyRes, res);
      proxyRes.pipe(res);

      // HTML files
    } else {
      const dataArr = [];

      proxyRes.on('data', (chunk) => dataArr.push(chunk));
      proxyRes.on('end', () => {
        requestWebsite2Html((html2) => {
          const html1 = Buffer.concat(dataArr).toString();
          const html2in1 = injectWebsite2Into1(html1, html2);

          setHeaders(proxyRes, res);
          res.end(html2in1);
        });
      });
    }
  });

  proxy.on('error', (error) => {
    console.error(`${chalk.red('ERROR:')} ${req.originalUrl}`, error);
  });
});

const requestWebsite2Html = (callback) => {
  request({ url: WEBSITE2 }, (error, response, body) => {
    if (error) {
      console.error(`${chalk.red('ERROR:')} ${url}`, error);
      return;
    }

    callback(body);
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
    .replace('</html>', '')
    .replace(/href="/gi, `href="${WEBSITE2}/`)
    .replace(/src="/gi, `src="${WEBSITE2}/`);

  // NOTE: <base> ensures assets referenced by JS or CSS load properly
  const html2in1 = html1
    .replace(new RegExp(WEBSITE1, 'gi'), '') // Ensure all absolute links to relative so links don't navigate to the actual website
    .replace(
      '</body>',
      `
        <base id="WEBSITE2_BASE" href="${WEBSITE2}/">
        <script>
          window.addEventListener("load", () => {
            document.getElementById('WEBSITE2_BASE').remove();
          });
        </script>

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

const setHeaders = (proxyRes, res) => {
  delete proxyRes.headers['content-length'];
  res.writeHead(proxyRes.statusCode, proxyRes.headers);
};

module.exports = router;
