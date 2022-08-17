var http = require('http');
var url = require('url');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  var q = url.parse(req.url, true);
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('Hello World!');
  res.end();
  res.write(q.href);
  res.end();
}).listen(8080);

var fs = require('fs');

fs.readFile('demofile.txt', 'utf8', function(err, data) {
  if (err) throw err;
  console.log(data);
});
