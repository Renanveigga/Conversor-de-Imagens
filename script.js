// Utilidades
const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => [...el.querySelectorAll(sel)];
const logBox = document.querySelector('#logs');
const log = (msg, type='') => {
  if(!logBox) return;
  const el = document.createElement('div');
  el.className = 'log';
  if(type) el.classList.add(type);
  el.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logBox.prepend(el);
};

// Detecta suporte por formato
const KNOWN = [
  {label:'PNG (.png)', mime:'image/png', lossy:false},
  {label:'JPEG (.jpg/.jpeg)', mime:'image/jpeg', lossy:true},
  {label:'WEBP (.webp)', mime:'image/webp', lossy:true},
  {label:'BMP (.bmp)', mime:'image/bmp', lossy:false},
  {label:'GIF (1º quadro) (.gif)', mime:'image/gif', lossy:false},
  {label:'AVIF (.avif)', mime:'image/avif', lossy:true},
  {label:'SVG → PNG (.svg)', mime:'image/svg+xml', lossy:false},
];

function mimeSupported(mime){
  const c = document.createElement('canvas');
  try{ const s = c.toDataURL(mime, 0.9); return s.startsWith(`data:${mime}`); }
  catch(e){ return false; }
}

const formatSel = document.querySelector('#format');
const qualityWrap = document.querySelector('#qualityWrap');
const qualityInput = document.querySelector('#quality');
const supportPill = document.querySelector('#support');

const SUPPORTED = KNOWN.filter(f => {
  if(f.mime === 'image/gif') return true;        // exportaremos fallback (WebP/PNG)
  if(f.mime === 'image/svg+xml') return true;    // rasteriza SVG → PNG
  return mimeSupported(f.mime);
});

for(const f of SUPPORTED){
  const opt = document.createElement('option');
  opt.value = f.mime; opt.textContent = f.label; opt.dataset.lossy = f.lossy;
  formatSel.appendChild(opt);
}
function updateQualityVisibility(){
  const lossy = formatSel.selectedOptions[0]?.dataset.lossy === 'true';
  qualityWrap.style.display = lossy ? 'block' : 'none';
}
updateQualityVisibility();
formatSel.addEventListener('change', updateQualityVisibility);

supportPill.textContent = `Suporte: ${SUPPORTED.map(f=>f.label.split(' ')[0]).join(', ')}`;

// Entrada: arquivo(s)
const drop = document.querySelector('#drop');
const input = document.querySelector('#files');
const thumbs = document.querySelector('#thumbs');
const convertBtn = document.querySelector('#convert');
const clearBtn = document.querySelector('#clear');

const state = { files: [] };

function pick(){ input.click(); }
drop.addEventListener('click', pick);
drop.addEventListener('keypress', (e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); pick(); }});

function onDrag(e){ e.preventDefault(); e.stopPropagation(); if(e.type==='dragover') drop.classList.add('drag'); }
function onLeave(e){ e.preventDefault(); e.stopPropagation(); drop.classList.remove('drag'); }
['dragenter','dragover'].forEach(t=>drop.addEventListener(t,onDrag));
['dragleave','dragend','drop'].forEach(t=>drop.addEventListener(t,onLeave));
drop.addEventListener('drop', (e)=>{ handleFiles(e.dataTransfer.files); });
input.addEventListener('change', (e)=> handleFiles(e.target.files));

function handleFiles(fileList){
  const arr = [...fileList].filter(f=>f.type.startsWith('image/'));
  if(!arr.length){ log('Nenhuma imagem reconhecida.', 'danger'); return; }
  state.files.push(...arr);
  log(`${arr.length} arquivo(s) adicionados.`);
  renderFileList();
}

function formatBytes(b){
  if(!+b) return '0 B';
  const u=['B','KB','MB','GB']; let i=Math.floor(Math.log(b)/Math.log(1024));
  return `${(b/Math.pow(1024,i)).toFixed( i?1:0 )} ${u[i]}`;
}

