
let currentCategory = null;


// filterGamesBySearch đã bị loại bỏ vì chức năng tìm kiếm được xử lý bởi applyFilters()

function filterGames(criteria, searchTerm = '') {
    // Normalise the criteria to lower case for case-insensitive matching.
    const trimmedCriteria = (criteria || '').trim().toLowerCase();
    let filteredGames = games;

    // Handle the special "hot" category via the isHot flag.  We also
    // recognise "hot" regardless of case.
    if (trimmedCriteria === 'hot') {
        filteredGames = filteredGames.filter(game => game.isHot);
    } else if (trimmedCriteria && trimmedCriteria !== 'all' && trimmedCriteria !== 'tất cả') {
        // Match genres case-insensitively.  Some genres in the data may
        // include accents or mixed case; convert both sides to lower case.
        filteredGames = filteredGames.filter(game => {
            if (!Array.isArray(game.genres)) return false;
            return game.genres.some(g => (g || '').toLowerCase() === trimmedCriteria);
        });
    }

    // Apply the search term (case-insensitive) to the game name.
    if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        filteredGames = filteredGames.filter(game => {
            return game.name && game.name.toLowerCase().includes(lowerSearch);
        });
    }

    // Always apply the price range when the range inputs exist.  The old
    // toggle-based price filter has been removed.  If the inputs are
    // present, filter the list according to the current values.  If
    // not (e.g. on other categories), this block is skipped.
    const minPriceInput = document.getElementById('minPriceRange');
    const maxPriceInput = document.getElementById('maxPriceRange');
    if (minPriceInput && maxPriceInput) {
        const minPrice = parseInt(minPriceInput.value, 10);
        const maxPrice = parseInt(maxPriceInput.value, 10);
        filteredGames = filteredGames.filter(game => {
            const price = parsePrice(game.price);
            return price >= minPrice && price <= maxPrice;
        });
    }
    displayGames(filteredGames, 'gameList');
    updateActiveButton(trimmedCriteria);
}

function displayGames(items, listId) {
    const listElement = document.getElementById(listId);
    listElement.innerHTML = '';
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = listId === 'gameList' ? 'game-card' : 'service-card';

        // Build a truncated list of genres for game cards.  Show only
        // the first three genres to avoid overcrowding and append "..."
        // when there are more.  The prefix "Thể loại :" matches the
        // requested format.  For service cards we reuse the full list.
        let genreHtml = '';
            if (item.genres && item.genres.length > 0) {
            // Ẩn 2 tag account chỉ ở màn hiển thị
            const HIDDEN_ACCOUNT_TAGS = new Set(['account offline', 'account online']);
            const displayGenres = item.genres.filter(g =>
                !HIDDEN_ACCOUNT_TAGS.has(String(g || '').trim().toLowerCase())
            );

            if (displayGenres.length > 0) {
                if (listId === 'gameList') {
                const firstThree = displayGenres.slice(0, 3);
                let genreText = `Thể loại : ${firstThree.join(', ')}`;
                if (displayGenres.length > 3) genreText += ', ...';
                genreHtml = `<p class="genres">${genreText}</p>`;
                } else {
                // nếu bạn cũng dùng displayGames cho Netflix/YouTube/Spotify
                genreHtml = `<p class="genres">${displayGenres.join(', ')}</p>`;
                }
            }
            }

        // Optional long description and short description.  Per the
        // requirements we do not display these fields for game cards
        // (Steam products).  For service cards we continue to show
        // the description if provided.
        let descriptionHtml = '';
        let shortDescHtml = '';
        if (listId !== 'gameList') {
            if (item.description) {
                descriptionHtml = `<p class="description">${item.description}</p>`;
            }
            if (item.shortDescription) {
                shortDescHtml = `<p class="short-description">${item.shortDescription}</p>`;
            }
        }

        let formattedPrice = '';
        if (item.price) {
            const priceValue = parsePrice(item.price);
            formattedPrice = `${priceValue.toLocaleString('vi-VN')} <span class="currency">₫</span>`;
        }
        // Build a safe alt attribute by removing any HTML tags (e.g. <br>) from
        // the name. Without sanitising, the alt text could contain raw
        // markup which is not desirable for accessibility tools.
        const safeAlt = item.name && typeof item.name === 'string'
            ? item.name.replace(/<br\s*\/?\>/gi, ' ').trim()
            : '';
        card.innerHTML = `
            <img
                src="${item.image}"
                alt="${safeAlt}"
                width="280"
                height="180"
                loading="lazy"
                onerror="this.src='placeholder_light_gray_block.png'"
            >
            <div class="content">
                <h3>${item.name}</h3>
                ${genreHtml}
                ${shortDescHtml}
                ${descriptionHtml}
                <p class="price">${formattedPrice}</p>
            </div>
        `;
        listElement.appendChild(card);
    });
}

