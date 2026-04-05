/**
 * Client-side city search for the homepage.
 * Filters city cards and shows a "no results" message.
 */
(function () {
    const input = document.getElementById('city-search');
    if (!input) return;

    const grid = document.querySelector('.cities-grid .grid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.city-card'));

    // Create "no results" element
    var noResults = document.createElement('p');
    noResults.textContent = 'No cities match your search. Try a different name or state abbreviation.';
    noResults.style.cssText = 'color:#6b7280;text-align:center;padding:2rem 1.5rem;grid-column:1/-1;display:none;';
    grid.appendChild(noResults);

    input.addEventListener('input', function () {
        var q = this.value.toLowerCase().trim();
        var visibleCount = 0;

        cards.forEach(function (card) {
            var text = card.textContent.toLowerCase();
            var show = !q || text.includes(q);
            card.style.display = show ? '' : 'none';
            if (show) visibleCount++;
        });

        noResults.style.display = (q && visibleCount === 0) ? '' : 'none';
    });

    // Support clearing via Escape key
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            this.value = '';
            this.dispatchEvent(new Event('input'));
            this.blur();
        }
    });
})();
