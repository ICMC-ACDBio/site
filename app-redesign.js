(()=>{
const $=id=>document.getElementById(id);
const state={authors:[],articles:[],edges:[],nodeMap:new Map(),adj:new Map(),cy:null,tab:'publications',filter:'all',query:'',sideQuery:'',selectedId:null};

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const initials=name=>String(name||'').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const shorten=(s,n=38)=>String(s||'').length>n?String(s).slice(0,n-1)+'…':String(s||'');

const PERSON_SVG=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="19" r="10.5" fill="none" stroke="#4f7792" stroke-width="4"/><path d="M12 55c2.8-14 9.7-20.5 20-20.5S49.2 41 52 55" fill="none" stroke="#4f7792" stroke-width="4" stroke-linecap="round"/></svg>`;
const DOC_SVG=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 72"><path d="M13 5h26l13 13v49H13z" fill="white" stroke="#c86f3d" stroke-width="3.5" stroke-linejoin="round"/><path d="M39 5v14h13M21 31h23M21 41h23M21 51h17" fill="none" stroke="#c86f3d" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const PERSON_URI='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(PERSON_SVG);
const DOC_URI='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(DOC_SVG);

const iconSvg=type=>type==='Author'
?`<svg viewBox="0 0 24 24"><circle cx="12" cy="7.5" r="3.2"></circle><path d="M5.8 20c.8-4.4 3-6.4 6.2-6.4s5.4 2 6.2 6.4"></path></svg>`
:`<svg viewBox="0 0 24 24"><path d="M6 2.8h8l4 4V21H6z"></path><path d="M14 2.8V7h4M9 12h6M9 15.5h6"></path></svg>`;

async function get(name){
  const r=await fetch(`./data/${name}.json?v=10`,{cache:'no-store'});
  if(!r.ok) throw new Error(`${name}.json: HTTP ${r.status}`);
  return r.json();
}

function setup([authors,articles,authored]){
  state.authors=authors;
  state.articles=articles.map(a=>({...a,short_label:shorten(a.label,34)}));
  state.nodeMap=new Map([...state.authors,...state.articles].map(n=>[n.id,n]));
  state.edges=authored.map((e,i)=>({id:`authored:${i}`,source:e[0],target:e[1],relationship:'AUTHORED'}));
  state.adj=new Map([...state.nodeMap.keys()].map(id=>[id,new Set()]));
  state.edges.forEach(e=>{state.adj.get(e.source)?.add(e.target);state.adj.get(e.target)?.add(e.source)});

  const degrees=state.authors.map(a=>state.adj.get(a.id)?.size||0);
  const min=Math.min(...degrees),max=Math.max(...degrees);
  state.authors.forEach(a=>{
    const d=state.adj.get(a.id)?.size||0;
    a.degree=d;
    a.size=50+Math.sqrt((d-min)/(max-min||1))*20;
  });
}

function visibleIds(){
  let articleIds=new Set(state.articles.filter(a=>state.filter==='all'||a.publication_type===state.filter).map(a=>a.id));
  let authorIds=new Set();
  articleIds.forEach(id=>state.adj.get(id)?.forEach(x=>authorIds.add(x)));

  const q=norm(state.query.trim());
  if(q){
    const matched=new Set();
    [...authorIds,...articleIds].forEach(id=>{
      const n=state.nodeMap.get(id);
      const hay=norm([n?.label,n?.doi,n?.venue,n?.institution_hint,n?.publication_type,n?.orcid].join(' '));
      if(hay.includes(q)) matched.add(id);
    });
    const keep=new Set(matched);
    matched.forEach(id=>state.adj.get(id)?.forEach(x=>{
      if(articleIds.has(x)||authorIds.has(x)) keep.add(x);
    }));
    articleIds=new Set([...articleIds].filter(id=>keep.has(id)));
    authorIds=new Set([...authorIds].filter(id=>keep.has(id)));
  }
  return new Set([...articleIds,...authorIds]);
}

function graphElements(){
  const ids=visibleIds();
  const nodes=[...ids].map(id=>({data:state.nodeMap.get(id)}));
  const edges=state.edges.filter(e=>ids.has(e.source)&&ids.has(e.target)).map(e=>({data:e}));
  return [...nodes,...edges];
}

function cyStyles(){
  return[
    {selector:'node',style:{
      'background-opacity':0,'border-width':0,'background-fit':'contain','background-repeat':'no-repeat','background-position-x':'50%','background-position-y':'50%',
      'font-size':9,'font-family':'Inter, system-ui, sans-serif','font-weight':600,'color':'#47515d','text-wrap':'wrap','text-max-width':125,'text-valign':'bottom','text-margin-y':8,
      'overlay-opacity':0
    }},
    {selector:'node[node_type="Author"]',style:{
      width:'data(size)',height:'data(size)','background-image':PERSON_URI,label:'data(label)'
    }},
    {selector:'node[node_type="Article"]',style:{
      width:44,height:52,'background-image':DOC_URI,label:''
    }},
    {selector:'edge',style:{
      width:1.15,opacity:.28,'line-color':'#9eb0bd','curve-style':'bezier'
    }},
    {selector:'.dim',style:{opacity:.08}},
    {selector:'edge.dim',style:{opacity:.025}},
    {selector:'.hot',style:{opacity:1}},
    {selector:'edge.hot',style:{opacity:.8,width:1.8,'line-color':'#7590a2'}},
    {selector:'node[node_type="Article"].hot',style:{label:'data(short_label)','text-max-width':150,'font-size':8.5,'text-margin-y':10}},
    {selector:'node:selected',style:{
      'underlay-color':'#3d6681','underlay-opacity':.13,'underlay-padding':10
    }},
    {selector:'node[node_type="Article"]:selected',style:{
      label:'data(short_label)','underlay-color':'#c86f3d','underlay-opacity':.12,'underlay-padding':10
    }}
  ];
}

function layoutOptions(){
  const name=$('layoutSelect').value;
  if(name==='cose') return {name:'cose',animate:false,fit:true,padding:60,idealEdgeLength:100,nodeRepulsion:520000,numIter:800,gravity:.18};
  return {name,animate:false,fit:true,padding:60};
}

function bootGraph(){
  state.cy=cytoscape({
    container:$('cy'),elements:graphElements(),style:cyStyles(),layout:layoutOptions(),
    minZoom:.2,maxZoom:3.2,wheelSensitivity:.17,boxSelectionEnabled:false
  });
  state.cy.on('mouseover','node',e=>spotlight(e.target.id(),false));
  state.cy.on('mouseout','node',()=>restoreSpotlight());
  state.cy.on('tap','node',e=>selectNode(e.target.id(),{center:false,source:'graph'}));
  state.cy.on('tap',e=>{if(e.target===state.cy) clearSelection()});
  state.cy.one('layoutstop',()=>setTimeout(fitGraph,40));
}

function renderGraph(relayout=true){
  if(!state.cy)return;
  const selected=state.selectedId;
  state.cy.elements().remove();
  state.cy.add(graphElements());
  $('graphEmpty').hidden=state.cy.nodes().length>0;
  if(relayout&&state.cy.nodes().length) state.cy.layout(layoutOptions()).run();
  if(selected&&state.cy.getElementById(selected).length){
    state.cy.getElementById(selected).select();
    restoreSpotlight();
  }else if(selected){
    state.selectedId=null;
    renderEmptyDetail();
  }
  updateStatus();
}

function spotlight(id){
  if(!state.cy)return;
  const n=state.cy.getElementById(id);
  if(!n.length)return;
  const hot=n.closedNeighborhood();
  state.cy.elements().addClass('dim').removeClass('hot');
  hot.removeClass('dim').addClass('hot');
}
function restoreSpotlight(){
  if(!state.cy)return;
  state.cy.elements().removeClass('dim hot');
  if(state.selectedId) spotlight(state.selectedId);
}

function selectNode(id,{center=true,source='ui'}={}){
  const n=state.nodeMap.get(id);
  if(!n)return;
  state.selectedId=id;
  state.cy?.nodes().unselect();
  const ele=state.cy?.getElementById(id);
  if(ele?.length){
    ele.select();restoreSpotlight();
    if(center) state.cy.animate({center:{eles:ele},zoom:Math.max(.72,Math.min(1.12,state.cy.zoom()))},{duration:240});
  }
  renderDetail(n);
  renderExplorer();
  $('selectionHint').textContent=n.node_type==='Author'?'Autor selecionado':'Publicação selecionada';
  if(innerWidth<=1080&&source!=='graph') openDetail();
  if(innerWidth<=780&&source==='graph') openDetail();
}

function clearSelection(){
  state.selectedId=null;
  state.cy?.nodes().unselect();
  state.cy?.elements().removeClass('dim hot');
  renderEmptyDetail();
  renderExplorer();
  $('selectionHint').textContent='Selecione um autor ou publicação para explorar';
}

function fitGraph(){if(state.cy&&state.cy.nodes().length){state.cy.resize();state.cy.fit(state.cy.elements(),58)}}

function updateStatus(){
  const ids=visibleIds(),a=[...ids].filter(id=>state.nodeMap.get(id)?.node_type==='Author').length,p=[...ids].filter(id=>state.nodeMap.get(id)?.node_type==='Article').length;
  $('statusText').textContent=`${a} autores · ${p} publicações`;
}

function publicationGroupLabel(type){
  return type==='Artigo de periódico'?'Artigos em periódicos':type==='Artigo em congresso'?'Anais de congressos':'Teses de doutorado';
}

function renderExplorer(){
  const list=$('explorerList'),q=norm(state.sideQuery);
  if(state.tab==='publications'){
    let arr=state.articles.filter(a=>state.filter==='all'||a.publication_type===state.filter)
      .filter(a=>!q||norm([a.title,a.doi,a.venue,a.year].join(' ')).includes(q))
      .sort((a,b)=>(b.year-a.year)||a.title.localeCompare(b.title));
    const groups=['Artigo de periódico','Artigo em congresso','Tese de doutorado'];
    list.innerHTML=groups.map(type=>{
      const items=arr.filter(a=>a.publication_type===type);
      if(!items.length)return'';
      return `<div class="list-group-title">${publicationGroupLabel(type)} · ${items.length}</div>`+
        items.map(a=>`<button class="explorer-item publication ${state.selectedId===a.id?'active':''}" data-node="${esc(a.id)}">
          <span class="item-icon">${iconSvg('Article')}</span>
          <span class="item-copy"><span class="item-title">${esc(a.title)}</span><span class="item-meta">${a.year} · ${esc(a.venue||'')}</span></span>
          <span class="item-count">›</span>
        </button>`).join('');
    }).join('')||`<div class="empty-detail">Nenhuma publicação encontrada.</div>`;
  }else{
    let arr=state.authors.filter(a=>!q||norm([a.label,a.institution_hint,a.orcid].join(' ')).includes(q))
      .sort((a,b)=>a.label.localeCompare(b.label));
    if(state.filter!=='all'){
      arr=arr.filter(a=>[...(state.adj.get(a.id)||[])].some(id=>state.nodeMap.get(id)?.publication_type===state.filter));
    }
    list.innerHTML=arr.map(a=>`<button class="explorer-item ${state.selectedId===a.id?'active':''}" data-node="${esc(a.id)}">
      <span class="item-icon">${iconSvg('Author')}</span>
      <span class="item-copy"><span class="item-title">${esc(a.label)}</span><span class="item-meta">${esc(a.institution_hint||'Autor da rede')}</span></span>
      <span class="item-count">${state.adj.get(a.id)?.size||0}</span>
    </button>`).join('')||`<div class="empty-detail">Nenhum autor encontrado.</div>`;
  }
  list.querySelectorAll('[data-node]').forEach(b=>{
    b.onclick=()=>{selectNode(b.dataset.node,{source:'explorer'});if(innerWidth<=780)closeExplorer()};
    b.onmouseenter=()=>spotlight(b.dataset.node);
    b.onmouseleave=restoreSpotlight;
  });
}

function photoOrInitials(a,small=false){
  const cls=small?'avatar-sm':'avatar-xl';
  return `<div class="${cls}">${a.photo_url?`<img src="${esc(a.photo_url)}" alt="">`:esc(initials(a.label))}</div>`;
}

function externalLink(url,label,primary=false){
  if(!url)return'';
  return `<a class="action-link ${primary?'primary':''}" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}
  <svg viewBox="0 0 24 24"><path d="M14 5h5v5M19 5l-8 8M18 13v6H5V6h6"/></svg></a>`;
}

function renderEmptyDetail(){
  $('detailBody').innerHTML=`<div class="empty-detail">
    <div><svg viewBox="0 0 48 48"><circle cx="17" cy="15" r="5"></circle><path d="M7 35c1.4-8 5-12 10-12 4 0 7 2.5 9 7M30 10h11v25H27v-9M36 10v7h5"/></svg>
    <strong>Explore a rede</strong><div style="margin-top:6px;font-size:10px;line-height:1.5">Selecione um autor ou publicação no grafo ou na lista para abrir o contexto.</div></div>
  </div>`;
}

function renderDetail(n){
  if(n.node_type==='Author') renderAuthorDetail(n); else renderArticleDetail(n);
}

function renderAuthorDetail(a){
  const pubs=[...(state.adj.get(a.id)||[])].map(id=>state.nodeMap.get(id)).filter(n=>n?.node_type==='Article').sort((x,y)=>y.year-x.year);
  const lattes=a.url&&a.url.includes('lattes.cnpq.br')?a.url:'';
  const primary=lattes||a.url||'';
  $('detailBody').innerHTML=`
    <div class="profile-hero">
      ${photoOrInitials(a)}
      <h1 class="hero-title">${esc(a.label)}</h1>
      <div class="hero-meta">${esc(a.institution_hint||'Autor da rede ACDBio')}</div>
      <div class="badges"><span class="badge">${pubs.length} publicações na rede</span>${a.orcid?`<span class="badge">ORCID ${esc(a.orcid)}</span>`:''}</div>
      <div class="detail-actions">
        ${externalLink(primary,lattes?'Currículo Lattes':a.orcid?'ORCID':'Perfil',true)}
        ${a.orcid&&(!a.url||!a.url.includes('orcid.org'))?externalLink(`https://orcid.org/${a.orcid}`,'ORCID'):''}
      </div>
    </div>
    <div class="detail-section">
      <h3>Informações</h3>
      ${a.institution_hint?`<div class="info-line"><span>Instituição</span><span>${esc(a.institution_hint)}</span></div>`:''}
      ${a.lattes_status?`<div class="info-line"><span>Lattes</span><span>${esc(a.lattes_status)}</span></div>`:''}
    </div>
    <div class="detail-section">
      <h3>Publicações relacionadas · ${pubs.length}</h3>
      <div class="related-grid">
      ${pubs.map(p=>`<button class="related-card publication" data-node="${esc(p.id)}">
        <span class="avatar-sm">${iconSvg('Article')}</span>
        <span><span class="related-name">${esc(p.title)}</span><span class="related-meta">${p.year} · ${esc(p.publication_type)}</span></span>
        <span class="chevron">›</span>
      </button>`).join('')}
      </div>
    </div>`;
  wireDetail();
}

function renderArticleDetail(p){
  const authors=[...(state.adj.get(p.id)||[])].map(id=>state.nodeMap.get(id)).filter(n=>n?.node_type==='Author');
  $('detailBody').innerHTML=`
    <div class="profile-hero">
      <div class="publication-hero-icon">${iconSvg('Article')}</div>
      <div class="badges"><span class="badge">${esc(p.publication_type)}</span><span class="badge">${p.year}</span></div>
      <h1 class="hero-title">${esc(p.title)}</h1>
      <div class="hero-meta">${esc(p.venue||'')}${p.volume?` · v. ${esc(p.volume)}`:''}${p.pages?` · ${esc(p.pages)}`:''}</div>
      <div class="detail-actions">${externalLink(p.url,'Abrir DOI',true)}</div>
    </div>
    <div class="detail-section">
      <h3>Resumo</h3>
      <div class="abstract ${p.abstract?'':'missing'}">${p.abstract?esc(p.abstract):'Resumo ainda não cadastrado nesta base. O painel já está preparado para exibi-lo quando o campo abstract for preenchido.'}</div>
    </div>
    <div class="detail-section">
      <h3>Dados bibliográficos</h3>
      ${p.doi?`<div class="info-line"><span>DOI</span><span>${esc(p.doi)}</span></div>`:''}
      ${p.venue?`<div class="info-line"><span>Veículo</span><span>${esc(p.venue)}</span></div>`:''}
      <div class="info-line"><span>Ano</span><span>${p.year}</span></div>
      <div class="info-line"><span>Tipo</span><span>${esc(p.publication_type)}</span></div>
    </div>
    <div class="detail-section">
      <h3>Autores · ${authors.length}</h3>
      <div class="related-grid">
      ${authors.map(a=>`<button class="related-card" data-node="${esc(a.id)}">
        ${photoOrInitials(a,true)}
        <span><span class="related-name">${esc(a.label)}</span><span class="related-meta">${esc(a.institution_hint||'Autor')}</span></span>
        <span class="chevron">›</span>
      </button>`).join('')}
      </div>
    </div>`;
  wireDetail();
}

function wireDetail(){
  $('detailBody').querySelectorAll('[data-node]').forEach(b=>b.onclick=()=>selectNode(b.dataset.node,{source:'detail'}));
}

function openExplorer(){closeDetail();$('explorerPanel').classList.add('mobile-open');$('mobileScrim').classList.add('show');document.body.style.overflow='hidden'}
function closeExplorer(){$('explorerPanel').classList.remove('mobile-open');if(!$('detailPanel').classList.contains('mobile-open')){$('mobileScrim').classList.remove('show');document.body.style.overflow=''}}
function openDetail(){closeExplorer();$('detailPanel').classList.add('mobile-open');$('mobileScrim').classList.add('show');document.body.style.overflow='hidden'}
function closeDetail(){$('detailPanel').classList.remove('mobile-open');if(!$('explorerPanel').classList.contains('mobile-open')){$('mobileScrim').classList.remove('show');document.body.style.overflow=''}}

function bindUI(){
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{
    state.tab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));renderExplorer()
  });
  document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{
    state.filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderExplorer();renderGraph(true)
  });
  $('globalSearch').oninput=e=>{state.query=e.target.value;renderExplorer();renderGraph(false)};
  $('sideSearch').oninput=e=>{state.sideQuery=e.target.value;renderExplorer()};
  $('layoutSelect').onchange=()=>state.cy?.layout(layoutOptions()).run();
  $('zoomOut').onclick=()=>state.cy?.zoom({level:Math.max(.2,state.cy.zoom()/1.18),renderedPosition:{x:state.cy.width()/2,y:state.cy.height()/2}});
  $('zoomIn').onclick=()=>state.cy?.zoom({level:Math.min(3.2,state.cy.zoom()*1.18),renderedPosition:{x:state.cy.width()/2,y:state.cy.height()/2}});
  $('fitGraph').onclick=fitGraph;
  $('openExplorer').onclick=openExplorer;
  $('closeExplorer').onclick=closeExplorer;
  $('closeDetail').onclick=closeDetail;
  $('mobileScrim').onclick=()=>{closeExplorer();closeDetail()};
  window.addEventListener('resize',()=>{state.cy?.resize();setTimeout(()=>{if(!state.selectedId)fitGraph()},80)},{passive:true});
}

Promise.all([get('authors'),get('articles'),get('authored')]).then(data=>{
  setup(data);bindUI();renderExplorer();renderEmptyDetail();bootGraph();updateStatus();
}).catch(err=>{
  console.error(err);$('statusText').textContent='Falha ao carregar a base';$('detailBody').innerHTML=`<div class="empty-detail">Erro ao carregar dados: ${esc(err.message)}</div>`
});
})();