function parsePrice(priceStr) {
    try {
        if (!priceStr || typeof priceStr !== 'string') {
            
            return 0;
        }
        const cleanedPrice = priceStr.replace(/\./g, '');
        const price = parseInt(cleanedPrice, 10);
        if (isNaN(price)) {
            
            return 0;
        }
        return price;
    } catch (e) {
        // If parsing fails, treat the price as zero.  We do not log the
        // error to the console to avoid cluttering production output.
        return 0;
    }
}

/**
 * Apply all active filters for the Steam category.  This function reads
 * the search term, selected account types, selected genres (including
 * the special "hot" flag), and the price range if enabled.  It then
 * filters the global `games` array accordingly and renders the
 * resulting list.  When not viewing the Steam category, this
 * function does nothing.
 */
function applyFilters() {
    // Only apply filters when the Steam category is selected
    if (currentCategory !== 'steam') return;

    let filtered = games;

    // Read the search term (case-insensitive)
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (searchTerm) {
        filtered = filtered.filter(game => game.name && game.name.toLowerCase().includes(searchTerm));
    }

    // Account type filters (Account OFFLINE / Account ONLINE)
    const accountCheckboxes = document.querySelectorAll('.account-filter:checked');
    // Normalise the selected account types to lower case for case‑insensitive matching
    const selectedAccounts = Array.from(accountCheckboxes).map(cb => cb.value.toLowerCase());
    if (selectedAccounts.length > 0) {
        filtered = filtered.filter(game => {
            if (!Array.isArray(game.genres)) return false;
            // Game must include at least one of the selected account types
            return selectedAccounts.some(acc =>
                game.genres.some(g => (g || '').toLowerCase() === acc)
            );
        });
    }

    // Genre filters (including special "hot" flag)
    const genreCheckboxes = document.querySelectorAll('.genre-filter:checked');
    // Normalize all selected genre values to lower case
    const selectedGenres = Array.from(genreCheckboxes).map(cb => cb.value.toLowerCase());
    // Check if the "Game Hot" filter is selected. In our data this is
    // represented by the boolean `isHot` rather than in the genres array.
    const isHotSelected = selectedGenres.includes('hot');
    if (isHotSelected) {
        filtered = filtered.filter(game => game.isHot === true);
    }
    // Remove 'hot' from the list to handle other genres separately
    const otherGenres = selectedGenres.filter(g => g !== 'hot');
    if (otherGenres.length > 0) {
        filtered = filtered.filter(game => {
            if (!Array.isArray(game.genres)) return false;
            const gameGenresLower = game.genres.map(g => (g || '').toLowerCase());
            // Game must include **all** selected genres (AND logic)
            return otherGenres.every(sel => gameGenresLower.includes(sel));
        });
    }

    // Price filtering
    // The redesigned price filter always applies the selected range.  When
    // the range inputs exist (only in the Steam section), filter games
    // accordingly.  Without these elements (e.g. on other categories), this
    // block is skipped.
    const minPriceInput = document.getElementById('minPriceRange');
    const maxPriceInput = document.getElementById('maxPriceRange');
    if (minPriceInput && maxPriceInput) {
        const minPrice = parseInt(minPriceInput.value, 10);
        const maxPrice = parseInt(maxPriceInput.value, 10);
        filtered = filtered.filter(game => {
            const price = parsePrice(game.price);
            return price >= minPrice && price <= maxPrice;
        });
    }

    // Render the filtered list
    displayGames(filtered, 'gameList');
}

