(()=>{
  let attempts=0;
  const attach=()=>{
    attempts++;
    if(typeof S==='undefined'||!S.cy){
      if(attempts<80)setTimeout(attach,75);
      return;
    }

    const stage=document.querySelector('.stage');
    let timer;
    const fitAll=()=>{
      clearTimeout(timer);
      timer=setTimeout(()=>{
        if(!S.cy||S.focusId)return;
        S.cy.resize();
        S.cy.fit(S.cy.elements(),64);
      },70);
    };

    /* Force a clean full-network view after the first layout/render. */
    setTimeout(fitAll,120);
    setTimeout(fitAll,360);
    S.cy.one('layoutstop',()=>setTimeout(fitAll,30));

    if(stage&&'ResizeObserver' in window){
      new ResizeObserver(fitAll).observe(stage);
    }
    window.addEventListener('resize',fitAll,{passive:true});
  };

  attach();
})();
