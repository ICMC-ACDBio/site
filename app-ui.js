function renderExplorer(){
  let q=S.authorQ.toLowerCase(),authors=S.nodes.filter(n=>n.node_type==='Author').filter(n=>!q||n.label.toLowerCase().includes(q)).map(a=>({a,articles:articleIdsForAuthor(a.id).map(id=>S.map.get(id)).filter(Boolean).sort((x,y)=>(Number(y.year)||0)-(Number(x.year)||0)||x.label.localeCompare(y.label))})).filter(x=>x.articles.length).sort((x,y)=>x.a.label.localeCompare(y.a.label));
  $('explorerCount').textContent=`${authors.length} autores`;
  $('authorList').innerHTML=authors.map(({a,articles})=>{let open=S.openAuthors.has(a.id),years={};articles.forEach(p=>{let y=p.year||'Sem ano';(years[y]??=[]).push(p)});let groups=Object.entries(years).sort((x,y)=>String(y[0]).localeCompare(String(x[0]),undefined,{numeric:true})).map(([y,ps])=>`<div class="year">${esc(y)}</div>${ps.map(p=>`<button class="article-item ${S.focusId===p.id?'active':''}" data-article="${esc(p.id)}"><span class="article-icon"></span><span><span class="article-title">${esc(p.label)}</span><span class="article-meta">${esc(p.venue||p.publication_type||'')}</span></span></button>`).join('')}`).join('');return `<div class="author-card ${open?'open':''}" data-author-card="${esc(a.id)}"><button class="author-button" data-author="${esc(a.id)}"><span class="chev">▶</span><span class="author-name">${esc(a.label)}</span><span class="count">${articles.length}</span></button><div class="articles">${groups}</div></div>`}).join('');
  $('authorList').querySelectorAll('[data-author]').forEach(b=>{let id=b.dataset.author;b.onclick=()=>{S.openAuthors.has(id)?S.openAuthors.delete(id):S.openAuthors.add(id);renderExplorer()};b.onmouseenter=()=>{let ids=[id,...articleIdsForAuthor(id)],hot=S.cy.collection();ids.forEach(x=>{let n=S.cy.getElementById(x);if(n.length)hot=hot.union(n.closedNeighborhood())});if(hot.length){S.cy.elements().addClass('dim').removeClass('hot');hot.removeClass('dim').addClass('hot')}};b.onmouseleave=clearHighlight});
  $('authorList').querySelectorAll('[data-article]').forEach(b=>{let id=b.dataset.article;b.onmouseenter=()=>highlight(id);b.onmouseleave=clearHighlight;b.onclick=()=>focusArticle(id)});
}
function yearLabels(){$('fromLabel').textContent=$('fromYear').value;$('toLabel').textContent=$('toYear').value}
function bootCy(){let d=graph();S.cy=cytoscape({container:$('cy'),elements:d.elements,style:styles(),layout:layout(),minZoom:.18,maxZoom:3.5,wheelSensitivity:.18,boxSelectionEnabled:true,selectionType:'additive'});$('status').textContent=`${d.nodes.length} nós · ${d.edges.length} relações`;overview();
S.cy.on('mouseover','node',e=>highlight(e.target.id()));S.cy.on('mouseout','node',clearHighlight);S.cy.on('tap','node',e=>{let n=e.target.data();if(n.node_type==='Article')focusArticle(n.id);else detail(n)});S.cy.on('tap',e=>{if(e.target===S.cy&&!S.focusId){S.cy.nodes().unselect();overview()}})
}
document.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{let t=b.dataset.type;S.types.has(t)?S.types.delete(t):S.types.add(t);b.classList.toggle('off',!S.types.has(t));render(false)});
$('q').oninput=e=>{S.q=e.target.value.trim().toLowerCase();if(S.focusId)S.focusId=null;render(false)};
$('authorFilter').oninput=e=>{S.authorQ=e.target.value.trim();renderExplorer()};
$('filters').onclick=()=>{$('filterPop').hidden=!$('filterPop').hidden};
$('info').onclick=()=>{$('panel').classList.toggle('open');if($('panel').classList.contains('open'))overview()};
$('close').onclick=()=>$('panel').classList.remove('open');
$('back').onclick=clearFocus;
$('fromYear').oninput=()=>{yearLabels();if(S.focusId)S.focusId=null;render(false)};
$('toYear').oninput=()=>{yearLabels();if(S.focusId)S.focusId=null;render(false)};
$('reset').onclick=()=>{$('fromYear').value=S.min;$('toYear').value=S.max;S.focusId=null;S.types=new Set(['Author','Article']);document.querySelectorAll('.chip').forEach(x=>x.classList.remove('off'));yearLabels();render(true)};
$('layout').onchange=()=>S.cy.layout(layout()).run();
$('minus').onclick=()=>S.cy.zoom({level:Math.max(.18,S.cy.zoom()/1.18),renderedPosition:{x:S.cy.width()/2,y:S.cy.height()/2}});
$('plus').onclick=()=>S.cy.zoom({level:Math.min(3.5,S.cy.zoom()*1.18),renderedPosition:{x:S.cy.width()/2,y:S.cy.height()/2}});
$('fit').onclick=()=>S.cy.fit(S.cy.elements(),S.focusId?110:55);
$('libraryBtn').onclick=()=>$('explorer').classList.toggle('open');
$('explorerScrim').onclick=()=>$('explorer').classList.remove('open');
Promise.all(urls.map(get)).then(d=>{setup(d);bootCy();$('loading').remove()}).catch(err=>{console.error(err);$('loading').hidden=true;$('error').hidden=false;$('errorText').textContent=err.message;$('status').textContent='Falha ao carregar a base'})
