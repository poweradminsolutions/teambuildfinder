/**
 * Client-side filtering and sorting for city vendor lists.
 * Supports URL parameter ?activity=slug to pre-filter by activity type.
 */
(function () {
  const filterBar = document.querySelector('.filter-bar');
  if (!filterBar) return;

  const vendorCards = Array.from(document.querySelectorAll('.vendor-list .vendor-card'));
  const sortSelect = filterBar.querySelector('#sort-select');
  const catSelect = filterBar.querySelector('#cat-filter');
  const countDisplay = filterBar.querySelector('.filter-count');

  function getCardData(card) {
    return {
      el: card,
      name: (card.querySelector('h3 a') || card.querySelector('h3')).textContent.trim(),
      rating: parseFloat(card.dataset.rating || '0'),
      reviews: parseInt(card.dataset.reviews || '0', 10),
      price: parseInt(card.dataset.priceMin || '0', 10),
      categories: (card.dataset.categories || '').split('|').filter(Boolean),
      activityTypes: (card.dataset.activityTypes || '').split('|').filter(Boolean),
    };
  }

  const cards = vendorCards.map(getCardData);
  const container = vendorCards[0] ? vendorCards[0].parentElement : null;
  if (!container) return;

  // Check URL for ?activity= parameter
  const params = new URLSearchParams(window.location.search);
  const activityFilter = params.get('activity');

  // If we have an activity filter, show a notice banner
  if (activityFilter) {
    const prettyName = activityFilter.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const banner = document.createElement('div');
    banner.className = 'filter-notice';
    banner.innerHTML = 'Filtered to: <strong>' + prettyName + '</strong> &nbsp; <a href="' + window.location.pathname + '" class="clear-filter">Show all activities</a>';
    filterBar.parentElement.insertBefore(banner, filterBar);
  }

  function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function applyFilters() {
    const sortBy = sortSelect ? sortSelect.value : 'relevance';
    const catFilter = catSelect ? catSelect.value : '';

    var filtered = cards;

    // Filter by activity type from URL
    if (activityFilter) {
      filtered = filtered.filter(function(c) {
        return c.activityTypes.some(function(t) { return slugify(t) === activityFilter; });
      });
    }

    // Filter by category dropdown
    if (catFilter) {
      filtered = filtered.filter(function(c) { return c.categories.includes(catFilter); });
    }

    // Sort
    var sorted = filtered.slice();
    switch (sortBy) {
      case 'rating':
        sorted.sort(function(a, b) { return (b.rating - a.rating) || (b.reviews - a.reviews); });
        break;
      case 'reviews':
        sorted.sort(function(a, b) { return b.reviews - a.reviews; });
        break;
      case 'price-low':
        sorted.sort(function(a, b) { return (a.price || 9999) - (b.price || 9999); });
        break;
      case 'price-high':
        sorted.sort(function(a, b) { return (b.price || 0) - (a.price || 0); });
        break;
      case 'name':
        sorted.sort(function(a, b) { return a.name.localeCompare(b.name); });
        break;
      default: // relevance: weighted score
        sorted.sort(function(a, b) { return (b.rating * Math.log(b.reviews + 1)) - (a.rating * Math.log(a.reviews + 1)); });
    }

    // Hide all, then show filtered in order
    cards.forEach(function(c) { c.el.style.display = 'none'; });
    sorted.forEach(function(c) {
      c.el.style.display = '';
      container.appendChild(c.el);
    });

    if (countDisplay) {
      countDisplay.textContent = sorted.length + ' of ' + cards.length + ' shown';
    }
  }

  if (sortSelect) sortSelect.addEventListener('change', applyFilters);
  if (catSelect) catSelect.addEventListener('change', applyFilters);

  // Apply on page load (important for URL param filtering)
  applyFilters();
})();
