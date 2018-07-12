'use strict';
// sign in:

var index = 0;
let crypt = require('../lib/crypt')


module.exports = {
  'GET /signin': async (ctx, next) => {
    let names = '甲乙丙丁戊己庚辛壬癸';
    let name = names[index % 10];
    ctx.render('signin.html', {
      name: `路人${name}`
    });
  },

  'POST /signin': async (ctx, next) => {
    index++;
    let conf = require(global.ROOT_DIR + '/conf/conf')
    let users = conf.users

    logger.info([ctx.request.body]);
    logger.info([ctx.request.files]);
    logger.info([ctx.request.fields]);
    let uid = ctx.request.fields.uid || '';
    let password = ctx.request.fields.password || '';
    let name = ctx.request.fields.name || '';

    logger.info([users, index]);
    (uid in users) || ctx.error('学号不存在');
    password === users[uid].password || ctx.error('密码错误');
    name === users[uid].name || ctx.error('姓名错误');

    let gsid = crypt.genGsid(users[uid])
    logger.info(`Set cookie gsid: ` + gsid);
    ctx.cookies.set('gsid', gsid);
    ctx.rest({
      msg: 'login success'
    });
  },

  'GET /signout': async (ctx, next) => {
    ctx.cookies.set('gsid', '');
    ctx.response.redirect('/signin');
  }
};
