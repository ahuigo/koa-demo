//let conf = require(global.ROOT_DIR + '/conf/conf')
let conf = require('../conf/conf')
const crypto = require('crypto');
const version = '0';

module.exports = {
  genGsid(user) {
    let userstr = JSON.stringify(user)
    let token = this.genToken(userstr)
    let gsid = version+Buffer.from(token+userstr).toString('base64')
    return gsid
  },
  genToken(userstr){
    let md5 = this.md5(userstr+ conf.app_key)
    let token = md5.slice(0, 6)
    return token
  },

  md5(s){
    const hash = crypto.createHash('md5');
    hash.update(s)
    return hash.digest('hex')
  },
  base64(s){
    return Buffer.from(s, 'base64').toString()
  },
  base64_decode(s){
    return Buffer.from(s).toString('base64')
  },
  parseGsid(gsid) {
    if (!gsid || gsid[0]!==version) {
      return;
    }
    try{
      let rawGsid = Buffer.from(gsid.slice(1), 'base64').toString()
      let token = rawGsid.slice(0,6)
      let userstr = rawGsid.slice(6)
      if(token !== this.genToken(userstr)){
        logger.error('Verified token failed')
        return
      }
      let user = JSON.parse(userstr);
      return user;
    }catch(e){
      console.log(e)
    }
  }
}