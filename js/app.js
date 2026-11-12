(function () {
  'use strict';

  var AGENCY = window.AGENCY || {};
  var PROPERTIES = window.PROPERTIES || [];
  var WA = AGENCY.whatsapp || '261381158182';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function normalize(str) {
    return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  function imagePath(p, i, size) {
    var suffix = size === 'c' ? '-c' : size === 't' ? '-t' : '';
    return 'assets/img/' + p.ref.toLowerCase() + '/' + pad(i) + suffix + '.jpg';
  }
  function priceLabel(p) {
    if (typeof p.price === 'number' && p.price > 0) {
      return new Intl.NumberFormat('fr-FR').format(p.price) + ' Ar';
    }
    return p.priceNote || (p.offer === 'Location' ? 'Loyer sur demande' : 'Prix sur demande');
  }
  function waLink(text) {
    return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(text);
  }

  /* Ne laisse dans les filtres que les valeurs réellement publiées */
  function pruneFilters() {
    var have = {};
    PROPERTIES.forEach(function (p) {
      have[p.offer] = true;
      have[p.type] = true;
      have[p.commune] = true;
    });
    $$('#s-offer option, #s-type option, #s-commune option, #filterOffer option, #filterType option, #filterCommune option')
      .forEach(function (opt) {
        if (opt.value && !have[opt.value]) opt.remove();
      });

    var homeCommune = $('#s-commune');
    if (homeCommune) {
      var known = $$('option', homeCommune).map(function (o) { return o.value; });
      PROPERTIES.map(function (p) { return p.commune; })
        .filter(function (c, i, arr) { return known.indexOf(c) === -1 && arr.indexOf(c) === i; })
        .sort(function (a, b) { return a.localeCompare(b, 'fr'); })
        .forEach(function (c) {
          var opt = document.createElement('option');
          opt.value = c;
          opt.textContent = c;
          homeCommune.appendChild(opt);
        });
    }
  }
  pruneFilters();

  /* ---------- En-tête ---------- */
  var header = $('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  var navToggle = $('.nav-toggle');
  var mobileMenu = $('#mobileMenu');
  if (navToggle && mobileMenu) {
    var setMenu = function (open) {
      document.body.classList.toggle('menu-open', open);
      document.body.classList.toggle('is-locked', open);
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      mobileMenu.setAttribute('aria-hidden', String(!open));
    };
    navToggle.addEventListener('click', function () {
      setMenu(!document.body.classList.contains('menu-open'));
    });
    $$('a', mobileMenu).forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1024) setMenu(false);
    });
  }

  /* ---------- Apparition au défilement ---------- */
  var revealObserver = null;
  function initReveal() {
    var nodes = $$('[data-reveal]').filter(function (el) { return !el.dataset.revealed; });
    if (!nodes.length) return;
    if (!('IntersectionObserver' in window)) {
      nodes.forEach(function (el) { el.classList.add('is-in'); el.dataset.revealed = '1'; });
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });
    }
    nodes.forEach(function (el) {
      el.dataset.revealed = '1';
      revealObserver.observe(el);
    });
  }

  /* ---------- Carte bien ---------- */
  function cardHTML(p, delay) {
    var href = 'bien.html?ref=' + encodeURIComponent(p.ref);
    var tagClass = p.offer === 'Location' ? 'tag tag--rent' : 'tag';
    return '' +
      '<article class="pcard" data-reveal style="--d:' + (delay || 0) + 'ms">' +
        '<a class="pcard__media" href="' + href + '" tabindex="-1" aria-hidden="true">' +
          '<img src="' + imagePath(p, p.cover, 'c') + '" alt="" width="900" height="675" loading="lazy" decoding="async">' +
          '<span class="' + tagClass + '">' + esc(p.offer) + '</span>' +
        '</a>' +
        '<div class="pcard__body">' +
          '<p class="pcard__place">' + esc(p.place) + '</p>' +
          '<h3 class="pcard__title"><a href="' + href + '">' + esc(p.title) + '</a></h3>' +
          '<p class="pcard__excerpt">' + esc(p.excerpt) + '</p>' +
          '<div class="pcard__foot">' +
            '<span class="pcard__price">' + esc(priceLabel(p)) + '</span>' +
            '<span class="pcard__arrow" aria-hidden="true">&rarr;</span>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  /* ---------- Sélection (accueil) ---------- */
  var featuredGrid = $('#featuredGrid');
  if (featuredGrid) {
    var featured = PROPERTIES.filter(function (p) { return p.featured; }).slice(0, 6);
    featuredGrid.innerHTML = featured.map(function (p, i) {
      return cardHTML(p, (i % 3) * 90);
    }).join('');
    initReveal();
  }

  /* ---------- Page biens ---------- */
  var listGrid = $('#propertyGrid');
  if (listGrid) {
    var filtersForm = $('#filtersForm');
    var qInput = $('#filterQ');
    var offerSelect = $('#filterOffer');
    var typeSelect = $('#filterType');
    var communeSelect = $('#filterCommune');
    var countEl = $('#resultCount');
    var emptyEl = $('#emptyState');
    var params = new URLSearchParams(window.location.search);

    var state = {
      q: params.get('q') || '',
      offer: params.get('offer') || '',
      type: params.get('type') || '',
      commune: params.get('commune') || ''
    };

    var communes = PROPERTIES.map(function (p) { return p.commune; })
      .filter(function (c, i, arr) { return arr.indexOf(c) === i; })
      .sort(function (a, b) { return a.localeCompare(b, 'fr'); });

    communes.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      communeSelect.appendChild(opt);
    });

    qInput.value = state.q;
    offerSelect.value = state.offer;
    typeSelect.value = state.type;
    communeSelect.value = state.commune;

    function syncURL() {
      var usp = new URLSearchParams();
      if (state.q) usp.set('q', state.q);
      if (state.offer) usp.set('offer', state.offer);
      if (state.type) usp.set('type', state.type);
      if (state.commune) usp.set('commune', state.commune);
      var qs = usp.toString();
      try {
        history.replaceState(null, '', 'biens.html' + (qs ? '?' + qs : ''));
      } catch (e) { /* file:// */ }
    }

    function renderList() {
      var term = normalize(state.q);
      var items = PROPERTIES.filter(function (p) {
        if (state.offer && p.offer !== state.offer) return false;
        if (state.type && p.type !== state.type) return false;
        if (state.commune && p.commune !== state.commune) return false;
        if (term) {
          var hay = normalize([p.title, p.commune, p.place, p.type, p.ref, p.excerpt].join(' '));
          if (hay.indexOf(term) === -1) return false;
        }
        return true;
      });

      listGrid.innerHTML = items.map(function (p, i) {
        return cardHTML(p, (i % 3) * 80);
      }).join('');
      listGrid.hidden = items.length === 0;
      emptyEl.hidden = items.length !== 0;
      countEl.textContent = items.length + ' bien' + (items.length > 1 ? 's' : '');
      syncURL();
      initReveal();
    }

    function readForm() {
      state.q = qInput.value.trim();
      state.offer = offerSelect.value;
      state.type = typeSelect.value;
      state.commune = communeSelect.value;
    }

    filtersForm.addEventListener('submit', function (e) {
      e.preventDefault();
      readForm();
      renderList();
    });
    [offerSelect, typeSelect, communeSelect].forEach(function (el) {
      el.addEventListener('change', function () { readForm(); renderList(); });
    });
    var qTimer;
    qInput.addEventListener('input', function () {
      clearTimeout(qTimer);
      qTimer = setTimeout(function () { readForm(); renderList(); }, 180);
    });

    function resetFilters() {
      qInput.value = '';
      offerSelect.value = '';
      typeSelect.value = '';
      communeSelect.value = '';
      readForm();
      renderList();
    }
    var resetBtn = $('#resetFilters');
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);
    var emptyReset = $('#emptyReset');
    if (emptyReset) emptyReset.addEventListener('click', resetFilters);

    renderList();
  }

  /* ---------- Page détail ---------- */
  var propertyRoot = $('#propertyRoot');
  if (propertyRoot) {
    var ref = new URLSearchParams(window.location.search).get('ref');
    var property = null;
    if (ref) {
      property = PROPERTIES.filter(function (p) {
        return p.ref.toLowerCase() === ref.toLowerCase();
      })[0] || null;
    }

    if (!property) {
      document.title = "Bien introuvable — ACACIA IMMO MADAGASCAR";
      propertyRoot.innerHTML =
        '<div class="empty" style="padding-top:110px">' +
          '<p class="eyebrow" style="justify-content:center">Bien introuvable</p>' +
          '<h2>Ce bien n\'est plus en ligne.</h2>' +
          '<p>Il a peut-être été vendu, loué ou retiré de notre sélection. Découvrez les biens actuellement disponibles.</p>' +
          '<a class="btn btn--green" href="biens.html">Voir tous les biens</a>' +
        '</div>';
    } else {
      document.title = property.title + ' — ACACIA IMMO MADAGASCAR';
      var metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', property.title + ' à ' + property.place + ' — ' + property.excerpt);

      var specs = [
        { label: 'Type de bien', value: property.type },
        { label: 'Transaction', value: property.offer },
        { label: 'Secteur', value: property.commune },
        { label: 'Référence', value: property.ref }
      ];
      if (property.surface) {
        specs.push({ label: 'Surface', value: new Intl.NumberFormat('fr-FR').format(property.surface) + ' m²' });
      }
      if (property.bedrooms) {
        specs.push({ label: 'Chambres', value: String(property.bedrooms) });
      }

      var similar = PROPERTIES.filter(function (p) {
        return p.ref !== property.ref && (p.type === property.type || p.offer === property.offer);
      });
      PROPERTIES.forEach(function (p) {
        if (similar.length < 3 && p.ref !== property.ref && similar.indexOf(p) === -1) similar.push(p);
      });
      similar = similar.slice(0, 3);

      var waInfo = waLink(
        'Bonjour ACACIA IMMO MADAGASCAR,\n\nJe souhaite plus d\'informations sur le bien ' +
        property.ref + ' — ' + property.title + ' (' + property.place + ').\n\nMerci.'
      );
      var waVisit = waLink(
        'Bonjour ACACIA IMMO MADAGASCAR,\n\nJe souhaite organiser une visite du bien ' +
        property.ref + ' — ' + property.title + '.\n\nMerci de me proposer un créneau.'
      );

      var thumbs = '';
      for (var i = 1; i <= property.images; i++) {
        thumbs +=
          '<button class="gallery__thumb' + (i === 1 ? ' is-active' : '') + '" type="button" data-i="' + (i - 1) + '" aria-label="Voir la photo ' + i + '">' +
            '<img src="' + imagePath(property, i, 't') + '" alt="" width="400" height="267" loading="lazy" decoding="async">' +
          '</button>';
      }

      propertyRoot.innerHTML =
        '<div class="container">' +
          '<nav class="breadcrumb" aria-label="Fil d\'Ariane">' +
            '<a href="index.html">Accueil</a><span aria-hidden="true">/</span>' +
            '<a href="biens.html">Biens</a><span aria-hidden="true">/</span>' +
            '<span aria-current="page">' + esc(property.ref) + '</span>' +
          '</nav>' +

          '<div class="detail__top">' +
            '<div>' +
              '<p class="eyebrow">' + esc(property.offer) + ' &middot; ' + esc(property.type) + '</p>' +
              '<h1 class="detail__title">' + esc(property.title) + '</h1>' +
              '<p class="detail__place">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z"/><circle cx="12" cy="10" r="2.4"/></svg>' +
                esc(property.place) +
              '</p>' +
            '</div>' +
            '<div class="detail__price"><span>Prix</span><strong>' + esc(priceLabel(property)) + '</strong></div>' +
          '</div>' +

          '<div class="gallery">' +
            '<div class="gallery__main" id="galleryMain" tabindex="0" role="button" aria-label="Agrandir la photo">' +
              '<img id="galleryImg" src="' + imagePath(property, 1, '') + '" alt="' + esc(property.title + ' — ' + property.commune) + '" width="1600" height="1067" fetchpriority="high">' +
              '<span class="gallery__count" id="galleryCount">1 / ' + property.images + '</span>' +
              '<button class="gallery__btn gallery__btn--prev" type="button" id="galleryPrev" aria-label="Photo précédente">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>' +
              '</button>' +
              '<button class="gallery__btn gallery__btn--next" type="button" id="galleryNext" aria-label="Photo suivante">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>' +
              '</button>' +
            '</div>' +
            '<div class="gallery__thumbs" id="galleryThumbs">' + thumbs + '</div>' +
          '</div>' +

          '<div class="detail__grid">' +
            '<div class="detail__main">' +
              '<div class="specs">' +
                specs.map(function (s) {
                  return '<div class="spec"><span>' + esc(s.label) + '</span><strong>' + esc(s.value) + '</strong></div>';
                }).join('') +
              '</div>' +

              '<div class="prose">' +
                '<h2>À propos de ce bien</h2>' +
                property.description.map(function (par) { return '<p>' + esc(par) + '</p>'; }).join('') +
              '</div>' +

              '<ul class="features">' +
                property.features.map(function (f) {
                  return '<li><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' + esc(f) + '</li>';
                }).join('') +
              '</ul>' +

              '<div class="location-block">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z"/><circle cx="12" cy="10" r="2.4"/></svg>' +
                '<div>' +
                  '<h3>' + esc(property.commune) + '</h3>' +
                  '<p>L\'adresse exacte est communiquée lors de la prise de rendez-vous. ' +
                    '<a href="https://www.google.com/maps/search/?api=1&amp;query=' + encodeURIComponent(property.commune + ', Madagascar') + '" target="_blank" rel="noopener">Voir le secteur sur la carte</a>' +
                  '</p>' +
                '</div>' +
              '</div>' +

              '<p class="detail__note">Informations et photos non contractuelles. Prix, disponibilité et caractéristiques à confirmer auprès de l\'agence lors de la visite.</p>' +
            '</div>' +

            '<aside class="agent-card" aria-label="Contacter l\'agence">' +
              '<img class="agent-card__logo" src="assets/img/logo.png" alt="ACACIA IMMO MADAGASCAR" width="78" height="78">' +
              '<p class="eyebrow">Votre interlocuteur</p>' +
              '<h3>Service commercial</h3>' +
              '<p>ACACIA IMMO MADAGASCAR</p>' +
              '<a class="agent-card__phone" href="' + (AGENCY.phoneHref || 'tel:+261381158182') + '">' + esc(AGENCY.phoneDisplay || '+261 38 11 581 82') + '</a>' +
              '<a class="btn btn--green btn--block" href="' + waVisit + '" target="_blank" rel="noopener">Demander une visite</a>' +
              '<a class="btn btn--outline btn--block" href="' + waInfo + '" target="_blank" rel="noopener">Poser une question</a>' +
              '<p class="agent-card__note">Visites sur rendez-vous · Antananarivo &amp; périphérie</p>' +
            '</aside>' +
          '</div>' +

          (similar.length ?
            '<section class="similar">' +
              '<div class="section-head">' +
                '<div><p class="eyebrow">À découvrir</p><h2>D\'autres biens<br>à considérer.</h2></div>' +
                '<div class="section-head__side"><a class="link-arrow" href="biens.html">Tous les biens &rarr;</a></div>' +
              '</div>' +
              '<div class="property-grid">' + similar.map(function (p, i) { return cardHTML(p, i * 90); }).join('') + '</div>' +
            '</section>' : '') +
        '</div>';

      setupGallery(property);
      initReveal();
    }
  }

  /* ---------- Galerie + visionneuse ---------- */
  function setupGallery(p) {
    var main = $('#galleryMain');
    var img = $('#galleryImg');
    var count = $('#galleryCount');
    var thumbs = $('#galleryThumbs');
    var lightbox = $('#lightbox');
    var lbImg = $('#lightboxImg');
    var lbCount = $('#lightboxCount');
    if (!main || !img) return;

    var index = 0;
    var total = p.images;
    var lastFocus = null;

    function altFor(i) {
      return p.title + ' — ' + p.commune + ' — photo ' + (i + 1);
    }
    function show(i) {
      index = (i + total) % total;
      img.src = imagePath(p, index + 1, '');
      img.alt = altFor(index);
      count.textContent = (index + 1) + ' / ' + total;
      $$('.gallery__thumb', thumbs).forEach(function (btn, j) {
        btn.classList.toggle('is-active', j === index);
      });
      if (lightbox && lightbox.classList.contains('is-open')) updateLightbox();
    }
    function updateLightbox() {
      lbImg.src = imagePath(p, index + 1, '');
      lbImg.alt = altFor(index);
      lbCount.textContent = (index + 1) + ' / ' + total;
    }
    function openLightbox() {
      if (!lightbox) return;
      lastFocus = document.activeElement;
      updateLightbox();
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      var closeBtn = $('.lightbox__close', lightbox);
      if (closeBtn) closeBtn.focus();
    }
    function closeLightbox() {
      if (!lightbox) return;
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    $('#galleryPrev').addEventListener('click', function (e) { e.stopPropagation(); show(index - 1); });
    $('#galleryNext').addEventListener('click', function (e) { e.stopPropagation(); show(index + 1); });
    thumbs.addEventListener('click', function (e) {
      var btn = e.target.closest('.gallery__thumb');
      if (btn) show(parseInt(btn.dataset.i, 10));
    });
    main.addEventListener('click', openLightbox);
    main.addEventListener('keydown', function (e) {
      if (e.target === main && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        openLightbox();
      }
    });

    if (lightbox) {
      $('.lightbox__close', lightbox).addEventListener('click', closeLightbox);
      $('.lightbox__nav--prev', lightbox).addEventListener('click', function () { show(index - 1); });
      $('.lightbox__nav--next', lightbox).addEventListener('click', function () { show(index + 1); });
      lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox) closeLightbox();
      });
      window.addEventListener('keydown', function (e) {
        if (!lightbox.classList.contains('is-open')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') show(index - 1);
        if (e.key === 'ArrowRight') show(index + 1);
      });
    }
  }

  /* ---------- Formulaires WhatsApp ---------- */
  $$('form[data-whatsapp]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var get = function (key) { return String(data.get(key) || '').trim(); };
      var lines = ['Bonjour ACACIA IMMO MADAGASCAR,', ''];
      if (get('name')) lines.push('Nom : ' + get('name'));
      if (get('phone')) lines.push('Téléphone : ' + get('phone'));
      if (get('subject')) lines.push('Demande : ' + get('subject'));
      if (get('message')) lines.push('', get('message'));
      if (form.dataset.ref) lines.push('', 'Bien concerné : ' + form.dataset.ref);
      window.open(waLink(lines.join('\n').trim()), '_blank', 'noopener');
    });
  });

  /* ---------- Nettoyage des filtres vides ---------- */
  $$('.search__form').forEach(function (form) {
    form.addEventListener('submit', function () {
      $$('select', form).forEach(function (select) {
        if (!select.value) select.disabled = true;
      });
    });
  });

  initReveal();
})();
