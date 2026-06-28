import { defineConfig } from 'vitepress'

const resizeScript = `(function(){
var dragging=null,sidebar=null,tocAside=null;

function injectCSS(){
  if(document.getElementById('vprs-resize-css'))return;
  var s=document.createElement('style');
  s.id='vprs-resize-css';
  s.textContent=
    ':root{--vp-layout-max-width:100%}'+
    '.VPDoc .container,.VPDoc .content,.VPDoc .content-container,.VPNavBar .container,.VPNavBar .wrapper{max-width:100%!important}'+
    '.VPDoc.has-aside .content-container{max-width:100%!important}'+
    '.rsh{position:fixed;top:0;bottom:0;width:8px;cursor:col-resize;z-index:100;user-select:none}'+
    '.rsh::after{content:"";position:absolute;top:var(--vp-nav-height);bottom:0;left:50%;transform:translateX(-50%);width:3px;background:transparent;transition:all .2s}'+
    '.rsh:hover::after,.rsh.drag::after{background:#3451b2;width:5px}'+
    '#VPSidebarNav{text-align:center}'+
    '#VPSidebarNav .VPSidebarGroup .text,#VPSidebarNav .VPSidebarItem .text{display:block;text-align:center}'+
    '.VPContent.is-home{background-color:#0d1117;background-image:linear-gradient(rgba(52,81,178,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(52,81,178,.05) 1px,transparent 1px);background-size:48px 48px;background-position:center center;min-height:100vh;position:relative}'+
    '.VPContent.is-home::before{content:"";position:absolute;top:0;left:0;width:100%;height:100%;background:radial-gradient(ellipse at 50% 0%,rgba(52,81,178,.08) 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(124,156,255,.04) 0%,transparent 40%);pointer-events:none;z-index:0}'+
    '.VPHome .VPHero{background:linear-gradient(180deg,rgba(13,17,23,.88) 0%,rgba(13,17,23,.65) 70%,transparent 100%);--vp-home-hero-name-color:transparent;--vp-home-hero-name-background:linear-gradient(135deg,#58a6ff,#a5d6ff)}'+
    '.VPHome .VPHero .text,.VPHome .VPHero .tagline{color:#8b949e!important}'+
    '.VPHome .VPFeatures{background:linear-gradient(180deg,transparent 0%,rgba(13,17,23,.9) 8%,#0d1117 100%);padding-bottom:64px}'+
    '.VPHome .VPFeature{background-color:rgba(22,27,34,.85)!important;border:1px solid rgba(48,54,61,.5)!important}'+
    '.VPHome .VPFeature:hover{background-color:rgba(33,38,45,.9)!important;border-color:rgba(88,166,255,.25)!important}'+
    '.VPHome .VPFeature .title{color:#e6edf3!important}'+
    '.VPHome .VPFeature .details{color:#8b949e!important}'+
    '.VPFooter{background-color:#1a1b26!important}'+
    '.VPFeature .icon{position:absolute;top:12px;right:16px;font-size:24px;margin:0!important;width:auto!important;height:auto!important;background:none!important;border-radius:0!important;display:flex!important;align-items:center;justify-content:center}'+
    '.VPFeature{position:relative;max-width:260px;margin-left:auto;margin-right:auto}';
  document.head.appendChild(s);
}

function createHandles(){
  if(!document.querySelector('.VPDoc')){
    document.querySelectorAll('.rsh').forEach(function(el){el.remove()});
    return;
  }
  sidebar=document.querySelector('aside.VPSidebar');
  tocAside=document.querySelector('.VPDocAside');
  if(!sidebar||!tocAside||!document.body)return;

  var sw=localStorage.getItem('vprs-sw');
  if(sw){sidebar.style.width=sw+'px';document.documentElement.style.setProperty('--vp-sidebar-width',sw+'px');}

  var tw=localStorage.getItem('vprs-tw');
  if(tw)setTocWidth(parseInt(tw));

  if(!document.querySelector('.rsh-l')){
    var lh=document.createElement('div');
    lh.className='rsh rsh-l';
    lh.style.left=(sidebar.getBoundingClientRect().right-4)+'px';
    document.body.appendChild(lh);
    updateLeftHandlePos();
  }

  if(!document.querySelector('.rsh-r')){
    var rh=document.createElement('div');
    rh.className='rsh rsh-r';
    var tocRect=tocAside.getBoundingClientRect();
    rh.style.right=(window.innerWidth-tocRect.left-4)+'px';
    document.body.appendChild(rh);
  }
}

function updateLeftHandlePos(){
  var lh=document.querySelector('.rsh-l');
  if(lh&&sidebar)lh.style.left=(sidebar.getBoundingClientRect().right-4)+'px';
}

function updateRightHandlePos(){
  var rh=document.querySelector('.rsh-r');
  if(rh&&tocAside)rh.style.right=(window.innerWidth-tocAside.getBoundingClientRect().left-4)+'px';
}

function setTocWidth(w){
  var container=document.querySelector('.VPDoc .aside-container');
  var curtain=document.querySelector('.VPDoc .aside-curtain');
  var aside=document.querySelector('.VPDoc .aside');
  if(container)container.style.width=w+'px';
  if(curtain)curtain.style.width=w+'px';
  if(aside){aside.style.maxWidth=w+'px';aside.style.width=w+'px';}
  localStorage.setItem('vprs-tw',w);
  updateRightHandlePos();
}

document.addEventListener('mousedown',function(e){
  if(e.target.classList.contains('rsh-l')){dragging='sidebar';e.target.classList.add('drag');}
  else if(e.target.classList.contains('rsh-r')){dragging='toc';e.target.classList.add('drag');}
  else return;
  document.body.style.cursor='col-resize';document.body.style.userSelect='none';e.preventDefault();
});

document.addEventListener('mousemove',function(e){
  if(!dragging)return;
  if(dragging==='sidebar'&&sidebar){
    var w=Math.max(180,Math.min(500,e.clientX));
    sidebar.style.width=w+'px';
    document.documentElement.style.setProperty('--vp-sidebar-width',w+'px');
    localStorage.setItem('vprs-sw',w);
    updateLeftHandlePos();
  }
  if(dragging==='toc'&&tocAside){
    var w=Math.max(150,Math.min(450,window.innerWidth-e.clientX));
    setTocWidth(w);
  }
});

document.addEventListener('mouseup',function(){
  if(dragging){
    document.querySelectorAll('.rsh.drag').forEach(function(el){el.classList.remove('drag')});
    dragging=null;document.body.style.cursor='';document.body.style.userSelect='';
  }
});

window.addEventListener('resize',function(){updateLeftHandlePos();updateRightHandlePos();});

function start(){
  injectCSS();
  var tries=0;
  function tryInit(){
    sidebar=document.querySelector('aside.VPSidebar');
    tocAside=document.querySelector('.VPDocAside');
    if(!sidebar||!tocAside){
      if(++tries<50)return setTimeout(tryInit,200);
      return;
    }
    createHandles();
    new MutationObserver(function(){createHandles()}).observe(document.body,{childList:true,subtree:true});
  }
  tryInit();
}

if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
})()`

