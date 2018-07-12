module.exports = {
    'GET /': async (ctx, next) => {
        let user = ctx.state.user;
        if (user) {
            ctx.render('room.html', {
                user: user
            });
        } else {
            ctx.response.redirect('/signin');
        }
    },
    'POST /header': async(ctx, next)=>{
      logger.info({
        body:ctx.request.body,
        files:ctx.request.files,
        fields:ctx.request.fields,
        query:ctx.request.query,
      });
    },
    'POST /upload': async(ctx, next)=>{
      logger.info({
        body:ctx.request.body,
        files:ctx.request.files,
        fields:ctx.request.fields,
        query:ctx.request.query,
      });
      const file = ctx.request.files[0];
      const fs= require('fs');
      const fields = ctx.request.fields;
      const reader = fs.createReadStream(file.path);
      const stream = fs.createWriteStream(`out-${fields.md5}.txt`, {flags: 'a'});
      ctx.rest('abcdef+')
    },
};
