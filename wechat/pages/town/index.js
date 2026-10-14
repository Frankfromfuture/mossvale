const api=()=>getApp().globalData.apiBase;
Page({
 data:{world:null,selected:'lin',resident:null,mode:'now',message:'',busy:false,error:'',apiBase:'',chat:[],day:1,clock:'09:00'},
 onLoad(){this.setData({apiBase:api()});},
 async onShow(){try{await this.session();await this.refresh();this.timer=setInterval(()=>{if(!this.data.busy)this.refresh();},3000);}catch(e){this.setData({error:e.message});}},
 onHide(){clearInterval(this.timer);},onUnload(){clearInterval(this.timer);},
 async onPullDownRefresh(){await this.refresh();wx.stopPullDownRefresh();},
 async session(){let token=wx.getStorageSync('mossvale-session');if(!token){const res=await this.request('/api/session');token=res.token;wx.setStorageSync('mossvale-session',token);}},
 request(route,body){return new Promise((resolve,reject)=>wx.request({url:api()+route,method:body?'POST':'GET',timeout:30000,data:body,header:{'content-type':'application/json','X-Mossvale':'1','X-Town-Token':wx.getStorageSync('mossvale-session')||''},success:r=>r.statusCode===200?resolve(r.data):reject(new Error(r.data.error||'请求未完成')),fail:()=>reject(new Error('未连接小镇服务器；请检查开发地址与合法域名。'))}));},
 apply(world){const resident=world.residents.find(r=>r.id===this.data.selected)||world.residents[0];const min=world.minute%1440;this.setData({world,resident,chat:world.chats[resident.id]||[],day:Math.floor(world.minute/1440)+1,clock:String(Math.floor(min/60)).padStart(2,'0')+':'+String(min%60).padStart(2,'0'),error:''});},
 async refresh(){try{this.apply(await this.request('/api/world'));}catch(e){this.setData({error:e.message});}},
 choose(e){this.setData({selected:e.currentTarget.dataset.id});this.apply(this.data.world);},
 input(e){this.setData({message:e.detail.value});},
 mode(e){this.setData({mode:e.currentTarget.dataset.mode});},
 async interact(e){if(this.data.busy)return;const kind=e.currentTarget.dataset.kind||'chat';if(kind==='chat'&&!this.data.message.trim())return;this.setData({busy:true});try{const result=await this.request('/api/interact',{resident:this.data.selected,kind,message:kind==='chat'?this.data.message:''});this.apply(result.world);this.setData({message:''});if(result.result.notice)wx.showToast({title:/DeepSeek|模型|规则|调用/.test(result.result.notice)?'暂时只能简单回应，稍后再聊。':result.result.notice,icon:'none'});}catch(e){wx.showToast({title:e.message,icon:'none'});}finally{this.setData({busy:false});}},
 async control(e){if(this.data.busy)return;this.setData({busy:true});try{const result=await this.request('/api/control',{action:e.currentTarget.dataset.action,minutes:60});this.apply(result.world);}catch(e){wx.showToast({title:e.message,icon:'none'});}finally{this.setData({busy:false});}}
});
