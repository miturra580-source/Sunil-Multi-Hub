(function(){
  const NS='m24CornerCamera';
  if(window[NS]) return;

  const style=document.createElement('style');
  style.textContent=`
  .m24-doc-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.m24-doc-actions button{border:1px solid #cfd8e6;background:#fff;color:#172033;border-radius:10px;padding:9px 12px;font-weight:800;cursor:pointer}.m24-doc-actions button.primary{background:#0b4fd8;color:#fff;border-color:#0b4fd8}.m24-camera-input{position:absolute!important;opacity:0!important;width:1px!important;height:1px!important;pointer-events:none!important}.m24-corner-overlay{position:fixed;inset:0;z-index:99999;background:rgba(8,15,28,.88);display:flex;align-items:center;justify-content:center;padding:12px}.m24-corner-card{width:min(920px,100%);height:min(94dvh,900px);max-height:94dvh;background:#fff;border-radius:18px;padding:14px;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden}.m24-corner-head{display:flex;justify-content:space-between;gap:12px;align-items:start;margin-bottom:10px;flex:0 0 auto}.m24-corner-head h3{margin:0;font-size:20px}.m24-corner-head p{margin:4px 0 0;color:#667085;font-size:12px}.m24-corner-stage{position:relative;background:#111827;border-radius:14px;overflow:hidden;touch-action:none;flex:1 1 auto;min-height:180px;display:flex;align-items:center;justify-content:center}.m24-corner-stage canvas{display:block;max-width:100%;max-height:100%;width:auto;height:auto}.m24-corner-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;flex:0 0 auto}.m24-corner-actions button{flex:1 1 120px;border:1px solid #d6deea;border-radius:10px;padding:10px 11px;background:#fff;font-weight:800}.m24-corner-actions .apply{background:#0b4fd8;color:#fff;border-color:#0b4fd8}.m24-corner-help{font-size:11px;color:#667085;line-height:1.45;margin:8px 2px 0;flex:0 0 auto}.m24-size-note{color:#0b4fd8;font-weight:800}
  @media(max-width:600px){.m24-corner-overlay{padding:0;align-items:stretch}.m24-corner-card{width:100%;height:100dvh;max-height:100dvh;border-radius:0;padding:9px}.m24-corner-head{margin-bottom:7px}.m24-corner-head h3{font-size:17px}.m24-corner-head p{font-size:11px}.m24-corner-stage{min-height:0}.m24-corner-actions{gap:6px;margin-top:7px}.m24-corner-actions button{flex:1 1 calc(50% - 6px);padding:9px 8px;font-size:12px}.m24-corner-help{font-size:10px;margin-top:6px}}
  `;
  document.head.appendChild(style);

  function fileToImage(file){
    return new Promise((resolve,reject)=>{
      if(!file || !/^image\//.test(file.type)) return reject(new Error('Image चुनें'));
      const url=URL.createObjectURL(file),img=new Image();
      img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Image नहीं खुली'))};
      img.src=url;
    });
  }

  function solve8(A,b){
    const n=8,m=A.map((row,i)=>row.slice().concat(b[i]));
    for(let c=0;c<n;c++){
      let p=c;for(let r=c+1;r<n;r++)if(Math.abs(m[r][c])>Math.abs(m[p][c]))p=r;
      if(Math.abs(m[p][c])<1e-9) return null;
      [m[c],m[p]]=[m[p],m[c]];
      const d=m[c][c];for(let j=c;j<=n;j++)m[c][j]/=d;
      for(let r=0;r<n;r++){if(r===c)continue;const f=m[r][c];for(let j=c;j<=n;j++)m[r][j]-=f*m[c][j]}
    }
    return m.map(r=>r[n]);
  }

  function homography(dst,src){
    const A=[],b=[];
    for(let i=0;i<4;i++){
      const x=dst[i].x,y=dst[i].y,u=src[i].x,v=src[i].y;
      A.push([x,y,1,0,0,0,-u*x,-u*y]);b.push(u);
      A.push([0,0,0,x,y,1,-v*x,-v*y]);b.push(v);
    }
    const h=solve8(A,b);if(!h)return null;
    return [h[0],h[1],h[2],h[3],h[4],h[5],h[6],h[7],1];
  }

  function applyH(h,x,y){
    const d=h[6]*x+h[7]*y+h[8];
    return {x:(h[0]*x+h[1]*y+h[2])/d,y:(h[3]*x+h[4]*y+h[5])/d};
  }

  function warp(img,pts,outW=856,outH=540){
    const srcCanvas=document.createElement('canvas');srcCanvas.width=img.naturalWidth||img.width;srcCanvas.height=img.naturalHeight||img.height;
    const sc=srcCanvas.getContext('2d',{willReadFrequently:true});sc.drawImage(img,0,0);
    const srcData=sc.getImageData(0,0,srcCanvas.width,srcCanvas.height);
    const out=document.createElement('canvas');out.width=outW;out.height=outH;const oc=out.getContext('2d');const od=oc.createImageData(outW,outH);
    const dst=[{x:0,y:0},{x:outW-1,y:0},{x:outW-1,y:outH-1},{x:0,y:outH-1}];
    const H=homography(dst,pts);if(!H)throw new Error('Corners सही नहीं हैं');
    const sw=srcCanvas.width,sh=srcCanvas.height,s=srcData.data,d=od.data;
    for(let y=0;y<outH;y++)for(let x=0;x<outW;x++){
      const p=applyH(H,x,y),sx=Math.max(0,Math.min(sw-1,p.x)),sy=Math.max(0,Math.min(sh-1,p.y));
      const x0=Math.floor(sx),y0=Math.floor(sy),x1=Math.min(sw-1,x0+1),y1=Math.min(sh-1,y0+1),fx=sx-x0,fy=sy-y0;
      const i00=(y0*sw+x0)*4,i10=(y0*sw+x1)*4,i01=(y1*sw+x0)*4,i11=(y1*sw+x1)*4,di=(y*outW+x)*4;
      for(let c=0;c<4;c++)d[di+c]=s[i00+c]*(1-fx)*(1-fy)+s[i10+c]*fx*(1-fy)+s[i01+c]*(1-fx)*fy+s[i11+c]*fx*fy;
    }
    oc.putImageData(od,0,0);return out;
  }

  async function openCornerEditor(file,onDone){
    let img;try{img=await fileToImage(file)}catch(e){alert(e.message);return}
    const overlay=document.createElement('div');overlay.className='m24-corner-overlay';
    overlay.innerHTML='<div class="m24-corner-card"><div class="m24-corner-head"><div><h3>✥ Corner Edit / Document Straighten</h3><p>Corner dot से कोना set करें, बीच के <b>SIZE</b> point से छोटा-बड़ा करें, और नीले box के अंदर drag करके पूरा box move करें।</p></div><button type="button" data-close style="border:0;background:#eef2f7;border-radius:9px;padding:8px 11px;font-weight:900">✕</button></div><div class="m24-corner-stage"><canvas></canvas></div><div class="m24-corner-actions"><button type="button" data-smaller>− Size</button><button type="button" data-bigger>+ Size</button><button type="button" data-reset>Reset</button><button type="button" data-auto>Auto Corners</button><button type="button" class="apply" data-apply>✓ Straighten & Crop</button></div><p class="m24-corner-help"><span class="m24-size-note">Move:</span> नीले selection के अंदर खाली जगह पर finger रखकर पूरे box को ID के ऊपर ले जाएँ। Corner 1-4 से border fine-tune करें।</p></div>';
    document.body.appendChild(overlay);
    const canvas=overlay.querySelector('canvas'),ctx=canvas.getContext('2d');
    const maxW=1200,maxH=900,scale=Math.min(maxW/img.width,maxH/img.height,1);canvas.width=Math.max(320,Math.round(img.width*scale));canvas.height=Math.max(220,Math.round(img.height*scale));
    let pts=[];function defaults(){const m=.08;pts=[{x:canvas.width*m,y:canvas.height*m},{x:canvas.width*(1-m),y:canvas.height*m},{x:canvas.width*(1-m),y:canvas.height*(1-m)},{x:canvas.width*m,y:canvas.height*(1-m)}]}
    defaults();let active=-1,dragMode=null,startPts=null,startP=null,startCenter=null;
    function center(){return{x:pts.reduce((a,p)=>a+p.x,0)/4,y:pts.reduce((a,p)=>a+p.y,0)/4}}
    function clampPt(p){return{x:Math.max(0,Math.min(canvas.width,p.x)),y:Math.max(0,Math.min(canvas.height,p.y))}}
    function resizeSelection(factor,basePts,origin){pts=basePts.map(p=>clampPt({x:origin.x+(p.x-origin.x)*factor,y:origin.y+(p.y-origin.y)*factor}))}
    function pointInPolygon(p){let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];const hit=((a.y>p.y)!==(b.y>p.y))&&(p.x<(b.x-a.x)*(p.y-a.y)/((b.y-a.y)||1e-9)+a.x);if(hit)inside=!inside}return inside}
    function moveWholeBox(dx,dy){let moved=startPts.map(p=>({x:p.x+dx,y:p.y+dy}));let minX=Math.min(...moved.map(p=>p.x)),maxX=Math.max(...moved.map(p=>p.x)),minY=Math.min(...moved.map(p=>p.y)),maxY=Math.max(...moved.map(p=>p.y));let fixX=0,fixY=0;if(minX<0)fixX=-minX;else if(maxX>canvas.width)fixX=canvas.width-maxX;if(minY<0)fixY=-minY;else if(maxY>canvas.height)fixY=canvas.height-maxY;pts=moved.map(p=>({x:p.x+fixX,y:p.y+fixY}))}
    function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);ctx.save();ctx.strokeStyle='#0b4fd8';ctx.lineWidth=Math.max(3,canvas.width/260);ctx.fillStyle='rgba(11,79,216,.12)';ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<4;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.closePath();ctx.fill();ctx.stroke();pts.forEach((p,i)=>{ctx.beginPath();ctx.fillStyle='#fff';ctx.arc(p.x,p.y,13,0,Math.PI*2);ctx.fill();ctx.lineWidth=6;ctx.strokeStyle='#0b4fd8';ctx.stroke();ctx.fillStyle='#0b4fd8';ctx.font='bold 13px sans-serif';ctx.fillText(String(i+1),p.x+16,p.y-14)});const c=center();ctx.beginPath();ctx.fillStyle='#fff3cd';ctx.arc(c.x,c.y,15,0,Math.PI*2);ctx.fill();ctx.lineWidth=6;ctx.strokeStyle='#f59e0b';ctx.stroke();ctx.fillStyle='#111827';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText('SIZE',c.x,c.y-22);ctx.restore()}
    function pos(e){const r=canvas.getBoundingClientRect(),t=e.touches?e.touches[0]:e;return{x:(t.clientX-r.left)*canvas.width/r.width,y:(t.clientY-r.top)*canvas.height/r.height}}
    function nearest(p){const c=center(),cd=(c.x-p.x)**2+(c.y-p.y)**2;if(cd<3600)return 4;let bi=-1,bd=1e9;pts.forEach((q,i)=>{const d=(q.x-p.x)**2+(q.y-p.y)**2;if(d<bd){bd=d;bi=i}});return bd<3000?bi:-1}
    function down(e){const p=pos(e);active=nearest(p);startP=p;startPts=pts.map(q=>({...q}));if(active===4){dragMode='size';startCenter=center()}else if(active>=0){dragMode='corner'}else if(pointInPolygon(p)){dragMode='box'}else{dragMode=null}if(dragMode)e.preventDefault()}
    function move(e){if(!dragMode)return;const p=pos(e);if(dragMode==='size'){const dy=startP.y-p.y;const factor=Math.max(.25,Math.min(2.8,1+dy/(canvas.height*.42)));resizeSelection(factor,startPts,startCenter)}else if(dragMode==='corner'&&active>=0&&active<4){pts[active]=clampPt(p)}else if(dragMode==='box'){moveWholeBox(p.x-startP.x,p.y-startP.y)}draw();e.preventDefault()}
    function up(){active=-1;dragMode=null;startPts=null;startP=null;startCenter=null}
    canvas.addEventListener('mousedown',down);canvas.addEventListener('mousemove',move);window.addEventListener('mouseup',up);canvas.addEventListener('touchstart',down,{passive:false});canvas.addEventListener('touchmove',move,{passive:false});window.addEventListener('touchend',up);
    overlay.querySelector('[data-close]').onclick=()=>overlay.remove();
    overlay.querySelector('[data-reset]').onclick=()=>{defaults();draw()};
    overlay.querySelector('[data-auto]').onclick=()=>{const m=.025;pts=[{x:canvas.width*m,y:canvas.height*m},{x:canvas.width*(1-m),y:canvas.height*m},{x:canvas.width*(1-m),y:canvas.height*(1-m)},{x:canvas.width*m,y:canvas.height*(1-m)}];draw()};
    overlay.querySelector('[data-smaller]').onclick=()=>{const c=center(),base=pts.map(p=>({...p}));resizeSelection(.9,base,c);draw()};
    overlay.querySelector('[data-bigger]').onclick=()=>{const c=center(),base=pts.map(p=>({...p}));resizeSelection(1.1,base,c);draw()};
    overlay.querySelector('[data-apply]').onclick=()=>{
      try{
        const sourcePts=pts.map(p=>({x:p.x/scale,y:p.y/scale}));const out=warp(img,sourcePts,856,540);
        out.toBlob(blob=>{if(!blob)return;const corrected=new File([blob],'straightened-'+(file.name||'document.jpg').replace(/\.[^.]+$/,'.jpg'),{type:'image/jpeg'});overlay.remove();onDone(corrected)},'image/jpeg',.95);
      }catch(e){alert(e.message||'Corner correction नहीं हुआ')}
    };
    draw();
  }

  function transferTo(input,file){const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}))}

  async function applyStandaloneSide(input,file,label){
    const side=input.id==='frontInput'?'front':input.id==='backInput'?'back':null;
    if(!side || typeof state==='undefined' || typeof fresh!=='function' || typeof readImage!=='function')return false;
    try{
      const img=await readImage(file);
      state[side]=fresh(img);
      const nameEl=document.getElementById(side+'Name');if(nameEl)nameEl.textContent=file.name+' • Straightened';
      state.active=side;if(typeof setTab==='function')setTab();if(typeof syncControls==='function')syncControls();if(typeof drawCrop==='function')drawCrop();if(typeof drawSheet==='function')drawSheet();
      if(typeof toast==='function')toast((label||side)+' corner correction लागू');
      return true;
    }catch(e){alert(e.message||'Correction apply नहीं हुआ');return true}
  }

  async function snapshotCustomerBack(){
    try{
      const main=document.getElementById('files');
      if(!main||!window.customerPrintEditor?.filesForUpload)return null;
      const originals=[...main.files];if(!originals.length)return null;
      const processed=await window.customerPrintEditor.filesForUpload(originals,'id_card');
      return processed&&processed[1]||originals[1]||originals[0]||null;
    }catch(e){return null}
  }

  function attach(input,container,label){
    if(!input||input.dataset.m24CornerReady)return;input.dataset.m24CornerReady='1';
    const actions=document.createElement('div');actions.className='m24-doc-actions';
    const camera=document.createElement('button');camera.type='button';camera.className='primary';camera.textContent='📷 Camera';
    const corner=document.createElement('button');corner.type='button';corner.textContent='✥ Corner Edit';
    const camInput=document.createElement('input');camInput.type='file';camInput.accept='image/*';camInput.capture='environment';camInput.className='m24-camera-input';
    camera.onclick=e=>{e.preventDefault();e.stopPropagation();camInput.click()};
    camInput.onchange=()=>{const f=camInput.files&&camInput.files[0];if(f)transferTo(input,f);camInput.value=''};
    corner.onclick=async e=>{
      e.preventDefault();e.stopPropagation();const f=input.files&&input.files[0];if(!f){alert('पहले '+(label||'document')+' image चुनें');return}
      const isCustomer=!!input.closest('.smart-id-panel');
      const savedBack=isCustomer&&input.id==='sidFront'?await snapshotCustomerBack():null;
      openCornerEditor(f,async corrected=>{
        if(await applyStandaloneSide(input,corrected,label))return;
        transferTo(input,corrected);
        if(isCustomer&&input.id==='sidFront'&&savedBack){
          const back=input.closest('.smart-id-panel')?.querySelector('#sidBack');
          if(back)setTimeout(()=>transferTo(back,savedBack),450);
        }
      });
    };
    actions.append(camera,corner,camInput);(container||input.parentElement).appendChild(actions);
  }

  function setupStatic(){attach(document.getElementById('frontInput'),document.querySelector('[data-drop="front"]'),'Front');attach(document.getElementById('backInput'),document.querySelector('[data-drop="back"]'),'Back')}
  function setupCustomer(){const p=document.querySelector('.smart-id-panel');if(!p)return;attach(p.querySelector('#sidFront'),p.querySelector('#sidFront')?.closest('.sid-drop'),'Front');attach(p.querySelector('#sidBack'),p.querySelector('#sidBack')?.closest('.sid-drop'),'Back')}
  setupStatic();setupCustomer();
  const mo=new MutationObserver(()=>setupCustomer());mo.observe(document.documentElement,{childList:true,subtree:true});
  window[NS]={open:openCornerEditor};
})();