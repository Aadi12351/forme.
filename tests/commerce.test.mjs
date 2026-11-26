import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {createCommerce} from '../commerce.mjs';
test('commerce protects money, stock and customer records',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'forme-test-'));
 fs.mkdirSync(path.join(dir,'data'));
 fs.writeFileSync(path.join(dir,'data/products.json'),JSON.stringify([{id:'test-tee',name:'Test tee',active:true,price:350,cost:100,image:'/assets/test.webp',sizes:{M:3,L:1},color:'Black'}]));
 process.env.SESSION_SECRET='test-session-secret-with-more-than-32-characters';process.env.STORE_DATA_DIR=path.join(dir,'data');process.env.CHECKOUT_MODE='demo';delete process.env.APP_URL;
 const payments=new Map();let gatewayOrders=0,shipments=0,refunds=0;const sentMails=[];const refundRecords=new Map();let refundMockStatus="processed";let shippingScenario="failure",trackingDelivered=false;const shippingCalls=new Map();
 const gatewayRequest=async(endpoint,method,data)=>{
 if(endpoint==='/orders'){const id='order_'+(++gatewayOrders);return{id,amount:data.amount,currency:'INR'}}
 if(endpoint.endsWith('/refund')){refunds++;const r={id:'rfnd_mock'+refunds,status:refundMockStatus,amount:data.amount,payment_id:endpoint.split('/')[2]};refundRecords.set(r.id,r);return r}if(endpoint.startsWith('/refunds/'))return refundRecords.get(endpoint.split('/')[2]);
 if(endpoint.startsWith('/payments/'))return payments.get(endpoint.split('/')[2]);
 if(endpoint.endsWith('/payments'))return {items:[...payments.values()]};
 throw Error('Unexpected mocked call '+endpoint);
 };
 const store=createCommerce(dir,req=>req.headers['x-admin']==='yes',{allowInsecureLiveTests:true,gatewayRequest,shiprocketRequest:async(endpoint,method,data)=>{
 if(endpoint.includes('serviceability'))return{data:{available_courier_companies:[{etd:'5 days'}]}};
 shippingCalls.set(endpoint,(shippingCalls.get(endpoint)||0)+1);
 if(shippingScenario==='success'){
 if(endpoint==='/orders/create/adhoc')return{shipment_id:123,order_id:456};
 if(endpoint==='/orders/create/return')return{shipment_id:789,order_id:777};
 if(endpoint==='/courier/assign/awb')return{response:{data:{awb_code:'AWB'+data.shipment_id,courier_name:'Mock courier'}}};
 if(endpoint==='/courier/generate/pickup')return{pickup_status:1,response:{pickup_scheduled_date:'test date'}};
 if(endpoint==='/courier/generate/label')return{label_url:'https://example.test/label.pdf'};
 if(endpoint==='/manifests/generate')return{manifest_url:'https://example.test/manifest.pdf'};
 if(endpoint==='/orders/print/invoice')return{invoice_url:'https://example.test/invoice.pdf'};
 if(endpoint.startsWith('/courier/track/'))return{tracking_data:{shipment_track:[{current_status:trackingDelivered?'Delivered':'In Transit'}],shipment_track_activities:[]}};
 }
 shipments++;throw Error('Unknown external booking');
 },sendEmail:async mail=>{sentMails.push(mail);return{id:'mail'}}});
 const server=http.createServer(async(req,res)=>{if(!await store.handler(req,res,new URL(req.url,'http://test').pathname)){res.writeHead(404);res.end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 async function request(route,body,headers={},origin=true){const r=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json',...(origin?{Origin:process.env.APP_URL||base}:{})}),...headers},body:body===undefined?undefined:JSON.stringify(body)});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}return{status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]}}
 const items=[{id:'test-tee',size:'M',quantity:1,price:1}];
 const address={name:'Test Buyer',email:'buyer@example.test',phone:'9876543210',house:'12',building:'',street:'Example Road',landmark:'',city:'Mumbai',state:'Maharashtra',pincode:'400001',notes:''};
 const payload={items,address,acceptTerms:true};
 let guest,customer;
 try{
 await t.test('server prices and strict free shipping threshold',async()=>{
 let r=await request('/api/store/quote',{items});assert.equal(r.data.total,42900);assert.equal(r.data.subtotal,35000);assert.equal(r.data.items[0].unitCost,undefined);
 store.write([{...store.read()[0],price:999}]);r=await request('/api/store/quote',{items});assert.equal(r.data.shipping,7900);
 store.write([{...store.read()[0],price:1000}]);r=await request('/api/store/quote',{items});assert.equal(r.data.shipping,0);
 store.write([{...store.read()[0],price:350}]);
 });

 await t.test('tax configuration is explicit and order totals remain exact',async()=>{
 await request('/api/commerce/settings',{taxRate:5,taxInclusive:false,taxShipping:false,taxConfirmed:true},{'X-Admin':'yes'});
 let q=(await request('/api/store/quote',{items})).data;assert.equal(q.tax,1750);assert.equal(q.total,44650);
 await request('/api/commerce/settings',{taxShipping:true},{'X-Admin':'yes'});q=(await request('/api/store/quote',{items})).data;assert.equal(q.tax,2145);assert.equal(q.total,45045);
 await request('/api/commerce/settings',{taxRate:0,taxInclusive:true,taxShipping:false,taxConfirmed:false},{'X-Admin':'yes'});
 });

 await t.test('reject invalid origin and private admin endpoints',async()=>{assert.equal((await request('/api/store/register',null)).status,400);assert.equal((await request('/api/store/contact',[])).status,400);assert.equal((await request('/api/store/register',{}, {},false)).status,403);assert.equal((await request('/api/commerce/dashboard')).status,401)});
 await t.test('account hashes and durable authenticated session',async()=>{
 const r=await request('/api/store/register',{name:'Test Buyer',email:address.email,password:'unique-long-passphrase'});assert.equal(r.status,200);customer=r.cookie;assert.equal((await request('/api/store/session',undefined,{Cookie:customer})).data.customer.email,address.email);
 const row=store.db.prepare('SELECT * FROM customers').get();assert.notEqual(row.hash,'unique-long-passphrase');assert.equal(row.hash.length,128);
 assert.equal((await request('/api/store/login',{email:address.email,password:'incorrect-long-pass'})).status,401);
 });
 await t.test('coupons apply once and cannot make negative totals',async()=>{
 assert.equal((await request('/api/commerce/coupons',{code:'LAUNCH',type:'fixed',value:1000,minimum:0,limit:1,expires:'',firstOrder:false,productIds:[],active:true},{'X-Admin':'yes'})).status,200);
 const q=await request('/api/store/quote',{items,coupon:'LAUNCH'});assert.equal(q.data.discount,35000);assert.equal(q.data.total,7900);
 assert.equal((await request('/api/store/quote',{items,coupon:'MISSING'})).status,400);
 });
 await t.test('guest order privacy, idempotency and inventory reservation',async()=>{
 const key=crypto.randomUUID(),r=await request('/api/store/orders',payload,{'Idempotency-Key':key});assert.equal(r.status,201);guest=r.data;
 assert.equal(guest.order.id,'FRM-10001');assert.equal(store.read()[0].sizes.M,2);
 const replay=await request('/api/store/orders',payload,{'Idempotency-Key':key});assert.equal(replay.data.order.id,guest.order.id);assert.equal(store.read()[0].sizes.M,2);
 assert.equal((await request('/api/store/orders/'+guest.order.id)).status,404);
 assert.equal((await request('/api/store/orders/'+guest.order.id,undefined,{'X-Order-Token':guest.token})).status,200);
 assert.equal((await request('/api/store/orders/'+guest.order.id,undefined,{Cookie:customer})).status,404);
 });
 await t.test('cancellation restores stock exactly once',async()=>{
 assert.equal((await request('/api/store/orders/'+guest.order.id+'/cancel',{}, {'X-Order-Token':guest.token})).status,200);assert.equal(store.read()[0].sizes.M,3);
 assert.equal((await request('/api/store/orders/'+guest.order.id+'/cancel',{}, {'X-Order-Token':guest.token})).status,409);assert.equal(store.read()[0].sizes.M,3);
 });
 await t.test('overselling is rejected with concurrent final stock',async()=>{
 const body={...payload,items:[{id:'test-tee',size:'L',quantity:1}]};
 const r=await Promise.all([request('/api/store/orders',body,{'Idempotency-Key':crypto.randomUUID()}),request('/api/store/orders',body,{'Idempotency-Key':crypto.randomUUID()})]);
 assert.equal(r.filter(x=>x.status===201).length,1);assert.equal(r.filter(x=>x.status===409).length,1);assert.equal(store.read()[0].sizes.L,0);
 });
 await t.test('captured payments require signature, correct amount and duplicate-event safety',async()=>{
 process.env.CHECKOUT_MODE='test';process.env.RAZORPAY_KEY_ID='rzp_test_mock';process.env.RAZORPAY_KEY_SECRET='mock-secret';process.env.RAZORPAY_WEBHOOK_SECRET='mock-webhook';process.env.SHIPROCKET_EMAIL='mock@example.test';
 await request('/api/commerce/settings',{pickupPincode:'400001'}, {'X-Admin':'yes'});
 const r=await request('/api/store/orders',payload,{'Idempotency-Key':crypto.randomUUID(),Cookie:customer});assert.equal(r.status,201);const o=r.data;
 const pid='pay_mock';payments.set(pid,{id:pid,order_id:o.gatewayOrder,amount:o.order.total,currency:'INR',status:'captured'});
 const signature=crypto.createHmac('sha256','mock-secret').update(o.gatewayOrder+'|'+pid).digest('hex'),h={'X-Order-Token':o.token};
 assert.equal((await request('/api/store/orders/'+o.order.id+'/resume',{})).status,404);
 assert.equal((await request('/api/store/orders/'+o.order.id+'/resume',{},h)).data.gatewayOrder,o.gatewayOrder);
 process.env.CHECKOUT_MODE='preview';assert.equal((await request('/api/store/orders/'+o.order.id+'/resume',{},h)).status,503);process.env.CHECKOUT_MODE='test';
 assert.equal((await request('/api/store/orders/'+o.order.id+'/verify',{razorpay_order_id:o.gatewayOrder,razorpay_payment_id:pid,razorpay_signature:'bad'},h)).status,403);
 payments.get(pid).amount=1;assert.equal((await request('/api/store/orders/'+o.order.id+'/verify',{razorpay_order_id:o.gatewayOrder,razorpay_payment_id:pid,razorpay_signature:signature},h)).status,409);
 payments.get(pid).amount=o.order.total;const verified=await request('/api/store/orders/'+o.order.id+'/verify',{razorpay_order_id:o.gatewayOrder,razorpay_payment_id:pid,razorpay_signature:signature},h);assert.equal(verified.data.status,'paid');
 const b=JSON.stringify({event:'payment.captured',payload:{payment:{entity:payments.get(pid)}}}),sig=crypto.createHmac('sha256','mock-webhook').update(b).digest('hex');
 for(let n=0;n<2;n++){const response=await fetch(base+'/api/store/payment-webhook',{method:'POST',headers:{'Content-Type':'application/json','X-Razorpay-Signature':sig,'X-Razorpay-Event-Id':'event_mock'},body:b});assert.equal(response.status,200)}
 assert.equal(store.db.prepare('SELECT count(*) n FROM events').get().n,1);
 store.db.prepare("UPDATE orders SET status='out_for_delivery' WHERE id=?").run(o.order.id);
 const replay=await fetch(base+'/api/store/payment-webhook',{method:'POST',headers:{'Content-Type':'application/json','X-Razorpay-Signature':sig,'X-Razorpay-Event-Id':'event_later_delivery'},body:b});assert.equal(replay.status,200);
 assert.equal(store.db.prepare('SELECT status FROM orders WHERE id=?').get(o.order.id).status,'out_for_delivery');
 store.db.prepare("UPDATE orders SET status='paid' WHERE id=?").run(o.order.id);assert.equal(store.db.prepare('SELECT count(*) n FROM outbox WHERE id LIKE ?').get('%'+o.order.id).n,2);
 assert.equal((await request('/api/store/orders',undefined,{Cookie:customer})).data.length,1);
 });

 await t.test('expired reservations restore stock and late capture requires review',async()=>{
 process.env.CHECKOUT_MODE='test';
 const before=store.read()[0].sizes.M;
 const r=await request('/api/store/orders',payload,{'Idempotency-Key':crypto.randomUUID()});assert.equal(r.status,201);const o=r.data;
 store.db.prepare('UPDATE orders SET expires=? WHERE id=?').run(Date.now()-1000,o.order.id);
 await request('/api/store/config');assert.equal(store.read()[0].sizes.M,before);assert.equal((await request('/api/store/orders/'+o.order.id+'/resume',{}, {'X-Order-Token':o.token})).status,409);
 const pid='pay_late';payments.set(pid,{id:pid,order_id:o.gatewayOrder,amount:o.order.total,currency:'INR',status:'captured'});
 const sig=crypto.createHmac('sha256','mock-secret').update(o.gatewayOrder+'|'+pid).digest('hex');
 const verified=await request('/api/store/orders/'+o.order.id+'/verify',{razorpay_order_id:o.gatewayOrder,razorpay_payment_id:pid,razorpay_signature:sig},{'X-Order-Token':o.token});
 assert.equal(verified.data.status,'paid_review');assert.equal(store.read()[0].sizes.M,before);
 });
 await t.test('full refund and stock restoration execute once',async()=>{
 const row=store.db.prepare("SELECT * FROM orders WHERE payment_id='pay_mock'").get(),before=store.read()[0].sizes.M;
 const r=await request('/api/commerce/orders/'+row.id+'/refund',{restock:true},{'X-Admin':'yes'});assert.equal(r.status,200);assert.equal(r.data.status,'refunded');assert.equal(store.read()[0].sizes.M,before+1);
 assert.equal((await request('/api/commerce/orders/'+row.id+'/refund',{restock:true},{'X-Admin':'yes'})).status,409);assert.equal(refunds,1);
 });

 await t.test('zero-total coupon orders do not create a payment and retain the pricing snapshot',async()=>{
 process.env.CHECKOUT_MODE='test';await request('/api/commerce/settings',{shippingFee:0},{'X-Admin':'yes'});const before=gatewayOrders;
 const r=await request('/api/store/orders',{...payload,coupon:'LAUNCH'},{'Idempotency-Key':crypto.randomUUID()});assert.equal(r.status,201);assert.equal(r.data.order.total,0);assert.equal(r.data.order.paymentMethod,'free');assert.equal(gatewayOrders,before);
 const secret=store.db.prepare("SELECT data FROM records WHERE kind='guest_links' AND id=?").get(r.data.order.id);assert.ok(secret);assert.equal(secret.data.includes(r.data.token),false);
 await request('/api/commerce/settings',{shippingFee:79,taxInclusive:false},{'X-Admin':'yes'});
 const viewed=await request('/api/store/orders/'+r.data.order.id,undefined,{'X-Order-Token':r.data.token});assert.equal(viewed.data.pricing.taxInclusive,true);
 assert.equal((await request('/api/store/quote',{items,coupon:'LAUNCH'})).status,400);
 await request('/api/commerce/settings',{taxInclusive:true},{'X-Admin':'yes'});
 });

 await t.test('recovery links are single-use and revoke previous sessions',async()=>{
 process.env.RESEND_API_KEY='mock-email';process.env.APP_URL=base;
 const forgot=await request('/api/store/forgot-password',{email:address.email});assert.equal(forgot.status,200);const mail=sentMails.at(-1);assert.ok(mail.text.includes('/reset-password#'));const token=mail.text.match(/#([a-f0-9]{64})/)[1];
 assert.equal((await request('/api/store/reset-password',{token,password:'new-unique-passphrase'})).status,200);
 assert.equal((await request('/api/store/reset-password',{token,password:'another-passphrase'})).status,400);
 assert.equal((await request('/api/store/session',undefined,{Cookie:customer})).data.customer,null);
 const login=await request('/api/store/login',{email:address.email,password:'new-unique-passphrase'});assert.equal(login.status,200);customer=login.cookie;
 });
 await t.test('owner suspension revokes access without deleting the customer',async()=>{
 const u=(await request('/api/store/session',undefined,{Cookie:customer})).data.customer;
 assert.equal((await request('/api/commerce/customers',{id:u.id,suspended:true},{'X-Admin':'yes'})).status,200);
 assert.equal((await request('/api/store/session',undefined,{Cookie:customer})).data.customer,null);
 assert.equal((await request('/api/store/login',{email:address.email,password:'new-unique-passphrase'})).status,403);
 await request('/api/commerce/customers',{id:u.id,suspended:false},{'X-Admin':'yes'});
 customer=(await request('/api/store/login',{email:address.email,password:'new-unique-passphrase'})).cookie;
 });
 await t.test('COD requires owner opt-in and never creates a gateway charge',async()=>{
 process.env.CHECKOUT_MODE='live';process.env.APP_URL='https://shop.example.test';process.env.RAZORPAY_KEY_ID='rzp_live_mock';process.env.EMAIL_FROM='test@example.test';process.env.SHIPROCKET_PASSWORD='mock-password';
 const complete={legalName:'Test Seller',businessAddress:'Test registered address',businessVerified:true,supportEmail:'test@example.test',whatsapp:'919876543210',grievanceContact:'Test support',bankVerified:true,taxConfirmed:true,shippingVerified:true,pickupLocation:'test-pickup',parcelWeight:0.3,parcelLength:30,parcelBreadth:25,parcelHeight:3,pricesConfirmed:true,inventoryConfirmed:true,policiesApproved:true,codEnabled:true};
 assert.equal((await request('/api/commerce/settings',complete,{'X-Admin':'yes'})).status,200);
 const count=gatewayOrders,r=await request('/api/store/orders',{...payload,paymentMethod:'cod'},{'Idempotency-Key':crypto.randomUUID()});
 assert.equal(r.status,201);assert.equal(r.data.order.paymentMethod,'cod');assert.equal(r.data.order.status,'order_confirmed');assert.equal(gatewayOrders,count);
 assert.equal((await request('/api/store/orders/'+r.data.order.id+'/cancel',{}, {'X-Order-Token':r.data.token})).status,200);
 delete process.env.APP_URL;delete process.env.RESEND_API_KEY;await request('/api/commerce/settings',{codEnabled:false,policiesApproved:false},{'X-Admin':'yes'});
 });


 await t.test('return inspection and size exchange cannot duplicate stock or replacements',async()=>{
 const original=store.db.prepare("SELECT * FROM orders WHERE mode='demo' AND status='demo_confirmed' LIMIT 1").get();
 for(const status of ['packed','shipped','delivered'])assert.equal((await request('/api/commerce/orders/'+original.id+'/status',{status},{'X-Admin':'yes'})).status,200);
 const created=await request('/api/store/orders/'+original.id+'/request',{type:'exchange',reason:'Please exchange size L for M',defective:false},{'X-Admin':'yes'});assert.equal(created.status,201);const id=created.data.id;
 assert.equal((await request('/api/commerce/requests',{id,status:'approved',response:'Approved for inspection'},{'X-Admin':'yes'})).status,200);
 const before=store.read()[0].sizes.L,items=[{id:'test-tee',size:'L',quantity:1}];
 assert.equal((await request('/api/commerce/requests/inspect',{id,items,restock:true,receivedConfirmed:false},{'X-Admin':'yes'})).status,400);
 assert.equal((await request('/api/commerce/requests/inspect',{id,items,restock:true,receivedConfirmed:true},{'X-Admin':'yes'})).status,200);assert.equal(store.read()[0].sizes.L,before+1);
 assert.equal((await request('/api/commerce/requests/inspect',{id,items,restock:true,receivedConfirmed:true},{'X-Admin':'yes'})).status,409);
 const exchange={id,items:[{id:'test-tee',sourceSize:'L',size:'M',quantity:1}],waiveReverseCharge:true},replacement=await request('/api/commerce/requests/exchange',exchange,{'X-Admin':'yes'});assert.equal(replacement.status,201);assert.equal(replacement.data.order.total,0);assert.equal(replacement.data.order.paymentMethod,'exchange');
 assert.equal((await request('/api/commerce/requests/exchange',exchange,{'X-Admin':'yes'})).status,409);
 const viewed=await request('/api/store/orders/'+original.id,undefined,{'X-Admin':'yes'});assert.equal(JSON.stringify(viewed.data).includes('unitCost'),false);assert.equal(viewed.data.requests[0].returnItems,undefined);
 });
 await t.test('partial refunds have a remaining-balance limit and idempotent keys',async()=>{
 const o=store.db.prepare("SELECT * FROM orders WHERE payment_id='pay_late'").get(),key=crypto.randomUUID();
 let r=await request('/api/commerce/orders/'+o.id+'/refund',{amount:10000,refundKey:key},{'X-Admin':'yes'});assert.equal(r.status,200);assert.equal(r.data.refundedAmount,10000);
 const before=refunds;r=await request('/api/commerce/orders/'+o.id+'/refund',{amount:10000,refundKey:key},{'X-Admin':'yes'});assert.equal(r.status,200);assert.equal(refunds,before);
 assert.equal((await request('/api/commerce/orders/'+o.id+'/refund',{amount:o.total,refundKey:crypto.randomUUID()},{'X-Admin':'yes'})).status,400);
 r=await request('/api/commerce/orders/'+o.id+'/refund',{amount:o.total-10000,refundKey:crypto.randomUUID()},{'X-Admin':'yes'});assert.equal(r.data.status,'refunded');assert.equal(r.data.refundedAmount,o.total);
 });
 await t.test('forward and reverse courier workflows are guarded and retry-safe',async()=>{
 shippingScenario='success';process.env.CHECKOUT_MODE='live';process.env.APP_URL='https://shop.example.test';process.env.RESEND_API_KEY='mock-email';
 await request('/api/commerce/settings',{policiesApproved:true,codEnabled:true,returnName:'Test Returns',returnPhone:'9876543210',returnStreet:'Warehouse road',returnCity:'Mumbai',returnState:'Maharashtra',returnPincode:'400001'},{'X-Admin':'yes'});
 const created=await request('/api/store/orders',{...payload,paymentMethod:'cod'},{'Idempotency-Key':crypto.randomUUID()});assert.equal(created.status,201);const id=created.data.order.id;
 assert.equal((await request('/api/commerce/orders/'+id+'/ship',{}, {'X-Admin':'yes'})).status,200);
 assert.equal((await request('/api/commerce/orders/'+id+'/ship',{}, {'X-Admin':'yes'})).status,409);
 assert.equal(shippingCalls.get('/orders/create/adhoc'),1);
 assert.equal((await request('/api/commerce/orders/'+id+'/pickup',{}, {'X-Admin':'yes'})).status,409);
 assert.equal((await request('/api/commerce/orders/'+id+'/assign',{}, {'X-Admin':'yes'})).status,200);
 assert.equal((await request('/api/commerce/orders/'+id+'/manifest',{}, {'X-Admin':'yes'})).status,409);
 for(const action of ['pickup','pickup','label','manifest','invoice'])assert.equal((await request('/api/commerce/orders/'+id+'/'+action,{}, {'X-Admin':'yes'})).status,200);
 assert.equal(shippingCalls.get('/courier/generate/pickup'),1);
 trackingDelivered=true;const track=await request('/api/commerce/orders/'+id+'/refresh-tracking',{}, {'X-Admin':'yes'});assert.equal(track.data.order.status,'delivered');
 const req=await request('/api/store/orders/'+id+'/request',{type:'return',reason:'Approved unused return',defective:false},{'X-Admin':'yes'});assert.equal(req.status,201);const caseId=req.data.id;await request('/api/commerce/requests',{id:caseId,status:'approved',response:'Approved'},{'X-Admin':'yes'});
 const items=[{id:'test-tee',size:'M',quantity:1}];
 assert.equal((await request('/api/commerce/requests/reverse',{id:caseId,items},{'X-Admin':'yes'})).status,200);
 assert.equal((await request('/api/commerce/requests/reverse',{id:caseId,items},{'X-Admin':'yes'})).status,409);
 for(const action of ['reverse-assign','reverse-pickup','reverse-track'])assert.equal((await request('/api/commerce/requests/'+action,{id:caseId},{'X-Admin':'yes'})).status,200);
 assert.equal((await request('/api/commerce/requests/inspect',{id:caseId,items,receivedConfirmed:true,restock:true},{'X-Admin':'yes'})).status,200);
 const view=await request('/api/store/orders/'+id,undefined,{'X-Order-Token':created.data.token});assert.equal(view.data.requests[0].reverseAWB,'AWB789');assert.equal(view.data.requests[0].reverse,undefined);
 assert.equal(shippingCalls.get('/orders/create/return'),1);
 delete process.env.APP_URL;delete process.env.RESEND_API_KEY;await request('/api/commerce/settings',{policiesApproved:false,codEnabled:false},{'X-Admin':'yes'});
 });


 await t.test('signed refund failure webhooks release the hold without claiming a refund',async()=>{
 process.env.CHECKOUT_MODE='test';process.env.RAZORPAY_KEY_ID='rzp_test_mock';
 const created=await request('/api/store/orders',payload,{'Idempotency-Key':crypto.randomUUID()});assert.equal(created.status,201);const o=created.data,pid='pay_async_refund';
 payments.set(pid,{id:pid,order_id:o.gatewayOrder,amount:o.order.total,currency:'INR',status:'captured'});
 const signature=crypto.createHmac('sha256','mock-secret').update(o.gatewayOrder+'|'+pid).digest('hex');
 await request('/api/store/orders/'+o.order.id+'/verify',{razorpay_order_id:o.gatewayOrder,razorpay_payment_id:pid,razorpay_signature:signature},{'X-Order-Token':o.token});
 refundMockStatus='pending';const attempt=await request('/api/commerce/orders/'+o.order.id+'/refund',{amount:10000,refundKey:crypto.randomUUID()},{'X-Admin':'yes'});assert.equal(attempt.data.status,'refund_pending');
 const refund=refundRecords.get(attempt.data.refund.id);refund.status='failed';
 const event=JSON.stringify({event:'refund.failed',payload:{refund:{entity:{id:refund.id}}}}),sig=crypto.createHmac('sha256','mock-webhook').update(event).digest('hex');
 for(let n=0;n<2;n++){const r=await fetch(base+'/api/store/payment-webhook',{method:'POST',headers:{'Content-Type':'application/json','X-Razorpay-Signature':sig,'X-Razorpay-Event-Id':'refund_failure_event'},body:event});assert.equal(r.status,200)}
 const checked=await request('/api/store/orders/'+o.order.id,undefined,{'X-Order-Token':o.token});assert.equal(checked.data.status,'paid');assert.equal(checked.data.refundedAmount,0);
 refundMockStatus='processed';
 });

 await t.test('live checkout stays locked and demo shipments cannot reach courier',async()=>{
 assert.equal((await request('/api/commerce/orders/FRM-10002/ship',{}, {'X-Admin':'yes'})).status,409);assert.equal(shipments,0);
 process.env.CHECKOUT_MODE='live';assert.equal((await request('/api/store/orders',payload,{'Idempotency-Key':crypto.randomUUID()})).status,503);
 });
 await t.test('logout revokes session',async()=>{assert.equal((await request('/api/store/logout',{}, {Cookie:customer})).status,200);assert.equal((await request('/api/store/session',undefined,{Cookie:customer})).data.customer,null)});
 }finally{await new Promise(r=>server.close(r));store.close();delete process.env.STORE_DATA_DIR;if(dir.startsWith(path.join(os.tmpdir(),'forme-test-')))fs.rmSync(dir,{recursive:true,force:true})}
});


test('deleting the entire catalogue does not resurrect seed products after restart',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'forme-test-empty-'));
 fs.mkdirSync(path.join(dir,'data'));fs.writeFileSync(path.join(dir,'data/products.json'),JSON.stringify([{id:'seed',name:'Seed',price:350,sizes:{M:1},active:true}]));
 process.env.STORE_DATA_DIR=path.join(dir,'data');
 let first,second;
 try{first=createCommerce(dir,()=>false);assert.equal(first.read().length,1);first.write([]);first.close();first=null;second=createCommerce(dir,()=>false);assert.equal(second.read().length,0)}finally{first?.close();second?.close();delete process.env.STORE_DATA_DIR;if(dir.startsWith(path.join(os.tmpdir(),'forme-test-empty-')))fs.rmSync(dir,{recursive:true,force:true})}
});
