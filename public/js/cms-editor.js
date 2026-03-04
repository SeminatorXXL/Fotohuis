(function () {
  const editors = [];

  // ---- Shim zodat zowel classic-build als super-build werkt ----
  if (!window.ClassicEditor && window.CKEDITOR && window.CKEDITOR.ClassicEditor) {
    window.ClassicEditor = window.CKEDITOR.ClassicEditor;
  }
  // --------------------------------------------------------------

  function initEditors() {
    const areas = document.querySelectorAll('textarea.wysiwyg');
    if (!areas.length || typeof window.ClassicEditor === 'undefined') return;

    areas.forEach((ta) => {
      window.ClassicEditor.create(ta, {
        toolbar: [
          'heading', '|',
          'bold', 'italic', 'link', '|',
          'bulletedList', 'numberedList', '|',
          'blockQuote', 'insertTable', '|',
          'undo', 'redo'
        ], 
        link: {
          decorators: {
            addTargetToExternalLinks: true,
            openInNewTab: {
              mode: 'manual',
              label: 'Open in nieuw tabblad',
              attributes: { target: '_blank', rel: 'noopener noreferrer' }
            },
            nofollow: {
              mode: 'manual',
              label: 'No follow (SEO)',
              attributes: { rel: 'nofollow' }
            },
            btnPrimary: {
              mode: 'manual',
              label: 'Button (primary)',
              attributes: { class: 'btn btn-primary' }
            },
            btnSecondary: {
              mode: 'manual',
              label: 'Button (secondary)',
              attributes: { class: 'btn btn-secondary' }
            }
          }
        },
        table: { contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'] }
      })
      .then(editor => editors.push(editor))
      .catch(err => console.error('CKEditor init error:', err));
    });
  }

  function hookFormSubmit() {
    const form = document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', function () {
      editors.forEach(ed => {
        try { ed.updateSourceElement(); } catch (err) {}
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initEditors();
    hookFormSubmit();
  });
})();
