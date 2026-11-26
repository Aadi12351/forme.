export function catalogFeed(products,site){
 const fields=['id','item_group_id','title','description','availability','condition','price','link','image_link','brand','color','size'];
 const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
 const rows=products.filter(p=>p.active).flatMap(p=>Object.entries(p.sizes||{}).map(([size,stock])=>[p.sku?p.sku+'-'+size:p.id+'-'+size,p.colorGroup||p.id,p.name,p.description,stock>0?'in stock':'out of stock','new',Number(p.price).toFixed(2)+' INR',site+'/products/'+p.id,p.image?.startsWith('https:')?p.image:site+(p.image||''),'Forme',p.color,size]));
 return [fields,...rows].map(row=>row.map(cell).join(',')).join('\r\n');
}