const resizePlugin = () => ({
  name: 'resize-plugin',
  transformIndexHtml(html) {
    return html.replace('</head>', '<script>' + resizeScript + '</script></head>')
  }
})

export default defineConfig({
  title: "阿伟知识库",
  description: "阿伟的个人笔记与知识管理",
  lang: 'zh-CN',
  vite: {
    plugins: [resizePlugin()]
  },
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '笔记', link: '/notes/' }
    ],
    sidebar: {
      '/notes/': [
        {
          text: '笔记',
          items: [
            { text: 'Python', link: '/notes/python' },
            { text: 'Python 数据处理速查', link: '/notes/python-data-processing' },
            { text: 'Pandas', link: '/notes/pandas' },
            { text: 'NumPy', link: '/notes/numpy' },
            { text: 'MySQL', link: '/notes/mysql' },
            { text: 'Linux', link: '/notes/linux' },
            { text: 'Hadoop', link: '/notes/hadoop' },
            { text: 'Hive', link: '/notes/hive' },
            { text: 'Spark', link: '/notes/spark' },
            { text: 'PySpark', link: '/notes/pyspark' },
            { text: 'Git', link: '/notes/git' }
          ]
        }
      ]
    },
    search: {
      provider: 'local'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com' }
    ]
  }
})
