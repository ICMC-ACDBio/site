(()=>{
  let tries=0;
  const apply=()=>{
    tries++;
    if(typeof S==='undefined'||!S.cy){if(tries<100)setTimeout(apply,60);return}

    S.cy.style()
      .selector('node[node_type="Author"]')
      .style({
        shape:'ellipse',
        width:'data(size)',height:'data(size)',
        'background-color':'#3f789f',
        'background-image':'./assets/person.svg?v=2',
        'background-repeat':'no-repeat',
        'background-position-x':'50%','background-position-y':'50%',
        'background-fit':'none','background-width':'62%','background-height':'62%',
        'background-image-opacity':1,
        'border-width':1,'border-color':'#2f6385'
      })
      .selector('node[node_type="Author"][group="coauthor"]')
      .style({'background-color':'#70899b','border-color':'#60798a'})
      .selector('node[node_type="Article"]')
      .style({
        shape:'rectangle',width:36,height:42,
        'background-color':'transparent',
        'background-image':'./assets/document.svg?v=2',
        'background-repeat':'no-repeat',
        'background-position-x':'50%','background-position-y':'50%',
        'background-fit':'contain','background-width':'100%','background-height':'100%',
        'background-image-opacity':1,
        'border-width':0,label:''
      })
      .selector('node[node_type="Article"]:selected')
      .style({'border-width':2,'border-color':'#3f789f'})
      .update();

    S.cy.resize();
    setTimeout(()=>{if(S.cy&&!S.focusId)S.cy.fit(S.cy.elements(),64)},80);
  };
  apply();
})();
