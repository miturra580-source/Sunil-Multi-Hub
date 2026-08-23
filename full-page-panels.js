(() => {
  function injectStyles() {
    if (document.getElementById('smhFullPagePanelsStyle')) return;
    const style = document.createElement('style');
    style.id = 'smhFullPagePanelsStyle';
    style.textContent = `
      #serviceDetailsBox,
      #variantBox,
      #applicationBox {
        width:100vw !important;
        height:100dvh !important;
        max-height:100dvh !important;
        border-radius:0 !important;
        padding:max(18px, env(safe-area-inset-top)) 18px max(18px, env(safe-area-inset-bottom)) !important;
        box-sizing:border-box !important;
        overflow-y:auto !important;
        overscroll-behavior:contain !important;
      }

      #serviceDetailsBox,
      #variantBox,
      #applicationBox {
        box-shadow:none !important;
      }

      #serviceDetailsBackdrop,
      #variantBackdrop,
      #applicationBackdrop {
        background:#fff !important;
      }

      @media (min-width:900px) {
        #serviceDetailsBox,
        #variantBox,
        #applicationBox {
          width:min(980px,100vw) !important;
          border-left:1px solid #e7ebf2 !important;
          border-right:1px solid #e7ebf2 !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function stopBackdropClose(event) {
    const id = event.target?.id;
    if (!['serviceDetailsBackdrop','variantBackdrop','applicationBackdrop'].includes(id)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  injectStyles();
  document.addEventListener('click', stopBackdropClose, true);
  document.addEventListener('pointerdown', stopBackdropClose, true);
})();