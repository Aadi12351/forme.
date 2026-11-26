'use strict';
const launchAt=Date.parse('2026-12-11T05:00:00+05:30');
function tick(){const remaining=Math.max(0,Math.ceil((launchAt-Date.now())/1000));const values={days:Math.floor(remaining/86400),hours:Math.floor(remaining%86400/3600),minutes:Math.floor(remaining%3600/60),seconds:remaining%60};for(const [id,value] of Object.entries(values))document.getElementById(id).textContent=String(value).padStart(2,'0');if(!remaining){document.getElementById('launchStatus').textContent='Our scheduled launch time has arrived. The collection will open here once the store is ready.';clearInterval(timer)}}
const timer=setInterval(tick,1000);tick();
