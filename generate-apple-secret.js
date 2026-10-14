const jwt = require('jsonwebtoken');
const fs = require('fs');

const privateKey = fs.readFileSync('/Users/bunyasit/Downloads/Apple Auth Key UX58TBMZ6X.p8');

const token = jwt.sign({
  iss: '7KZJFT35ZX',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 15777000,
  aud: 'https://appleid.apple.com',
  sub: 'com.passionseed.app'
}, privateKey, {
  algorithm: 'ES256',
  keyid: 'UX58TBMZ6X'
});

console.log(token);
