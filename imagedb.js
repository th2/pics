const fs = require('fs-extra');
const util = require('util');
const log = require('./logger.js').log;
const Dropbox = require('dropbox').Dropbox;
const fetch = require('node-fetch');
const dbx = new Dropbox({ accessToken: require('./secrets.json').dropbox_token, fetch: fetch });

module.exports.getImage = (url, res) => {
    fs.readFile('./cache/link' + url, 'utf8', function (err, data) {
      if (err) cacheImageFromAPI(url, res);
      else if (data === '404') res.sendStatus(404);
      else res.redirect(data);
    });
}

module.exports.getThumb = (url, res) => {
    url = url.substring(7); // strip '/thumbs'
    fs.mkdirpSync('./cache/thumb' + url.substring(0, url.lastIndexOf('/')));
  
    res.sendFile(url, { root: './cache/thumb', dotfiles: 'deny' }, (err) => {
        if (err) {
            if (err.statusCode === 404) {
              cacheThumbFromAPI(url, res);
            } else {
              logger.error('error thumb: ' + url + ':' + util.inspect(err));
              res.sendStatus(404);
            }
        }
    });
}
  
function cacheImageFromAPI(url, res) {
    if (url.includes('/undefined')) {
      log.error('cacheImageFromAPI undefined: ' + url);
      return false;
    }
  
    dbx.sharingListSharedLinks({path: url})
    .then(function (response) {
      if (response.result.links.length === 0) {
        dbx.sharingCreateSharedLinkWithSettings({path: url}).then(() => cacheImageFromAPI(url, res));
      } else {
        var dbUri = response.result.links[0].url.replace('dl=0', 'raw=1');
        var cacheUrl = './cache/link' + url;
        fs.mkdirpSync(cacheUrl.substring(0, cacheUrl.lastIndexOf('/')));
        fs.writeFile('./cache/link' + url, dbUri, 'utf8', (err) => {
          if (err) { return log.error('cacheImageFromAPI save cache error: ' + url); }
          log.info('cacheImageFromAPI saved cache: ' + url + ':' + dbUri);
          res.redirect(dbUri);
        });
      }
    })
    .catch((err) => {
      log.error('cacheImageFromAPI sharingListSharedLinks error: ' + url + ' ' + err);
      res.sendStatus(404);
    });
}

function cacheThumbFromAPI (url, res) {
    log.info('cacheThumbFromAPI: ' + url);
    var cacheUrl = './cache/thumb' + url;
    dbx.filesGetThumbnail({path: '/images' + url, size: 'w128h128'})
    .then(function (response) {
        fs.writeFile(cacheUrl, response.result.fileBinary, 'binary', function (err) {
            if (err) { return log.error('cacheThumbFromAPI save thumb error: ' + url); }
            res.contentType('image/jpeg');
            res.end(response.result.fileBinary, 'binary');
        });
    })
    .catch(function (err) {
      log.error('cacheThumbFromAPI error thumb db api: ' + url + ':' + err);
      res.sendStatus(404);
    });
}
