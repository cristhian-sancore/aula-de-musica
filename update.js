const fs = require('fs');
const stack = JSON.parse(fs.readFileSync('stack_59.json'));
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
fetch('https://PORTAINER.CRISTHIANSANCORE.COM.BR/api/stacks/59?endpointId=3', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'ptr_ywG6wVg3F1/HEqFeCLac1NT2hZez1PnpJ+aZbkptIA0='
  },
  body: JSON.stringify({
    StackFileContent: stack.StackFileContent,
    Env: [],
    Prune: false,
    PullImage: true
  })
})
.then(res => res.json())
.then(console.log)
.catch(console.error);
