(()=>{
  const isMobile=()=>window.matchMedia('(max-width:820px)').matches;
  const explorer=document.getElementById('explorer');
  const panel=document.getElementById('panel');
  const filterPop=document.getElementById('filterPop');
  const libraryBtn=document.getElementById('libraryBtn');
  const infoBtn=document.getElementById('info');
  const filtersBtn=document.getElementById('filters');
  const closeBtn=document.getElementById('close');
  const scrim=document.getElementById('explorerScrim');

  const syncBody=()=>{
    if(!isMobile()){
      document.body.classList.remove('mobile-overlay');
      return;
    }
    const anyOpen=explorer?.classList.contains('open')||panel?.classList.contains('open')||(filterPop&&!filterPop.hidden);
    document.body.classList.toggle('mobile-overlay',!!anyOpen);
  };

  const closeExplorer=()=>explorer?.classList.remove('open');
  const closePanel=()=>panel?.classList.remove('open');
  const closeFilters=()=>{if(filterPop)filterPop.hidden=true};

  libraryBtn?.addEventListener('click',()=>{
    if(!isMobile())return;
    closePanel();
    closeFilters();
    requestAnimationFrame(syncBody);
  });

  infoBtn?.addEventListener('click',()=>{
    if(!isMobile())return;
    closeExplorer();
    closeFilters();
    requestAnimationFrame(syncBody);
  });

  filtersBtn?.addEventListener('click',()=>{
    if(!isMobile())return;
    closeExplorer();
    closePanel();
    requestAnimationFrame(syncBody);
  });

  closeBtn?.addEventListener('click',()=>requestAnimationFrame(syncBody));
  scrim?.addEventListener('click',()=>requestAnimationFrame(syncBody));

  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape'||!isMobile())return;
    closeExplorer();
    closePanel();
    closeFilters();
    syncBody();
  });

  if(explorer)new MutationObserver(syncBody).observe(explorer,{attributes:true,attributeFilter:['class']});
  if(panel)new MutationObserver(syncBody).observe(panel,{attributes:true,attributeFilter:['class']});
  if(filterPop)new MutationObserver(syncBody).observe(filterPop,{attributes:true,attributeFilter:['hidden']});

  let fitTimer;
  const resizeGraph=()=>{
    clearTimeout(fitTimer);
    fitTimer=setTimeout(()=>{
      if(typeof S==='undefined'||!S.cy)return;
      S.cy.resize();
      if(!S.focusId)S.cy.fit(S.cy.elements(),isMobile()?34:64);
    },120);
  };

  window.addEventListener('orientationchange',resizeGraph,{passive:true});
  window.addEventListener('resize',resizeGraph,{passive:true});
  window.visualViewport?.addEventListener('resize',resizeGraph,{passive:true});

  syncBody();
})();
