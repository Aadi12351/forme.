let shipToken=null,shipExpires=0;
export async function gatewayRequest(endpoint,method='GET',data){
 if(!process.env.RAZORPAY_KEY_ID||!process.env.RAZORPAY_KEY_SECRET)throw Error('Payment credentials missing');
 const r=await fetch('https://api.razorpay.com/v1'+endpoint,{method,headers:{Authorization:'Basic '+Buffer.from(process.env.RAZORPAY_KEY_ID+':'+process.env.RAZORPAY_KEY_SECRET).toString('base64'),'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error('Payment service request failed ('+r.status+')');return r.json();
}
export async function shiprocketRequest(endpoint,method='GET',data){
 if(!shipToken||shipExpires<Date.now()){
 const r=await fetch('https://apiv2.shiprocket.in/v1/external/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:process.env.SHIPROCKET_EMAIL,password:process.env.SHIPROCKET_PASSWORD}),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('Shipping authentication failed');shipToken=(await r.json()).token;shipExpires=Date.now()+6*86400000;if(!shipToken)throw Error('Shipping token missing');
 }
 const r=await fetch('https://apiv2.shiprocket.in/v1/external'+endpoint,{method,headers:{Authorization:'Bearer '+shipToken,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(20000)});
 if(r.status===401){shipToken=null;shipExpires=0}if(!r.ok)throw Error('Shipping request failed ('+r.status+')');return r.json();
}
export async function sendEmail({id,email,subject,text}){
 if(!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM)throw Error('Business email is not configured');
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[email],subject,text}),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('Email delivery failed');return r.json();
}

export async function sendConversion({orderId,email,total,source,eventTime}){
 if(!process.env.META_ACCESS_TOKEN||!process.env.META_PIXEL_ID)throw Error('Meta CAPI not configured');
 const crypto=await import('node:crypto'),hash=crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
 const payload={data:[{event_name:'Purchase',event_time:eventTime||Math.floor(Date.now()/1000),event_id:orderId,action_source:'website',event_source_url:process.env.APP_URL+'/order-confirmation',user_data:{em:[hash]},custom_data:{currency:'INR',value:total/100,order_id:orderId,content_name:source||'direct'}}]};
 const version=process.env.META_GRAPH_VERSION;if(!version)throw Error('Set a supported Meta Graph version');
 const r=await fetch('https://graph.facebook.com/'+version+'/'+process.env.META_PIXEL_ID+'/events',{method:'POST',headers:{Authorization:'Bearer '+process.env.META_ACCESS_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('Meta conversion delivery failed');return r.json();
}

export async function sendWhatsApp({id,phone,orderId,status,template}){
 if(!process.env.WHATSAPP_ACCESS_TOKEN||!process.env.WHATSAPP_PHONE_ID||!process.env.WHATSAPP_GRAPH_VERSION||!template)throw Error('Approved WhatsApp template not configured');
 const to=phone.startsWith('91')?phone:'91'+phone;
 const r=await fetch('https://graph.facebook.com/'+process.env.WHATSAPP_GRAPH_VERSION+'/'+process.env.WHATSAPP_PHONE_ID+'/messages',{method:'POST',headers:{Authorization:'Bearer '+process.env.WHATSAPP_ACCESS_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to,type:'template',template:{name:template,language:{code:process.env.WHATSAPP_TEMPLATE_LANGUAGE||'en'},components:[{type:'body',parameters:[{type:'text',text:orderId},{type:'text',text:status}]}]}}),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('WhatsApp delivery failed');return r.json();
}
