const $=id=>document.getElementById(id), urls=['authors','articles','institutions','venues','authored','affiliated','published'];
const S={nodes:[],edges:[],map:new Map(),adj:new Map(),types:new Set(['Author','Article','Institution','Venue']),rels:new Set(['AUTHORED','AFFILIATED_WITH','PUBLISHED_IN']),q:'',authorQ:'',cy:null,min:0,max:0,focusId:null,openAuthors:new Set()};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cls=t=>({Author:'a',Article:'p',Institution:'i',Venue:'v'}[t]||'');
async function get(name){let r=await fetch(`./data/${name}.json?v=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw Error(`${name}.json: HTTP ${r.status}`);return r.json()}
function setup([authors,articles,institutions,venues,authored,affiliated,published]){
  S.nodes=[...authors,...articles,...institutions,...venues];
  S.edges=[...authored.map((e,i)=>({id:`a:${i}`,source:e[0],target:e[1],relationship:'AUTHORED'})),...affiliated,...published];
  S.map=new Map(S.nodes.map(n=>[n.id,n]));S.adj=new Map(S.nodes.map(n=>[n.id,new Set()]));
  S.edges.forEach(e=>{S.adj.get(e.source)?.add(e.target);S.adj.get(e.target)?.add(e.source)});
  S.nodes.filter(n=>n.node_type==='Author').forEach(n=>{n.degree=S.edges.filter(e=>e.source===n.id||e.target===n.id).length;n.publication_degree=S.edges.filter(e=>e.relationship==='AUTHORED'&&(e.source===n.id||e.target===n.id)).length});
  S.nodes.filter(n=>n.node_type==='Article').forEach(n=>n.author_count=S.edges.filter(e=>e.relationship==='AUTHORED'&&(e.source===n.id||e.target===n.id)).length);
  let ds=S.nodes.filter(n=>n.node_type==='Author').map(n=>n.degree),mn=Math.min(...ds),mx=Math.max(...ds);S.nodes.filter(n=>n.node_type==='Author').forEach(n=>n.size=28+Math.sqrt((n.degree-mn)/(mx-mn||1))*34);
  let ys=S.nodes.filter(n=>n.node_type==='Article'&&n.year).map(n=>n.year);S.min=Math.min(...ys);S.max=Math.max(...ys);['fromYear','toYear'].forEach(id=>{$(id).min=S.min;$(id).max=S.max});$('fromYear').value=S.min;$('toYear').value=S.max;yearLabels();renderExplorer();
}
function text(n){return[n.label,n.title,n.doi,n.venue,n.keywords_official,n.keywords_normalized,n.institution_hint].join(' ').toLowerCase()}
function articleIdsForAuthor(id){return S.edges.filter(e=>e.relationship==='AUTHORED'&&(e.source===id||e.target===id)).map(e=>e.source===id?e.target:e.source).filter(x=>S.map.get(x)?.node_type==='Article')}
function graph(){
  let ids=new Set;
  S.nodes.forEach(n=>{if(!S.types.has(n.node_type))return;if(n.node_type==='Article'&&n.year&&(n.year<+$('fromYear').value||n.year>+$('toYear').value))return;ids.add(n.id)});
  if(S.q){let m=[...ids].filter(id=>text(S.map.get(id)).includes(S.q)),keep=new Set(m);m.forEach(id=>S.adj.get(id)?.forEach(x=>ids.has(x)&&keep.add(x)));ids=keep}
  if(S.focusId){let keep=new Set([S.focusId]);S.adj.get(S.focusId)?.forEach(id=>ids.has(id)&&keep.add(id));ids=new Set([...keep].filter(id=>ids.has(id)||id===S.focusId))}
  let nodes=[...ids].map(id=>({data:S.map.get(id)})),edges=S.edges.filter(e=>S.rels.has(e.relationship)&&ids.has(e.source)&&ids.has(e.target)).map(e=>({data:e}));
  return{elements:[...nodes,...edges],nodes,edges}
}
function styles(){return[
{selector:'node',style:{label:'data(label)','font-size':9,color:'#404850','text-wrap':'wrap','text-max-width':135,'text-valign':'bottom','text-margin-y':8,'background-color':'#777','border-width':1,'border-color':'#9ba4ac',width:30,height:30}},
{selector:'node[node_type="Author"]',style:{shape:'ellipse',width:'data(size)',height:'data(size)','background-color':'#3f789f'}},{selector:'node[node_type="Author"][group="coauthor"]',style:{'background-color':'#70899b'}},
{selector:'node[node_type="Article"]',style:{shape:'round-rectangle',width:38,height:32,'background-color':'#7d858d',label:''}},{selector:'node[node_type="Institution"]',style:{shape:'hexagon',width:42,height:38,'background-color':'#57826e',label:''}},{selector:'node[node_type="Venue"]',style:{shape:'rectangle',width:38,height:32,'background-color':'#786785',label:''}},
{selector:'edge',style:{width:1,opacity:.35,'curve-style':'bezier','line-color':'#b8c0c7'}},{selector:'edge[relationship="AUTHORED"]',style:{width:1.5,opacity:.62,'line-color':'#7390a4'}},{selector:'edge[relationship="AFFILIATED_WITH"]',style:{'line-color':'#72917f'}},{selector:'edge[relationship="PUBLISHED_IN"]',style:{'line-color':'#8c8094'}},
{selector:':selected',style:{'border-width':3,'border-color':'#111820'}},{selector:'.dim',style:{opacity:.07}},{selector:'edge.dim',style:{opacity:.025}},{selector:'.hot',style:{opacity:1}},{selector:'edge.hot',style:{opacity:.95,width:2.2}}
]}
function layout(){let n=$('layout').value;return{name:n,animate:false,fit:true,padding:S.focusId?110:55,...(n==='cose'?{idealEdgeLength:S.focusId?135:105,nodeRepulsion:700000,numIter:900}:{})}}
function render(relayout=false){let d=graph();S.cy.elements().remove();S.cy.add(d.elements);$('status').textContent=`${d.nodes.length} nós · ${d.edges.length} relações`;if(relayout||S.focusId)S.cy.layout(layout()).run();updateFocusBar();if(!$('panel').classList.contains('open'))overview();renderExplorer()}
function row(n){return `<button class="row" data-id="${esc(n.id)}"><span class="dot ${cls(n.node_type)}"></span><span>${esc(n.label)}</span></button>`}
function overview(){let ns=S.cy.nodes().map(n=>n.data()),count=t=>ns.filter(n=>n.node_type===t).length;$('panelTitle').textContent='Visão geral';$('panelBody').innerHTML=`<div class="stats"><div class="stat"><small>nós</small><b>${ns.length}</b></div><div class="stat"><small>arestas</small><b>${S.cy.edges().length}</b></div><div class="stat"><small>autores</small><b>${count('Author')}</b></div><div class="stat"><small>artigos</small><b>${count('Article')}</b></div></div>${['Author','Article','Institution','Venue'].map(t=>{let a=ns.filter(n=>n.node_type===t);return a.length?`<div class="section"><h4>${t} · ${a.length}</h4>${a.slice(0,30).map(row).join('')}</div>`:''}).join('')}`;wire()}
function detail(n){$('panel').classList.add('open');$('panelTitle').textContent=n.label;let r=n.node_type==='Author'?[['Papel',n.role||n.group],['Artigos na rede',n.publication_degree],['Grau',n.degree],['Instituição',n.institution_hint],['ORCID',n.orcid],['Lattes',n.lattes_status]]:n.node_type==='Article'?[['Ano',n.year],['Autores',n.author_count],['DOI',n.doi],['Publicado em',n.venue],['Tipo',n.publication_type],['Escopo',n.scope],['Keywords',n.keywords_normalized]]:n.node_type==='Institution'?[['Cidade',n.city],['País',n.country]]:[['Publicação',n.name||n.label]];let neighbors=[...(S.adj.get(n.id)||[])].map(id=>S.map.get(id)).filter(Boolean);$('panelBody').innerHTML=`<span class="tag">${esc(n.node_type)}</span>${r.filter(x=>x[1]!==''&&x[1]!=null).map(x=>`<div class="detail"><label>${esc(x[0])}</label>${esc(x[1])}</div>`).join('')}${n.url?`<a class="link" href="${esc(n.url)}" target="_blank" rel="noopener">Abrir fonte ↗</a>`:''}${n.node_type==='Article'?`<div class="actionline"><button class="btn" data-focus="${esc(n.id)}">Mostrar artigo + vizinhos</button></div>`:''}<div class="section"><h4>Conexões diretas · ${neighbors.length}</h4>${neighbors.slice(0,40).map(row).join('')}</div>`;wire()}
function wire(){$('panelBody').querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{let x=S.cy.getElementById(b.dataset.id);if(x.length){S.cy.nodes().unselect();x.select();S.cy.animate({center:{eles:x},zoom:Math.max(1,S.cy.zoom())},{duration:220});detail(x.data())}});$('panelBody').querySelectorAll('[data-focus]').forEach(b=>b.onclick=()=>focusArticle(b.dataset.focus))}
function highlight(id){if(!S.cy)return;let n=S.cy.getElementById(id);if(!n.length)return;let hot=n.closedNeighborhood();S.cy.elements().addClass('dim').removeClass('hot');hot.removeClass('dim').addClass('hot')}
function clearHighlight(){S.cy?.elements().removeClass('dim hot')}
function focusArticle(id){let n=S.map.get(id);if(!n||n.node_type!=='Article')return;S.focusId=id;render(true);requestAnimationFrame(()=>{let x=S.cy.getElementById(id);if(x.length){x.select();S.cy.fit(S.cy.elements(),110)}});detail(n);document.querySelectorAll('.article-item').forEach(b=>b.classList.toggle('active',b.dataset.article===id));if(innerWidth<=820)$('explorer').classList.remove('open')}
function clearFocus(){S.focusId=null;render(true);$('panel').classList.remove('open');clearHighlight()}
function updateFocusBar(){if(S.focusId){let n=S.map.get(S.focusId);$('focusTitle').textContent=n?.label||'';$('focusBar').classList.add('show')}else $('focusBar').classList.remove('show')}
