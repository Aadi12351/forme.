import fs from 'node:fs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function productPage(file,p,site){
 const canonical=site+'/products/'+p.id;
 const metadata={'@context':'https://schema.org','@type':'Product',name:p.name,description:p.description,sku:p.sku||p.id,brand:{'@type':'Brand',name:'Forme'},offers:{'@type':'Offer',url:canonical,priceCurrency:'INR',price:p.price,availability:Object.values(p.sizes).some(q=>q>0)?'https://schema.org/InStock':'https://schema.org/OutOfStock'}};
 if(p.image)metadata.image=p.image.startsWith('https:')?p.image:site+p.image;
 const head='<link rel="canonical" href="'+esc(canonical)+'"><meta property="og:type" content="product"><meta property="og:title" content="'+esc(p.name)+'"><meta property="og:description" content="'+esc(p.description)+'"><meta property="og:url" content="'+esc(canonical)+'">'+(metadata.image?'<meta property="og:image" content="'+esc(metadata.image)+'">':'')+'<script type="application/ld+json">'+JSON.stringify(metadata).replace(/</g,'\\u003c')+'</script>';
 return fs.readFileSync(file,'utf8').replace(/<title>.*?<\/title>/,'<title>'+esc(p.name)+' | Forme</title>').replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="'+esc(p.description)+'">').replace('</head>',head+'</head>');
}
