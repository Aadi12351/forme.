import {catalogFeed} from './catalog-feed.mjs';
import {productPage} from './seo.mjs';
import {createCommerce} from './commerce.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const publicDir=path.join(root,'public');
const dbPath=path.join(root,'data','products.json');
const uploadDir=path.join(root,'uploads');
fs.mkdirSync(uploadDir,{recursive:true});fs.mkdirSync(path.dirname(dbPath),{recursive:true});
if(fs.existsSync(path.join(root,'.env')))process.loadEnvFile(path.join(root,'.env'));
const PORT=Number(process.env.PORT||3000);
const PASSWORD=process.env.ADMIN_PASSWORD||crypto.randomBytes(32).toString('hex'); // local preview only; configure securely before public deployment
const SECRET=process.env.SESSION_SECRET||crypto.randomBytes(32).toString('hex');
const isProd=process.env.NODE_ENV==='production';
const colors=['Black','White','Brown','Navy','Green','Red','Beige'];
const defaultSizes={Navy:{L:3,XL:2},White:{M:4,L:2,XL:2},Black:{L:3,XL:2,XXL:1},Green:{S:1,M:2,L:2,XL:3},Red:{S:1,M:2,L:2,XL:2},Brown:{M:4,L:2,XL:2},Beige:{M:1}};
const fileNames={Black:'black-plain.jpg',White:'white-plain.jpg',Brown:'brown-plain.jpeg',Navy:'navy-plain.jpg',Green:'green-plain.jpg',Red:'red-plain.jpg',Beige:'beige-plain.jpg'};
const initialProducts=[...colors.map((c,i)=>({id:'plain-'+c.toLowerCase(),name:c+' Essential Tee',category:'plain',color:c,price:350,description:'Premium 210 GSM cotton. Relaxed drop-shoulder silhouette.',sizes:defaultSizes[c],image:'/assets/'+fileNames[c],featured:i===0,active:true})),...['Black','White'].map(c=>({id:'venom-'+c.toLowerCase(),name:'VENOMOUS / '+c,category:'printed',color:c,price:499,description:'Our graphic series. Premium 210 GSM cotton with a relaxed drop-shoulder fit.',sizes:defaultSizes[c],image:'/assets/'+c.toLowerCase()+'-venomous.png',featured:c==='Black',active:true}))];
if(!fs.existsSync(dbPath))fs.writeFileSync(dbPath,JSON.stringify(initialProducts,null,2));
const commerce=createCommerce(root,authenticated);
const read=commerce.read;
const write=commerce.write;
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.mp4':'video/mp4','.webm':'video/webm'};
const limit=42*1024*1024;
const attempts=new Map();
function response(res,status,obj,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(obj))}
function cookies(req){const result={};for(const part of (req.headers.cookie||'').split(';')){const split=part.indexOf('=');if(split<1)continue;try{result[decodeURIComponent(part.slice(0,split).trim())]=decodeURIComponent(part.slice(split+1))}catch{}}return result}
function sign(text){return crypto.createHmac('sha256',SECRET).update(text).digest('hex')}
function authenticated(req){const token=cookies(req).forme_session;if(!token)return false;const [time,sig]=token.split('.');if(!time||!sig||!/^[a-f0-9]{64}$/.test(sig))return false;const valid=sign(time);return crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(valid))&&Number(time)>Date.now()}
function sessionCookie(value,age){return `forme_session=${encodeURIComponent(value)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${isProd?'; Secure':''}`}
function parse(req){return new Promise((resolve,reject)=>{let chunks=[],size=0;req.on('data',b=>{size+=b.length;if(size>limit){reject(new Error('Payload too large'));req.destroy()}else chunks.push(b)});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'))}catch{reject(new Error('Invalid JSON'))}});req.on('error',reject)})}
function sameOrigin(req){const o=req.headers.origin;if(!o)return true;try{const u=new URL(o);return u.host===req.headers.host&&(u.protocol==='http:'||u.protocol==='https:')}catch{return false}}
function safeFile(res,p,req){let stat;try{stat=fs.statSync(p);if(!stat.isFile())throw Error()}catch{return response(res,404,{error:'Not found'})}if(req?.headers.range&&['.mp4','.webm'].includes(path.extname(p))){const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);let start=m&&m[1]?Number(m[1]):0,end=m&&m[2]?Number(m[2]):stat.size-1;if(m&&!m[1]&&m[2]){start=Math.max(0,stat.size-Number(m[2]));end=stat.size-1}if(!m||start>end||start>=stat.size){res.writeHead(416,{'Content-Range':'bytes */'+stat.size});return res.end()}end=Math.min(end,stat.size-1);res.writeHead(206,{'Content-Type':mime[path.extname(p)],'Accept-Ranges':'bytes','Content-Range':'bytes '+start+'-'+end+'/'+stat.size,'Content-Length':end-start+1});return fs.createReadStream(p,{start,end}).pipe(res)}res.setHeader('Accept-Ranges','bytes');if(req?.method==='HEAD'){res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream','Content-Length':stat.size});return res.end()}res.writeHead(res.statusCode||200,{'Content-Type':mime[path.extname(p).toLowerCase()]||'application/octet-stream','Content-Length':stat.size,'X-Content-Type-Options':'nosniff','Cache-Control':path.extname(p).toLowerCase()==='.html'||!isProd?'no-cache':'public, max-age=3600'});fs.createReadStream(p).pipe(res)}

function safeMedia(v){return typeof v==='string'&&v.length<=500&&(/^\/(assets|uploads)\/[a-zA-Z0-9_./-]+$/.test(v)||/^https:\/\/[^\s<>"']+$/.test(v))}
function validDetails(p){if(!p||typeof p!=='object')return false;const collections=[['benefits','title','text',8],['steps','title','text',6],['faqs','question','answer',12]];if(!collections.every(([key,a,b,max])=>p[key]===undefined||(Array.isArray(p[key])&&p[key].length<=max&&p[key].every(x=>x&&typeof x[a]==='string'&&x[a].trim().length>0&&x[a].length<=180&&typeof x[b]==='string'&&x[b].trim().length>0&&x[b].length<=1500))))return false;if(!['spotlightMedia','detailMedia'].every(k=>p[k]===undefined||p[k]===''||safeMedia(p[k])))return false;return ['fabric','fit','care','story','highlights'].every(k=>p[k]===undefined||(typeof p[k]==='string'&&p[k].length<=3000))&&(p.media===undefined||(Array.isArray(p.media)&&p.media.length<=16&&p.media.every(m=>m&&['image','video'].includes(m.type)&&safeMedia(m.url)&&typeof m.alt==='string'&&m.alt.length<=180)))&&(!p.image||safeMedia(p.image))}

const categoryPath=path.join(root,'data','categories.json');
const baseCategories=[{id:'plain',name:'Essentials'},{id:'printed',name:'Graphic series'}];
function categories(){const saved=fs.existsSync(categoryPath)?JSON.parse(fs.readFileSync(categoryPath,'utf8')):[];const map=new Map([...baseCategories,...saved].map(c=>[c.id,c]));for(const p of read())if(!map.has(p.category))map.set(p.category,{id:p.category,name:p.category});return [...map.values()]}
function validProduct(p){if(!validDetails(p))return false;return p&&typeof p.name==='string'&&p.name.trim().length<=120&&p.name.trim().length>0&&categories().some(c=>c.id===p.category)&&(!p.colorHex||/^#[a-fA-F0-9]{6}$/.test(p.colorHex))&&(p.colorGroup===undefined||(typeof p.colorGroup==='string'&&p.colorGroup.length<=80))&&typeof p.color==='string'&&p.color.length<=40&&Number.isFinite(Number(p.price))&&Number(p.price)>=0&&Number(p.price)<=1000000&&typeof(p.image||'')==='string'&&String(p.image||'').length<=350&&typeof(p.description||'')==='string'&&String(p.description||'').length<=1200&&typeof p.sizes==='object'&&p.sizes!==null&&!Array.isArray(p.sizes)&&Object.keys(p.sizes).length<=15&&Object.entries(p.sizes).every(([k,v])=>k.length<=12&&Number.isInteger(Number(v))&&Number(v)>=0&&Number(v)<=100000)}
function cleanProduct(p,id){return {benefits:p.benefits||[],steps:p.steps||[],faqs:p.faqs||[],spotlightMedia:p.spotlightMedia||'',detailMedia:p.detailMedia||'',media:p.media||[],fabric:p.fabric||'',fit:p.fit||'',care:p.care||'',story:p.story||'',highlights:p.highlights||'',id,colorHex:p.colorHex||'',colorGroup:(p.colorGroup||'').trim(),name:p.name.trim(),category:p.category,color:p.color.trim(),price:Number(p.price),image:String(p.image||''),description:String(p.description||''),sizes:Object.fromEntries(Object.entries(p.sizes).map(([k,v])=>[k,Number(v)])),featured:!!p.featured,active:p.active!==false}}
if(isProd&&(!process.env.ADMIN_PASSWORD||process.env.ADMIN_PASSWORD.length<16||!process.env.SESSION_SECRET||process.env.SESSION_SECRET.length<32||!process.env.APP_URL?.startsWith('https://')))throw Error('Production needs strong admin/session secrets and HTTPS APP_URL');
const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');const route=url.pathname;
  if(process.env.CHECKOUT_MODE!=='live'||/^\/(admin|account|checkout|cart|orders|order-confirmation|reset-password|forgot-password)/.test(route))res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://www.googletagmanager.com https://connect.facebook.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; media-src 'self' https:; connect-src 'self' https://*.razorpay.com https://*.google-analytics.com https://*.analytics.google.com https://www.facebook.com; frame-src https://*.razorpay.com; form-action 'self'; base-uri 'self'; frame-ancestors 'none'");res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');if(isProd)res.setHeader('Strict-Transport-Security','max-age=31536000');
  // Local launch preview; the full store remains available while the public page is prepared.
  if(route==='/coming-soon'&&['GET','HEAD'].includes(req.method))return safeFile(res,path.join(root,'launch','index.html'),req);
  if(['/launch.css','/launch.js'].includes(route))return safeFile(res,path.join(root,'launch',route.slice(1)),req);
  if(route==='/launch-hero.webp')return safeFile(res,path.join(publicDir,'assets','forme-studio-hero.webp'),req);
  if(route==='/health'&&req.method==='GET'){commerce.db.prepare('SELECT 1').get();return response(res,200,{ok:true})}if(await commerce.handler(req,res,route))return;
  if(route==='/admin/orders'&&['GET','HEAD'].includes(req.method))return safeFile(res,path.join(publicDir,'commerce-admin.html'),req);
  if(['/shop','/new-arrivals','/essentials','/graphics','/cart','/checkout','/order-confirmation','/track-order','/account','/orders','/wishlist','/size-guide','/faq','/shipping','/returns','/refunds','/privacy','/terms','/payment-policy','/about','/contact','/forgot-password','/reset-password'].includes(route)&&['GET','HEAD'].includes(req.method)){const names={'/shop':'Shop All','/new-arrivals':'New Arrivals','/essentials':'Plain Essentials','/graphics':'Graphic Collection','/privacy':'Privacy Policy','/terms':'Terms and Conditions','/shipping':'Shipping Policy','/returns':'Returns and Exchanges','/refunds':'Cancellation and Refunds','/about':'About Forme'};const name=names[route]||route.slice(1).replaceAll('-',' ');let html=fs.readFileSync(path.join(publicDir,'store.html'),'utf8').replace(/<title>.*?<\/title>/,'<title>'+name+' | Forme</title>');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});return res.end(req.method==='HEAD'?'':html)}
  if(['/store.js','/store.css','/commerce-admin.js'].includes(route))return safeFile(res,path.join(publicDir,route.slice(1)),req);
  if(route==='/catalog.csv'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Cache-Control':'public,max-age=300'});return res.end(catalogFeed(read(),process.env.APP_URL||'http://localhost:'+PORT))}
  if(route==='/robots.txt'){res.writeHead(200,{'Content-Type':'text/plain'});return res.end(process.env.CHECKOUT_MODE==='live'?'User-agent: *\nDisallow: /admin\nDisallow: /account\nDisallow: /checkout\nDisallow: /orders\nSitemap: '+process.env.APP_URL+'/sitemap.xml':'User-agent: *\nDisallow: /')}
  if(route==='/sitemap.xml'){const site=process.env.APP_URL||'http://localhost:'+PORT;res.writeHead(200,{'Content-Type':'application/xml'});return res.end('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['/','/shop','/essentials','/graphics','/about',...read().filter(p=>p.active).map(({cost,...p})=>p).map(p=>'/products/'+p.id)].map(u=>'<url><loc>'+site+u+'</loc></url>').join('')+'</urlset>')}res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  if(req.method==='GET'&&route==='/api/categories')return response(res,200,categories());
  if(req.method==='GET'&&route==='/api/products')return response(res,200,read().filter(p=>p.active));
  if(req.method==='GET'&&route==='/api/admin/session')return response(res,200,{authenticated:authenticated(req)});
  if(!['GET','HEAD'].includes(req.method)&&route.startsWith('/api/admin/')&&(!req.headers.origin||!sameOrigin(req)))return response(res,403,{error:'Invalid request origin'});
  if(req.method==='POST'&&route==='/api/admin/login'){
    const ip=req.socket.remoteAddress||'local';const a=attempts.get(ip)||{count:0,until:0};if(a.until>Date.now())return response(res,429,{error:'Too many attempts. Please try again later.'});
    const body=await parse(req);const candidate=String(body.password||'');const good=crypto.timingSafeEqual(crypto.createHash('sha256').update(candidate).digest(),crypto.createHash('sha256').update(PASSWORD).digest());
    if(!good){a.count++;if(a.count>=5){a.until=Date.now()+15*60*1000;a.count=0}attempts.set(ip,a);return response(res,401,{error:'Incorrect password'})}
    attempts.delete(ip);const expires=String(Date.now()+12*60*60*1000);return response(res,200,{ok:true},{'Set-Cookie':sessionCookie(expires+'.'+sign(expires),12*60*60)});
  }
  if(req.method==='POST'&&route==='/api/admin/logout')return response(res,200,{ok:true},{'Set-Cookie':sessionCookie('',0)});
  if(route.startsWith('/api/admin/')){
    if(!authenticated(req))return response(res,401,{error:'Please log in'});
    if(req.method==='POST'&&route==='/api/admin/categories'){
      const body=await parse(req),name=typeof body.name==='string'?body.name.trim():'';
      if(!name||name.length>60)return response(res,400,{error:'Enter a category name of 1–60 characters'});
      const id=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      if(!id||id==='all')return response(res,400,{error:'Choose another category name using letters or numbers'});
      if(categories().some(c=>c.id===id||c.name.toLowerCase()===name.toLowerCase()))return response(res,409,{error:'This category already exists'});
      const next=[...categories(),{id,name}],tmp=categoryPath+'.tmp';fs.writeFileSync(tmp,JSON.stringify(next,null,2));fs.renameSync(tmp,categoryPath);return response(res,201,{id,name});
    }
    if(req.method==='GET'&&route==='/api/admin/products')return response(res,200,read());
    if(req.method==='POST'&&route==='/api/admin/products'){
      const body=await parse(req);if(!validProduct(body))return response(res,400,{error:'Please enter valid product details'});
      const list=read(),id=crypto.randomUUID();list.unshift({...cleanProduct(body,id),createdAt:Date.now()});write(list);return response(res,201,{ok:true,id});
    }
    const match=route.match(/^\/api\/admin\/products\/([\w-]+)$/);
    if(match&&req.method==='PUT'){
      const body=await parse(req);if(!validProduct(body))return response(res,400,{error:'Invalid product data'});
      const list=read(),idx=list.findIndex(p=>p.id===match[1]);if(idx<0)return response(res,404,{error:'Product not found'});
      if(Number(body.revision||0)!==Number(list[idx].revision||0))return response(res,409,{error:'This product changed while you were editing. Reload it before saving.'});list[idx]={...list[idx],...cleanProduct(body,match[1]),responsiveImages:body.image===list[idx].image?(list[idx].responsiveImages||[]):[],revision:Number(list[idx].revision||0)+1};write(list);return response(res,200,{ok:true});
    }
    if(match&&req.method==='DELETE'){
      const list=read(),next=list.filter(p=>p.id!==match[1]);if(list.length===next.length)return response(res,404,{error:'Product not found'});write(next);return response(res,200,{ok:true});
    }
    if(req.method==='POST'&&route==='/api/admin/upload'){
      const body=await parse(req),m=/^data:(?:image\/(jpeg|png|webp)|video\/(mp4|webm));base64,([\s\S]+)$/.exec(body.data||'');if(!m)return response(res,400,{error:'Upload JPG, PNG, WebP, MP4 or WebM'});
      const bytes=Buffer.from(m[3],'base64');if(!bytes.length||bytes.length>(m[2]?30:5)*1024*1024)return response(res,400,{error:'Images: 5 MB maximum; videos: 30 MB maximum'});
      const matches=m[2]?(m[2]==='mp4'?bytes.subarray(4,8).toString()==='ftyp':bytes.subarray(0,4).equals(Buffer.from([26,69,223,163]))):m[1]==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):m[1]==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
      if(!matches)return response(res,400,{error:'Image content does not match format'});
      const ext=m[2]||(m[1]==='jpeg'?'jpg':m[1]),filename=crypto.randomUUID()+'.'+ext;fs.writeFileSync(path.join(uploadDir,filename),bytes,{flag:'wx'});return response(res,201,{url:'/uploads/'+filename});
    }
    return response(res,404,{error:'Unknown endpoint'});
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return response(res,405,{error:'Method not allowed'});
  if(route==='/admin'||route==='/admin8433508549'||route==='/admin8433508549/')return safeFile(res,path.join(publicDir,'admin.html'));
  if(/^\/products\/[\w-]+\/?$/.test(route)){const product=read().find(p=>p.id===route.split('/')[2]&&p.active);if(!product){res.statusCode=404;return safeFile(res,path.join(publicDir,'404.html'))}const html=productPage(path.join(publicDir,'product.html'),product,process.env.APP_URL||'http://localhost:'+PORT);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});return res.end(req.method==='HEAD'?'':html)}
  if(route==='/'||route==='/index.html')return safeFile(res,path.join(publicDir,'index.html'));
  const base=route.startsWith('/uploads/')?uploadDir:publicDir;
  const relative=route.startsWith('/uploads/')?route.slice('/uploads/'.length):route.replace(/^\//,'');
  let target=path.resolve(base,relative);if(!target.startsWith(base+path.sep))return response(res,403,{error:'Forbidden'});
  if(route.startsWith('/uploads/')||route.startsWith('/assets/')||['/styles.css','/app.js','/admin.js','/product.js','/product.css'].includes(route))return safeFile(res,target,req);
  return response(res,404,{error:'Not found'});
}catch(err){console.error(err);if(!res.headersSent)response(res,err.message==='Payload too large'?413:500,{error:err.message==='Payload too large'?'File is too large':'Request failed'})}});
server.listen(PORT,process.env.HOST||'127.0.0.1',()=>console.log(`FORME catalogue: http://localhost:${PORT} | Admin: http://localhost:${PORT}/admin8433508549`));