function renderFileList(){
  thumbs.innerHTML='';
  state.files.forEach((file)=>{
    const tpl = document.importNode(document.querySelector('#thumb-tpl').content, true);
    const img = tpl.querySelector('img');
    const name = tpl.querySelector('.name');
    const a = tpl.querySelector('a');
    name.textContent = `${file.name} · ${formatBytes(file.size)}`;
    img.alt = file.name;
    img.src = URL.createObjectURL(file);
    a.textContent = 'Baixar (original)';
    a.href = img.src; a.download = file.name;
    thumbs.appendChild(tpl);
  });
}

async function loadBitmap(file){
  if('createImageBitmap' in window){
    try{ return await createImageBitmap(file, {imageOrientation:'from-image'}); }
    catch(e){ /* fallback */ }
  }
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.onload = ()=>resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function extForMime(mime){
  switch(mime){
    case 'image/png': return 'png';
    case 'image/jpeg': return 'jpg';
    case 'image/webp': return 'webp';
    case 'image/bmp': return 'bmp';
    case 'image/avif': return 'avif';
    case 'image/gif': return 'gif';
    case 'image/svg+xml': return 'png';
    default: return 'img';
  }
}

async function rasterizeSVG(file){
  const text = await file.text();
  const blob = new Blob([text], {type:'image/svg+xml'});
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  return new Promise((resolve, reject)=>{
    img.onload=()=>resolve(img);
    img.onerror=reject;
    img.src=url;
  });
}

async function convertFile(file, outMime, quality){
  const isSVG = file.type === 'image/svg+xml';
  const lossy = ['image/jpeg','image/webp','image/avif'].includes(outMime);

  let img;
  if(isSVG){ img = await rasterizeSVG(file); }
  else { img = await loadBitmap(file); }

  const w = img.width, h = img.height;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  let targetMime = outMime;
  if(outMime === 'image/gif'){
    targetMime = mimeSupported('image/webp') ? 'image/webp' : 'image/png';
    log('GIF animado não é suportado. Exportando como ' + (targetMime.endsWith('webp')?'WEBP':'PNG'));
  }
  if(outMime === 'image/avif' && !mimeSupported('image/avif')){
    targetMime = mimeSupported('image/webp') ? 'image/webp' : 'image/png';
    log('AVIF não suportado neste navegador. Convertendo para ' + (targetMime.endsWith('webp')?'WEBP':'PNG'));
  }

  const q = lossy ? Math.min(1, Math.max(0, quality/100)) : undefined;
  const dataUrl = canvas.toDataURL(targetMime, q);
  const bin = await (await fetch(dataUrl)).blob();

  const base = file.name.replace(/\.[^.]+$/, '');
  const ext = extForMime(outMime === 'image/gif' ? targetMime : outMime);
  const outName = `${base}.${ext}`;

  return { blob: bin, name: outName, preview: dataUrl };
}

async function convertAll(){
  if(!state.files.length){ log('Adicione imagens primeiro.', 'danger'); return; }
  convertBtn.disabled = true; convertBtn.textContent = 'Convertendo…';
  const outMime = formatSel.value;
  const quality = +qualityInput.value;

  for(let i=0;i<state.files.length;i++){
    const file = state.files[i];
    try{
      const {blob, name, preview} = await convertFile(file, outMime, quality);
      const card = thumbs.children[i];
      if(card){
        const a = card.querySelector('a');
        a.textContent = 'Baixar (convertido)';
        a.href = URL.createObjectURL(blob);
        a.download = name;
        card.querySelector('img').src = preview;
        card.querySelector('.name').textContent = `${name} · ${formatBytes(blob.size)}`;
      }
      log(`✔ ${file.name} → ${name}`, 'ok');
    }catch(err){
      console.error(err);
      log(`Falha ao converter ${file.name}: ${err && err.message ? err.message : err}`, 'danger');
    }
  }

  convertBtn.disabled = false; convertBtn.textContent = 'Converter tudo';
}

convertBtn.addEventListener('click', convertAll);
clearBtn.addEventListener('click', ()=>{ state.files=[]; thumbs.innerHTML=''; log('Lista limpa.'); input.value=''; });

