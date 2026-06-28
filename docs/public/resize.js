(function () {
  if (typeof window === 'undefined') return

  var dragging = null
  var sidebar = null
  var toc = null

  function injectCSS() {
    if (document.getElementById('vprs-resize-css')) return
    var style = document.createElement('style')
    style.id = 'vprs-resize-css'
    style.textContent =
      ':root{--vp-layout-max-width:100%}' +
      '.VPDoc .container,.VPDoc .content,.VPDoc .content-container,.VPNavBar .container,.VPNavBar .wrapper{max-width:100%!important}' +
      '.VPSidebar{padding-left:24px!important}' +
      '.VPDocAside{padding-right:24px!important}' +
      '.VPDoc.has-aside .content-container{max-width:100%!important}' +
      '.rsh{width:8px;cursor:col-resize;flex-shrink:0;z-index:10;position:relative}' +
      '.rsh::after{content:"";position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);width:3px;background:#e0e0e0;transition:all 0.2s}' +
      '.rsh:hover::after,.rsh.drag::after{background:#3451b2;width:5px}'
    document.head.appendChild(style)
  }

  function createHandles() {
    var doc = document.querySelector('.VPDoc')
    if (!doc) return setTimeout(createHandles, 300)

    sidebar = doc.querySelector('aside.VPSidebar')
    toc = doc.querySelector('aside.VPDocAside')

    if (sidebar) {
      var sw = localStorage.getItem('vprs-sw')
      if (sw) sidebar.style.width = sw + 'px'
    }
    if (toc) {
      var tw = localStorage.getItem('vprs-tw')
      if (tw) toc.style.width = tw + 'px'
    }

    if (sidebar && !doc.querySelector('.rsh-l')) {
      var lh = document.createElement('div')
      lh.className = 'rsh rsh-l'
      sidebar.after(lh)
    }

    if (toc && !doc.querySelector('.rsh-r')) {
      var rh = document.createElement('div')
      rh.className = 'rsh rsh-r'
      toc.before(rh)
    }
  }

  document.addEventListener('mousedown', function (e) {
    if (e.target.classList.contains('rsh-l')) {
      dragging = 'sidebar'
      e.target.classList.add('drag')
    } else if (e.target.classList.contains('rsh-r')) {
      dragging = 'toc'
      e.target.classList.add('drag')
    } else return
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    e.preventDefault()
  })

  document.addEventListener('mousemove', function (e) {
    if (!dragging) return
    if (dragging === 'sidebar' && sidebar) {
      var w = Math.max(180, Math.min(500, e.clientX))
      sidebar.style.width = w + 'px'
      localStorage.setItem('vprs-sw', w)
    }
    if (dragging === 'toc' && toc) {
      var w = Math.max(150, Math.min(450, window.innerWidth - e.clientX))
      toc.style.width = w + 'px'
      localStorage.setItem('vprs-tw', w)
    }
  })

  document.addEventListener('mouseup', function () {
    if (dragging) {
      document.querySelectorAll('.rsh.drag').forEach(function (el) { el.classList.remove('drag') })
      dragging = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  })

  function start() {
    injectCSS()
    createHandles()
    var observer = new MutationObserver(function () { createHandles() })
    observer.observe(document.body, { childList: true, subtree: true })
  }

  if (document.body) {
    start()
  } else {
    document.addEventListener('DOMContentLoaded', start)
  }
})()
