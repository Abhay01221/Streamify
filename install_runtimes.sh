#!/bin/sh
# Install all required language runtimes into self-hosted Piston
BASE="http://localhost:2000/api/v2"

install_runtime() {
  LANG=$1
  VER=$2
  echo "Installing $LANG $VER..."
  node -e "
const http = require('http');
const data = JSON.stringify({language:'$LANG',version:'$VER'});
const req = http.request({hostname:'localhost',port:2000,path:'/api/v2/packages',method:'POST',headers:{'Content-Type':'application/json','Content-Length':data.length}},res=>{
  let body='';
  res.on('data',d=>body+=d);
  res.on('end',()=>console.log('$LANG $VER:', res.statusCode, body.substring(0,100)));
});
req.on('error',e=>console.error('Error:',$LANG,e.message));
req.write(data);
req.end();
" 2>&1
  sleep 2
}

echo "=== Available runtimes before install ==="
node -e "
const http = require('http');
http.get('http://localhost:2000/api/v2/runtimes',res=>{let b='';res.on('data',d=>b+=d);res.on('end',()=>console.log(b.substring(0,200)));});
"
sleep 1

install_runtime python 3.10.0
install_runtime javascript 18.15.0
install_runtime typescript 5.0.3
install_runtime java 15.0.2
install_runtime cpp 10.2.0
install_runtime go 1.16.2
install_runtime rust 1.50.0
install_runtime c 10.2.0
install_runtime csharp 6.12.0

echo ""
echo "=== Waiting for installs to complete (60s) ==="
sleep 60

echo "=== Available runtimes after install ==="
node -e "
const http = require('http');
http.get('http://localhost:2000/api/v2/runtimes',res=>{let b='';res.on('data',d=>b+=d);res.on('end',()=>console.log(b));});
"
sleep 1

echo ""
echo "=== Test: print(1+1) in Python ==="
node -e "
const http = require('http');
const data = JSON.stringify({language:'python',version:'3.10.0',files:[{content:'print(1+1)'}],stdin:''});
const req = http.request({hostname:'localhost',port:2000,path:'/api/v2/execute',method:'POST',headers:{'Content-Type':'application/json','Content-Length':data.length}},res=>{
  let body='';
  res.on('data',d=>body+=d);
  res.on('end',()=>console.log('Result:', body));
});
req.write(data);
req.end();
"
sleep 3
