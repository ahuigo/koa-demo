const url = require('url');

const ws = require('ws');

const Cookies = require('cookies');

const Koa = require('koa');

const bodyParser = require('koa-bodyparser');

const controller = require('./controller');

const templating = require('./templating');

const WebSocketServer = ws.Server;

const app = new (require('koa'))()

const crypt = require('./lib/crypt')

global.ROOT_DIR = __dirname;

// logger
logger = require('tracer').dailyfile({
  root: './log', maxLogFiles: 10, allLogsFileName: 'myAppName',
  transport: function (data) {
    console.log(data.output);
  },
});

// log request URL:
app.use(async (ctx, next) => {
  console.log(`Process ${ctx.request.method} ${ctx.request.url}...`);
  //console.debug(next);
  await next();
});


// parse user from cookie:
app.use(async (ctx, next) => {
  ctx.state.user = parseUser(ctx.cookies.get('gsid') || '');
  await next();
});

// restful
app.use(async (ctx, next) => {
    logger.debug('restful')
  if (ctx.request.path.startsWith('/api/') || ctx.request.accepts('json')) {
    ctx.rest = (data) => {
      ctx.response.type = 'application/json';
      ctx.response.body = JSON.stringify(data);
    }
    ctx.error = function (message, extra) {
      throw { message, extra, }
    }
    try {
      await next();
    } catch (e) {
      console.log(e)
      ctx.response.status = 400;
      ctx.response.type = 'application/json';
      ctx.response.body = {
        msg: e.message || 'internal:unknown_error',
        extra: e.extra || '',
      };
    }
  } else {
    await next();
  }
});

// static file support:
let staticFiles = require('./static-files');
app.use(staticFiles('/static/', __dirname + '/static'));

// parse request body:
//app.use(bodyParser());
var body = require('koa-better-body')
app.use(body())

// add nunjucks as view:
app.use(templating('views', {
  noCache: true,
  watch: true
}));

// add controller middleware:
app.use(controller());

let server = app.listen(3000);

function parseUser(obj) {
  if (!obj) {
    return;
  }
  console.log('try parse: ' + obj);
  let s = '';
  if (typeof obj === 'string') {
    s = obj;
  } else if (obj.headers) {
    let cookies = new Cookies(obj, null);
    s = cookies.get('gsid');
  }
  if (s) {
    try {
      let user = crypt.parseGsid(s);
      console.log(`User: ${user.name}, ID: ${user.uid}`);
      return user;
    } catch (e) {
      // ignore
    }
  }
}

function createWebSocketServer(server, onConnection, onMessage, onClose, onError) {
  let wss = new WebSocketServer({
    server: server
  });
  wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
      client.send(data);
    });
  };
  onConnection = onConnection || function () {
    console.log('[WebSocket] connected.');
  };
  onMessage = onMessage || function (msg) {
    console.log('[WebSocket] message received: ' + msg);
  };
  onClose = onClose || function (code, message) {
    console.log(`[WebSocket] closed: ${code} - ${message}`);
  };
  onError = onError || function (err) {
    console.log('[WebSocket] error: ' + err);
  };
  wss.on('connection', function (ws) {
    let location = url.parse(ws.upgradeReq.url, true);
    console.log('[WebSocketServer] connection: ' + location.href);
    ws.on('message', onMessage);
    ws.on('close', onClose);
    ws.on('error', onError);
    if (location.pathname !== '/ws/chat') {
      // close ws:
      ws.close(4000, 'Invalid URL');
    }
    // check user:
    let user = parseUser(ws.upgradeReq);
    if (!user) {
      ws.close(4001, 'Invalid user');
    }
    ws.user = user;
    ws.wss = wss;
    onConnection.apply(ws);
  });
  console.log('WebSocketServer was attached.');
  return wss;
}

var messageIndex = 0;

function createMessage(type, user, data) {
  messageIndex++;
  return JSON.stringify({
    id: messageIndex,
    type: type,
    user: user,
    data: data
  });
}

function onConnect() {
  let user = this.user;
  let msg = createMessage('join', user, `${user.name} joined.`);
  this.wss.broadcast(msg);
  // build user list:
  let users = this.wss.clients.map(function (client) {
    return client.user;
  });
  this.send(createMessage('list', user, users));
}

function onMessage(message) {
  console.log(message);
  if (message && message.trim()) {
    let msg = createMessage('chat', this.user, message.trim());
    this.wss.broadcast(msg);
  }
}

function onClose() {
  let user = this.user;
  let msg = createMessage('left', user, `${user.name} is left.`);
  this.wss.broadcast(msg);
}

app.wss = createWebSocketServer(server, onConnect, onMessage, onClose);

console.log('app started at port 3000...');
