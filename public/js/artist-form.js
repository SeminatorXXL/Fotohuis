(function () {
  // --- Upload box gedrag + preview (bestaand) ---
  document.querySelectorAll('.upload-box').forEach(box => {
    const fileInput = box.querySelector('.file');
    const preview = box.querySelector('.preview');
    const targetId = box.getAttribute('data-target');

    const showPreview = (src) => {
      if (!src) { preview.classList.add('d-none'); preview.src = ''; return; }
      preview.src = src;
      preview.classList.remove('d-none');
    };

    box.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      showPreview(url);
    });

    if (targetId) {
      const urlInput = document.getElementById(targetId);
      if (urlInput) {
        const update = () => showPreview(urlInput.value.trim());
        urlInput.addEventListener('input', update);
        if (urlInput.value) update();
      }
    }
  });

  // --- Facts add/remove + JSON serialize (bestaand) ---
  const factsWrap = document.getElementById('facts-wrap');
  const factsJson = document.getElementById('facts-json');
  const addBtn = document.getElementById('add-fact');

  function serializeFacts() {
    if (!factsWrap || !factsJson) return;
    const facts = Array.from(factsWrap.querySelectorAll('.fact-input'))
      .map(i => i.value.trim())
      .filter(v => v.length);
    factsJson.value = JSON.stringify(facts);
  }

  if (addBtn && factsWrap) {
    addBtn.addEventListener('click', () => {
      const idx = factsWrap.querySelectorAll('.fact-row').length + 1;
      const row = document.createElement('div');
      row.className = 'input-group mb-2 fact-row';
      row.innerHTML = `
        <span class="input-group-text form-control-dark">Fact #${idx}</span>
        <input type="text" class="form-control form-control-dark fact-input" placeholder="Nieuwe fact">
        <button class="btn btn-outline-danger remove-fact" type="button" aria-label="Verwijderen">
          <i class="fa-solid fa-xmark"></i>
        </button>`;
      factsWrap.appendChild(row);
    });

    factsWrap.addEventListener('click', (e) => {
      if (e.target.closest('.remove-fact')) {
        const row = e.target.closest('.fact-row');
        if (row) row.remove();
        serializeFacts();
      }
    });

    factsWrap.addEventListener('input', serializeFacts);
  }

  // --- MEDIA: geavanceerde JSON [{img_url, img_alt, youtube_url}] ---
  const mediaGrid = document.getElementById('media-grid');
  const mediaJson = document.getElementById('media-json');
  const addMediaBtn = document.getElementById('add-media');

  function serializeMedia() {
    if (!mediaGrid || !mediaJson) return;
    const cards = Array.from(mediaGrid.querySelectorAll('.media-card'));
    const arr = cards.map(card => {
      return {
        img_url: card.querySelector('.media-img-url')?.value.trim() || '',
        img_alt: card.querySelector('.media-img-alt')?.value.trim() || '',
        youtube_url: card.querySelector('.media-yt')?.value.trim() || ''
      };
    }).filter(m => m.img_url || m.youtube_url || m.img_alt);
    mediaJson.value = JSON.stringify(arr);
  }

  // Unieke id generator voor dynamische mediakaarten
  let __mediaUid = Date.now();
  function nextMediaUid() {
    __mediaUid += 1;
    return __mediaUid;
  }


  function createMediaCard(data = { img_url: '', img_alt: '', youtube_url: '' }) {
    const uid = nextMediaUid();
    const inputId = `media-img-url-${uid}`;
    const previewId = `media-prev-${uid}`;
    const startDir = 'artists'; // zelfde als in je EJS foreach
    const base = 'artists';     // voor data-preview-base

    const col = document.createElement('div');
    col.className = 'col-12 col-md-6 col-xl-4 media-card';
    col.innerHTML = `
      <div class="card h-100">
        <div class="ratio ratio-16x9 bg-black position-relative">
          <img id="${previewId}" class="img-fluid object-fit-cover w-100 h-100 media-preview" alt="${data.img_alt || ''}" src="${data.img_url || ''}">
        </div>
        <div class="card-body">
          <div class="mb-2">
            <label class="form-label">Image URL</label>
            <div class="input-group">
              <input type="text"
                    id="${inputId}"
                    class="form-control form-control-dark media-img-url"
                    placeholder="/media/${base}/voorbeeld.jpg of bestandsnaam"
                    value="${data.img_url || ''}"
                    data-preview-base="${base}">
              <button class="btn btn-outline-secondary"
                      type="button"
                      data-bs-toggle="modal"
                      data-bs-target="#mediaPickerModal"
                      data-target-input="#${inputId}"
                      data-start-dir=""
                      title="Select image">
                <i class="fa-regular fa-images me-1"></i>Select image
              </button>
            </div>
          </div>
          <div class="mb-2">
            <label class="form-label">Alt text</label>
            <input type="text" class="form-control form-control-dark media-img-alt" placeholder="Beschrijving" value="${data.img_alt || ''}">
          </div>
          <div class="mb-2">
            <label class="form-label">YouTube URL</label>
            <input type="url" class="form-control form-control-dark media-yt" placeholder="https://youtu.be/..." value="${data.youtube_url || ''}">
          </div>
        </div>
        <div class="card-footer bg-transparent border-secondary d-flex justify-content-between">
          <button type="button" class="btn btn-outline-danger btn-sm media-remove">
            <i class="fa-solid fa-trash me-1"></i> Remove
          </button>
          <button type="button" class="btn btn-outline-secondary btn-sm media-dup">
            <i class="fa-solid fa-clone me-1"></i> Duplicate
          </button>
        </div>
      </div>`;
    return col;
  }


  function refreshMediaPreviews(scope) {
    const card = scope.closest('.media-card');
    const url = scope.closest('.media-card').querySelector('.media-img-url')?.value.trim();
    const alt = scope.closest('.media-card').querySelector('.media-img-alt')?.value.trim();
    const img = card.querySelector('.media-preview');
    if (img) {
      img.src = url || '';
      img.alt = alt || '';
    }
  }

  if (addMediaBtn && mediaGrid) {
    addMediaBtn.addEventListener('click', () => {
      mediaGrid.appendChild(createMediaCard());
    });

    mediaGrid.addEventListener('click', (e) => {
      if (e.target.closest('.media-remove')) {
        const card = e.target.closest('.media-card');
        if (card) card.remove();
        serializeMedia();
      }
      if (e.target.closest('.media-dup')) {
        const card = e.target.closest('.media-card');
        if (!card) return;
        const data = {
          img_url: card.querySelector('.media-img-url')?.value || '',
          img_alt: card.querySelector('.media-img-alt')?.value || '',
          youtube_url: card.querySelector('.media-yt')?.value || ''
        };
        mediaGrid.appendChild(createMediaCard(data));
        serializeMedia();
      }
    });

    mediaGrid.addEventListener('input', (e) => {
      if (e.target.classList.contains('media-img-url') || e.target.classList.contains('media-img-alt')) {
        refreshMediaPreviews(e.target);
      }
      serializeMedia();
    });

    mediaGrid.addEventListener('change', (e) => {
      if (e.target.classList.contains('media-img-url') || e.target.classList.contains('media-img-alt')) {
        refreshMediaPreviews(e.target);
      }
      serializeMedia();
    });

  }

  // --- Active toggle hidden value sync (bestaand) ---
  const activeToggle = document.getElementById('activeToggle');
  const activeHidden = document.getElementById('activeHidden');
  if (activeToggle && activeHidden) {
    activeToggle.addEventListener('change', () => {
      activeHidden.value = activeToggle.checked ? 1 : 0;
    });
  }

  // --- Bootstrap validatie + laatste serialize bij submit ---
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', (e) => {
      if (form.classList.contains('needs-validation') && !form.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
      }
      form.classList.add('was-validated');
      serializeFacts();
      serializeMedia();
    }, false);
  }
})();