function updateActiveButton(criteria) {
    
    document.querySelectorAll('.filters .filter-buttons button').forEach(button => {
        button.classList.remove('active');
    });
   
    document.querySelectorAll('.dropdown-content button').forEach(button => {
        button.classList.remove('active');
    });
   
    const activeButton = document.querySelector(`.filters .filter-buttons button[data-filter="${criteria}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    } else {
        
        const dropdownButton = document.querySelector(`.dropdown-content button[data-filter="${criteria}"]`);
        if (dropdownButton) {
            dropdownButton.classList.add('active');
        }
    }
}

function showPopup() {
    const popupOverlay = document.getElementById('popupOverlay');
    const popupContent = popupOverlay.querySelector('.popup-content');
    popupOverlay.style.display = 'flex';
    popupContent.classList.remove('hide');
    popupContent.classList.add('show');
    document.getElementById('popupMessage').innerHTML = 'Cần giá game khác - mua hãy IB facebook hoặc discord';
}

function closePopup() {
    const popupOverlay = document.getElementById('popupOverlay');
    const popupContent = popupOverlay.querySelector('.popup-content');
    popupContent.classList.remove('show');
    popupContent.classList.add('hide');
    popupContent.addEventListener('animationend', function handler() {
        popupOverlay.style.display = 'none';
        popupContent.classList.remove('hide');
        popupContent.removeEventListener('animationend', handler);
    }, { once: true });
}


window.addEventListener('load', showPopup);

// bỏ hàm togglePriceFilter vì bộ lọc giá luôn hiển thị

function updatePriceRange() {
    const minPriceInput = document.getElementById('minPriceRange');
    const maxPriceInput = document.getElementById('maxPriceRange');
    let minPrice = parseInt(minPriceInput.value, 10);
    let maxPrice = parseInt(maxPriceInput.value, 10);

    // Ensure sliders do not cross: swap values if necessary
    if (minPrice > maxPrice) {
        [minPrice, maxPrice] = [maxPrice, minPrice];
        minPriceInput.value = minPrice;
        maxPriceInput.value = maxPrice;
    }

    // Update the visible range display using the redesigned spans.  If
    // those elements exist they will reflect the current values.
    const minDisplay = document.getElementById('minPriceDisplay');
    const maxDisplay = document.getElementById('maxPriceDisplay');
    if (minDisplay) minDisplay.textContent = `${minPrice.toLocaleString('vi-VN')} đ`;
    if (maxDisplay) maxDisplay.textContent = `${maxPrice.toLocaleString('vi-VN')} đ`;
    // Do not call applyFilters() automatically.  The user must press
    // the Filter button to apply the selected range.
}


// On initial load we do not immediately populate the game list.  Instead
// the hero section is shown and the user must choose a category to view
// products.  The hero is initialised in the DOMContentLoaded handler below.

// The original design included a dropdown for extra filter buttons.
// Because the dropdown is no longer present in the updated layout,
// wrap the event handlers in existence checks. This prevents
// errors when the elements are not found.
const dropdownButton = document.querySelector('.dropdown-button');
if (dropdownButton) {
    dropdownButton.addEventListener('click', function (event) {
        event.stopPropagation();
        const dropdown = this.closest('.dropdown');
        dropdown.classList.toggle('active');
    });
    document.addEventListener('click', function (event) {
        const dropdown = document.querySelector('.dropdown');
        if (dropdown && !dropdown.contains(event.target)) {
            dropdown.classList.remove('active');
        }
    });
    const dropdownItems = document.querySelectorAll('.dropdown-content button');
    dropdownItems.forEach(btn => {
        btn.addEventListener('click', () => {
            const criteria = btn.textContent;
            filterGames(criteria);
            document.querySelector('.dropdown').classList.remove('active');
        });
    });
}
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}


// Handle scroll effects for the scroll‑to‑top button and the sticky
// navigation bar.  The navbar gains the `shrink` class once the
// user scrolls away from the very top of the page, causing it to
// compress via CSS.  When the user returns to the top, the class is
// removed so the bar expands again.  The scroll‑to‑top button
// continues to appear when the scroll position exceeds 300px.
window.addEventListener('scroll', () => {
    const scrollToTopButton = document.getElementById('scrollToTop');
    if (scrollToTopButton) {
        if (window.scrollY > 300) {
            scrollToTopButton.classList.add('show');
        } else {
            scrollToTopButton.classList.remove('show');
        }
    }
    // Toggle shrink class on the navbar based on scroll position
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        if (window.scrollY > 0) {
            navbar.classList.add('shrink');
        } else {
            navbar.classList.remove('shrink');
        }
    }
});

document.querySelectorAll('.nav-button').forEach(button => {
    button.addEventListener('click', function () {
        const selected = this.dataset.category;

        // Remove active from all, then set active correctly
        document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));

        if (selected === 'home') {
            currentCategory = null;
            // Set Home active
            this.classList.add('active');
            // Hide lists/filters
            const gameFilters = document.getElementById('gameFilters');
            const gameList = document.getElementById('gameList');
            const netflixList = document.getElementById('netflixList');
            const youtubeList = document.getElementById('youtubeList');
            const spotifyList = document.getElementById('spotifyList');
            const updatingMessage = document.querySelector('.updating-message');
            gameFilters.classList.add('hidden');
            gameList.classList.add('hidden');
            netflixList.classList.add('hidden');
            youtubeList.classList.add('hidden');
            spotifyList.classList.add('hidden');
            updatingMessage.style.display = 'none';
            // Show hero
            showHero();
            // Hide mobile search/filter controls and close drawers on mobile
            const mobileControls = document.getElementById('mobileControls');
            const filtersDrawer = document.getElementById('gameFilters');
            const filterOverlay = document.getElementById('filterOverlay');
            if (mobileControls) {
                mobileControls.style.display = 'none';
            }
            if (filtersDrawer && filterOverlay) {
                filtersDrawer.classList.remove('open');
                filterOverlay.classList.remove('active');
            }
            return;
        }

        // Category flow
        currentCategory = selected;
        // Set active on clicked category
        this.classList.add('active');

        // Hide hero and show relevant lists
        hideHero();

        const gameFilters = document.getElementById('gameFilters');
        const gameList = document.getElementById('gameList');
        const netflixList = document.getElementById('netflixList');
        const youtubeList = document.getElementById('youtubeList');
        const spotifyList = document.getElementById('spotifyList');
        const updatingMessage = document.querySelector('.updating-message'); 

        // Hide all first
        gameList.classList.add('hidden');
        netflixList.classList.add('hidden');
        youtubeList.classList.add('hidden');
        spotifyList.classList.add('hidden');
        updatingMessage.style.display = 'none'; 
        gameFilters.classList.add('hidden');

        const contentGrid = document.querySelector('.content-grid');
        if (currentCategory === 'steam') {
            // Show filters and switch the grid to two columns
            gameFilters.classList.remove('hidden');
            gameList.classList.remove('hidden');
            // Add modifier class so that the first column appears
            if (contentGrid) contentGrid.classList.add('with-filters');
            // Apply all filters to show the games
            applyFilters();
        } else if (currentCategory === 'netflix') {
            // Hide filters and switch to single column grid
            gameFilters.classList.add('hidden');
            if (contentGrid) contentGrid.classList.remove('with-filters');
            netflixList.classList.remove('hidden');
            displayGames(netflixProducts, 'netflixList');
        } else if (currentCategory === 'youtube') {
            gameFilters.classList.add('hidden');
            if (contentGrid) contentGrid.classList.remove('with-filters');
            youtubeList.classList.remove('hidden');
            displayGames(youtubeProducts, 'youtubeList');
        } else if (currentCategory === 'spotify') {
            gameFilters.classList.add('hidden');
            if (contentGrid) contentGrid.classList.remove('with-filters');
            spotifyList.classList.remove('hidden');
            displayGames(spotifyProducts, 'spotifyList');
        }

        if (currentCategory !== 'steam' && document.getElementById(`${currentCategory}List`).children.length === 0) {
            updatingMessage.style.display = 'flex';
        }

        // ------------------------------------------------------------------
        // Mobile UI controls
        // When switching categories on small screens, show the search/filter
        // bar only for the Steam category and reset the filter drawer.
        const mobileControls = document.getElementById('mobileControls');
        const filtersDrawer = document.getElementById('gameFilters');
        const filterOverlayEl = document.getElementById('filterOverlay');
        if (mobileControls) {
            if (currentCategory === 'steam') {
                mobileControls.style.display = 'flex';
            } else {
                mobileControls.style.display = 'none';
                if (filtersDrawer && filterOverlayEl) {
                    filtersDrawer.classList.remove('open');
                    filterOverlayEl.classList.remove('active');
                }
            }
        }
    });
});
// Clicking the logo returns the site to the hero (landing) state.  This
// resets the current category, hides all product lists and filters, and
// reveals the hero carousel.
document.querySelector('.logo-link').addEventListener('click', function(event) {
    // Prevent navigation if running from a file scheme (anchors may reload page)
    event.preventDefault();
    currentCategory = null;
    // Remove active class from all navigation buttons
    document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
    // Add active state to Home button when clicking logo
    document.querySelector('[data-category="home"]')?.classList.add('active');
    // Hide the product lists and filters
    const gameFilters = document.getElementById('gameFilters');
    const gameList = document.getElementById('gameList');
    const netflixList = document.getElementById('netflixList');
    const youtubeList = document.getElementById('youtubeList');
    const spotifyList = document.getElementById('spotifyList');
    const updatingMessage = document.querySelector('.updating-message');
    gameFilters.classList.add('hidden');
    gameList.classList.add('hidden');
    netflixList.classList.add('hidden');
    youtubeList.classList.add('hidden');
    spotifyList.classList.add('hidden');
    updatingMessage.style.display = 'none';
    // Show hero
    showHero();
    document.querySelector('[data-category="home"]')?.classList.add('active');
});

/**
 * Initialise the hero section by creating slides and mini cards.  The
 * featured slides are defined here; if you wish to customise which
 * titles appear in the carousel simply modify the `featuredSlides` array.
 */
function initHeroSection() {
    const heroSection = document.getElementById('heroSection');
    const slidesContainer = heroSection.querySelector('.slides');
    const verticalList = document.getElementById('verticalList');

    const featuredSlides = [
        { title: 'EA SPORTS FC™ 26',description: 'Tự do tạo lối chơi, dẫn dắt câu lạc bộ của bạn — hơn 20.000 cầu thủ, 750+ đội tuyển, trải nghiệm hoàn toàn mới. The club is yours.',image: 'images/hero5.png' },
        { title: 'Dying Light: The Beast',description: 'Hóa thân thành Kyle Crane — người một phần zombie, một phần người. Leo trên mái nhà, phá tan xác sống, quật ngã chính mình… và trở thành quái vật',   image: 'images/hero6.png' },
        { title: 'Little Nightmares III',description: 'Cơn ác mộng mới bắt đầu — cùng nhau thoát khỏi thế giới méo mó và đáng sợ trong Little Nightmares III',  image: 'images/hero7.png' },
        { title: 'Black Myth: Wukong',description: 'Phiêu lưu hành động thần thoại, hóa thân Tề Thiên Đại Thánh.',   image: 'images/hero4.png' }
    ];

    // Build the slide elements
    featuredSlides.forEach((slide, index) => {
        const slideEl = document.createElement('div');
        slideEl.className = 'slide';
        if (index === 0) slideEl.classList.add('active');
        slideEl.style.backgroundImage = `url('${slide.image}')`;
        // Build overlay content
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        const h2 = document.createElement('h2');
        h2.textContent = slide.title;
        const p = document.createElement('p');
        p.textContent = slide.description;
        overlay.appendChild(h2);
        overlay.appendChild(p);
        slideEl.appendChild(overlay);
        slidesContainer.appendChild(slideEl);
    });

    // Select the first six games to display as mini cards.  If fewer than
    // six games are available in the dataset this will adjust accordingly.
    const miniGames = games.slice(0, 6);
    miniGames.forEach(game => {
        const card = document.createElement('div');
        card.className = 'mini-card';
        const imgSrc = game.image ? game.image : 'placeholder_light_gray_block.png';

        const priceValue = parsePrice(game.price);
        const formatted = priceValue.toLocaleString('vi-VN') + ' ₫';
        card.innerHTML = `
            <img src="${imgSrc}" alt="${game.name}" onerror="this.src='placeholder_light_gray_block.png'">
            <div class="mini-info">
                <h4>${game.name}</h4>
                <p>${formatted}</p>
            </div>
        `;
        // Clicking a mini card shows its details in the popup.
        card.addEventListener('click', () => {
            const priceString = formatted;
            document.getElementById('popupMessage').innerText = `${game.name} - ${priceString}`;
            showPopup();
        });
        verticalList.appendChild(card);
    });

    // Set up slide navigation and automatic cycling
    let slideIndex = 0;
    const slides = slidesContainer.querySelectorAll('.slide');
    let slideTimer = setInterval(nextSlide, 6000);

    function showSlide(index) {
        slides.forEach((s, i) => {
            s.classList.toggle('active', i === index);
        });
    }

    function nextSlide() {
        slideIndex = (slideIndex + 1) % slides.length;
        showSlide(slideIndex);
    }

    function prevSlide() {
        slideIndex = (slideIndex - 1 + slides.length) % slides.length;
        showSlide(slideIndex);
    }

    function resetTimer() {
        clearInterval(slideTimer);
        slideTimer = setInterval(nextSlide, 6000);
    }

    heroSection.querySelector('.hero-next').addEventListener('click', () => {
        nextSlide();
        resetTimer();
    });
    heroSection.querySelector('.hero-prev').addEventListener('click', () => {
        prevSlide();
        resetTimer();
    });
}

/**
 * Show the hero section and hide the product/filter panels.  Used when
 * returning to the landing page.
 */
function showHero() {
    const heroSection = document.getElementById('heroSection');
    heroSection.style.display = 'block';
    heroSection.style.opacity = '1';
}

/**
 * Hide the hero section.  Called when a category is chosen.
 */
function hideHero() {
    const heroSection = document.getElementById('heroSection');
    heroSection.style.opacity = '0';
    // Delay setting display to none until after the opacity transition
    setTimeout(() => {
        heroSection.style.display = 'none';
    }, 500);
}

// Initialise the hero and set up the landing state when the DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    initHeroSection();
    // Hide all product lists and filters at startup
    const gameFilters = document.getElementById('gameFilters');
    const gameList = document.getElementById('gameList');
    const netflixList = document.getElementById('netflixList');
    const youtubeList = document.getElementById('youtubeList');
    const spotifyList = document.getElementById('spotifyList');
    const updatingMessage = document.querySelector('.updating-message');
    gameFilters.classList.add('hidden');
    gameList.classList.add('hidden');
    netflixList.classList.add('hidden');
    youtubeList.classList.add('hidden');
    spotifyList.classList.add('hidden');
    updatingMessage.style.display = 'none';
    // Ensure hero is visible
    showHero();
    document.querySelector('[data-category="home"]')?.classList.add('active');

    // ------------------------------------------------------------------
    // Mobile UI setup
    // Configure the hamburger toggle for the off‑canvas category drawer.
    const menuToggle = document.getElementById('menuToggle');
    const navButtonsEl = document.querySelector('.nav-buttons');
    const menuOverlayEl = document.getElementById('menuOverlay');
    if (menuToggle && navButtonsEl && menuOverlayEl) {
        menuToggle.addEventListener('click', () => {
            navButtonsEl.classList.toggle('open');
            menuOverlayEl.classList.toggle('active');
        });
        menuOverlayEl.addEventListener('click', () => {
            navButtonsEl.classList.remove('open');
            menuOverlayEl.classList.remove('active');
        });
        // Close the menu when any category button is tapped
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.addEventListener('click', () => {
                navButtonsEl.classList.remove('open');
                menuOverlayEl.classList.remove('active');
            });
        });
    }
    // Configure the filter drawer on mobile
    const filterToggleBtn = document.getElementById('filterToggle');
    const filtersDrawerEl = document.getElementById('gameFilters');
    const filterOverlayEl = document.getElementById('filterOverlay');
    if (filterToggleBtn && filtersDrawerEl && filterOverlayEl) {
        filterToggleBtn.addEventListener('click', () => {
            // Only allow opening the drawer when Steam category is active
            if (currentCategory === 'steam') {
                filtersDrawerEl.classList.toggle('open');
                filterOverlayEl.classList.toggle('active');
            }
        });
        filterOverlayEl.addEventListener('click', () => {
            filtersDrawerEl.classList.remove('open');
            filterOverlayEl.classList.remove('active');
        });
    }
    // Synchronise the mobile search input with the desktop search and filtering logic
    const mobileSearchInputEl = document.getElementById('mobileSearchInput');
    const desktopSearchInputEl = document.getElementById('searchInput');
    if (mobileSearchInputEl && desktopSearchInputEl) {
        mobileSearchInputEl.addEventListener('input', () => {
            desktopSearchInputEl.value = mobileSearchInputEl.value;
            // Only trigger filtering if we are in the Steam category
            if (currentCategory === 'steam') {
                applyFilters();
            }
        });
    }
});
