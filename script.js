// Global variables
let currentSlug = '';
let currentChapterId = '';
let chapters = [];
let currentChapterIndex = -1;
let isVerticalNav = true; // Default to vertical navigation (for desktop/landscape)
let readChapters = []; // Array to store IDs of chapters that have been read

// DOM elements
const mangaTitle = document.getElementById('manga-title');
const mangaContent = document.getElementById('manga-content');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const prevChapterBtn = document.getElementById('prev-chapter');
const nextChapterBtn = document.getElementById('next-chapter');
const chapterList = document.getElementById('chapter-list');
const toggleNavPositionBtn = document.getElementById('toggle-nav-position');
const chapterNavigation = document.getElementById('chapter-navigation');

// Initialize the application when the DOM is fully loaded
// Get base path for the application
function getBasePath() {
    const path = window.location.pathname;
    const segments = path.split('/').filter(segment => segment.length > 0);
    
    // Check if we're on GitHub Pages with /comic-reader/
    if (segments[0] === 'comic-reader') {
        return '/comic-reader/';
    }
    
    return '/';
}

document.addEventListener('DOMContentLoaded', function() {
    // Set correct base path for navbar-brand
    const navbarBrand = document.querySelector('.navbar-brand');
    if (navbarBrand) {
        navbarBrand.href = getBasePath();
    }
    
    // Parse URL parameters
    parseUrlParameters();
    
    // Setup search form
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const keyword = document.getElementById('search-input').value.trim();
            if (keyword) {
                handleSearchResults(keyword);
            }
        });
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Load read history from localStorage
    loadReadHistory();
    
    // Load manga content if parameters are present
    if (currentSlug && currentChapterId) {
        loadMangaContent(currentSlug, currentChapterId);
    } else if (currentSlug) {
        // If we have slug but no chapter_id, fetch manga info to get the latest chapter
        loadLatestChapter(currentSlug);
    } else {
        showEmptyState();
    }
});

// Parse URL parameters to extract slug and chapter_id
function parseUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    currentSlug = urlParams.get('slug') || '';
    currentChapterId = urlParams.get('chapter_id') || '';
    
    // Update title if slug is available
    if (currentSlug) {
        const formattedSlug = currentSlug.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        
        mangaTitle.textContent = formattedSlug;
    }
}

// Set up event listeners for interactive elements
function setupEventListeners() {
    // Previous chapter button
    prevChapterBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (currentChapterIndex > 0) {
            const prevChapterId = chapters[currentChapterIndex - 1].id;
            console.log("Navigating to previous chapter: " + prevChapterId);
            navigateToChapter(prevChapterId);
        } else {
            console.log("No previous chapter available");
        }
    });
    
    // Next chapter button
    nextChapterBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (currentChapterIndex < chapters.length - 1 && currentChapterIndex !== -1) {
            const nextChapterId = chapters[currentChapterIndex + 1].id;
            console.log("Navigating to next chapter: " + nextChapterId);
            navigateToChapter(nextChapterId);
        } else {
            console.log("No next chapter available");
        }
    });
    
    // Toggle navigation position button
    toggleNavPositionBtn.addEventListener('click', function(e) {
        e.preventDefault();
        toggleNavPosition();
    });
    
    // Load nav position from localStorage
    loadNavPositionFromStorage();
    
    // Keyboard navigation - Enhanced with more key options
    document.addEventListener('keydown', function(e) {
        // Previous chapter: Left arrow key or 'p' key 
        if ((e.key === 'ArrowLeft' || e.key.toLowerCase() === 'p') && !prevChapterBtn.disabled) {
            prevChapterBtn.click();
        }
        
        // Next chapter: Right arrow key or 'n' key
        if ((e.key === 'ArrowRight' || e.key.toLowerCase() === 'n') && !nextChapterBtn.disabled) {
            nextChapterBtn.click();
        }
    });
    
    // Log navigation button state whenever updated
    const observeNavButtons = new MutationObserver(mutations => {
        console.log("Navigation buttons updated: Previous disabled:", prevChapterBtn.disabled, "Next disabled:", nextChapterBtn.disabled);
    });
    
    observeNavButtons.observe(prevChapterBtn, { attributes: true, attributeFilter: ['disabled'] });
    observeNavButtons.observe(nextChapterBtn, { attributes: true, attributeFilter: ['disabled'] });
}

// Load manga content from API
async function loadMangaContent(slug, chapterId) {
    try {
        // Show loading indicator
        loading.style.display = 'block';
        mangaContent.style.display = 'none';
        errorMessage.style.display = 'none';
        
        // Fetch manga information first
        await fetchMangaInfo(slug);
        
        // Fetch chapter content
        await fetchChapterContent(slug, chapterId);
        
        // Update navigation buttons
        updateNavigation();
        
    } catch (error) {
        console.error('Error loading manga content:', error);
        showErrorMessage(error.message || 'Unable to load manga content. Please try again later.');
    } finally {
        // Hide loading indicator
        loading.style.display = 'none';
    }
}

// Fetch manga information (title, chapters list, etc.)
async function fetchMangaInfo(slug) {
    try {
        if (!slug) {
            throw new Error('Manga slug is missing');
        }

        // Use the actual API endpoint for manga information
        const apiUrl = `https://otruyenapi.com/v1/api/truyen-tranh/${encodeURIComponent(slug)}`;
        
        console.log(`Fetching manga info from: ${apiUrl}`);
        
        // Fetch the manga data with headers to help with API access
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check if data is valid and has expected structure
        if (!data || !data.data || !data.data.item || !data.data.item.chapters) {
            throw new Error('Invalid API response structure');
        }
        
        // Update manga title if available
        if (data.data.item.name) {
            mangaTitle.textContent = data.data.item.name;
        }
        
        // Extract chapters from the API response
        if (!data?.data?.item?.chapters?.[0]?.server_data) {
            throw new Error('Invalid chapter data structure');
        }

        const chaptersData = data.data.item.chapters[0].server_data;
        
        // Transform the chapter data into our format
        chapters = chaptersData.map(chapter => {
            if (!chapter) return null;
            // Extract chapter_id from chapter_api_data
            const chapterApiUrl = chapter.chapter_api_data;
            const chapterId = chapterApiUrl.split('/').pop();
            
            return {
                id: chapterId,
                number: parseInt(chapter.chapter_name) || 0,
                title: chapter.chapter_title || '',
                filename: chapter.filename || ''
            };
        });
        
        // Sort chapters in ascending order (chapter 1, 2, 3...)
        chapters.sort((a, b) => a.number - b.number);
        
        // Find the current chapter index
        currentChapterIndex = chapters.findIndex(chapter => chapter.id === currentChapterId);
        console.log(`Current chapter index: ${currentChapterIndex} for chapter ID: ${currentChapterId}`);
        
        // Populate chapter dropdown
        populateChapterDropdown();
        
    } catch (error) {
        console.error('Error fetching manga info:', error);
        throw new Error('Failed to fetch manga information: ' + error.message);
    }
}

// Fetch chapter content (pages/images)
async function fetchChapterContent(slug, chapterId) {
    try {
        // Use the actual API endpoint for chapter content
        const apiUrl = `https://sv1.otruyencdn.com/v1/api/chapter/${chapterId}`;
        
        console.log(`Fetching chapter content from: ${apiUrl}`);
        
        // Fetch the chapter data with headers to help with API access
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Chapter API response:', data);
        
        // Check if data is valid and has expected structure
        if (!data || data.status !== 'success' || !data.data) {
            throw new Error('Invalid API response structure');
        }
        
        // Xử lý cấu trúc API mới
        const domainCdn = data.data.domain_cdn || '';
        const chapterPath = data.data.item?.chapter_path || '';
        const chapterImages = data.data.item?.chapter_image || [];
        
        if (!chapterImages.length) {
            throw new Error('No images found in this chapter');
        }
        
        // Tạo URLs của các trang theo format: domain_cdn + chapter_path + image_file
        const pages = chapterImages.map((image, index) => {
            const imageFile = image.image_file || '';
            const fullUrl = `${domainCdn}/${chapterPath}/${imageFile}`;
            
            return {
                id: index + 1,
                url: fullUrl,
                filename: imageFile
            };
        });
        
        console.log(`Loaded ${pages.length} pages for chapter`);
        
        // Display the manga pages
        displayMangaPages(pages);
        
        // Update page title with chapter information
        if (currentChapterIndex !== -1 && chapters[currentChapterIndex]) {
            const chapter = chapters[currentChapterIndex];
            document.title = `Chapter ${chapter.number} - ${mangaTitle.textContent}`;
        }
        
    } catch (error) {
        console.error('Error fetching chapter content:', error);
        throw new Error('Failed to fetch chapter content: ' + error.message);
    }
}

// Display manga pages in the content container
function displayMangaPages(pages) {
    if (!mangaContent) {
        console.error("Manga content container not found");
        return;
    }

    // Clear previous content
    mangaContent.innerHTML = '';
    
    if (Array.isArray(pages) && pages.length > 0) {
        // Removed chapter information display from top of page
        
        // Create container for pages
        const pagesContainer = document.createElement('div');
        pagesContainer.className = 'manga-pages-container';
        mangaContent.appendChild(pagesContainer);
        
        // Create elements for each page
        pages.forEach((page, index) => {
            const pageElement = document.createElement('div');
            pageElement.className = 'manga-page-container';
            pageElement.dataset.pageNumber = index + 1;
            
            // Create image element
            const img = document.createElement('img');
            img.src = page.url;
            img.alt = `Page ${page.id}`;
            img.className = 'manga-page';
            img.loading = 'lazy'; // Lazy load images for better performance
            
            // Add error handling for images
            img.onerror = function() {
                this.onerror = null;
                this.src = 'https://via.placeholder.com/800x1200/333333/FFFFFF?text=Image+Load+Error';
                console.error(`Failed to load image: ${page.url}`);
            };
            
            // Add page number indicator
            const pageNumber = document.createElement('div');
            pageNumber.className = 'page-number badge bg-secondary';
            pageNumber.textContent = `Page ${index + 1}`;
            
            // Add elements to container
            pageElement.appendChild(img);
            pageElement.appendChild(pageNumber);
            pagesContainer.appendChild(pageElement);
            
            // Removed page number update - not needed anymore
        });
        
        // Show the content container
        mangaContent.style.display = 'block';
        
        // Always in vertical mode (reading mode toggle removed)
        pagesContainer.classList.remove('horizontal-mode');
    } else {
        showEmptyState('No pages found for this chapter');
    }
}

// Populate the chapter dropdown menu
function populateChapterDropdown() {
    // Clear previous items
    chapterList.innerHTML = '';
    
    if (chapters && chapters.length > 0) {
        // Update the dropdown button text to show the currently selected chapter
        if (currentChapterIndex !== -1) {
            const currentChapter = chapters[currentChapterIndex];
            document.getElementById('chapterDropdown').textContent = `Chapter ${currentChapter.number}`;
        } else {
            document.getElementById('chapterDropdown').textContent = 'Chapter Selection';
        }
        
        // Add chapters to dropdown in reverse order (newest first)
        // Create a copy of the array for sorting to avoid affecting the original order
        const sortedChapters = [...chapters].reverse();
        
        sortedChapters.forEach(chapter => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.className = 'dropdown-item';
            link.href = '#';
            
            // Format chapter name with number and title if available
            let chapterText = `Chapter ${chapter.number}`;
            if (chapter.title && chapter.title.trim() !== '') {
                chapterText += `: ${chapter.title}`;
            }
            link.textContent = chapterText;
            
            // Mark chapter as read if in read history
            if (readChapters.includes(chapter.id)) {
                link.classList.add('read');
            }
            
            // Highlight the current chapter
            if (chapter.id === currentChapterId) {
                link.classList.add('active');
                link.innerHTML = `<i class="fas fa-bookmark me-2"></i>${chapterText}`;
            }
            
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navigateToChapter(chapter.id);
            });
            
            listItem.appendChild(link);
            chapterList.appendChild(listItem);
        });
        
        // Set dropdown position based on current navigation position
        updateDropdownPosition();
        
    } else {
        const listItem = document.createElement('li');
        listItem.textContent = 'No chapters available';
        chapterList.appendChild(listItem);
    }
}

// Navigate to a different chapter
function navigateToChapter(chapterId) {
    console.log("Navigating to chapter with ID:", chapterId);
    if (!chapterId) {
        console.error("Invalid chapter ID");
        showErrorMessage("Không thể chuyển chapter do thiếu ID");
        return;
    }
    if (chapterId !== currentChapterId) {
        // Update the URL with new chapter_id
        const url = new URL(window.location.href);
        
        // Update the chapter_id param
        url.searchParams.set('chapter_id', chapterId);
        
        // Update the browser history and URL
        window.history.pushState({}, '', url.toString());
        
        // Update the current chapter id
        currentChapterId = chapterId;
        
        // Load the new chapter content
        console.log(`Loading new chapter content for slug: ${currentSlug}, chapterId: ${currentChapterId}`);
        loadMangaContent(currentSlug, currentChapterId);
    } else {
        console.log("Already on this chapter, not navigating");
    }
}

// Update navigation button states and text based on current chapter
function updateNavigation() {
    if (currentChapterIndex > 0) {
        prevChapterBtn.disabled = false;
        prevChapterBtn.innerHTML = `<i class="fas fa-arrow-left"></i>`;
        prevChapterBtn.title = `Previous Chapter (${chapters[currentChapterIndex - 1].number})`;
    } else {
        prevChapterBtn.disabled = true;
        prevChapterBtn.innerHTML = `<i class="fas fa-arrow-left"></i>`;
        prevChapterBtn.title = `No Previous Chapter`;
    }
    
    if (currentChapterIndex < chapters.length - 1 && currentChapterIndex !== -1) {
        nextChapterBtn.disabled = false;
        nextChapterBtn.innerHTML = `<i class="fas fa-arrow-right"></i>`;
        nextChapterBtn.title = `Next Chapter (${chapters[currentChapterIndex + 1].number})`;
    } else {
        nextChapterBtn.disabled = true;
        nextChapterBtn.innerHTML = `<i class="fas fa-arrow-right"></i>`;
        nextChapterBtn.title = `No Next Chapter`;
    }
    
    // Save current chapter ID to read history
    saveReadChapter(currentChapterId);
    
    // Update page title
    if (currentChapterIndex !== -1 && chapters[currentChapterIndex]) {
        const chapter = chapters[currentChapterIndex];
        document.title = `Chapter ${chapter.number} - ${mangaTitle.textContent}`;
    } else {
        document.title = "Manga Reader";
    }
}

// Show error message
function showErrorMessage(message) {
    errorMessage.style.display = 'block';
    document.getElementById('error-text').textContent = message;
    mangaContent.style.display = 'none';
}

// Show empty state when no content is available
function showEmptyState(message = 'No manga content to display') {
    loading.style.display = 'none';
    mangaContent.style.display = 'block';
    mangaContent.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-book"></i>
            <h3>Welcome to Manga Reader</h3>
            <p>${message}</p>
            <p>Enter a valid manga URL to begin reading.</p>
            <p>Example: ?slug=one-piece&chapter_id=123456</p>
        </div>
    `;
}

// Toggle the navigation bar layout between vertical (desktop) and horizontal (mobile)
function toggleNavPosition() {
    // Toggle the navigation layout state
    isVerticalNav = !isVerticalNav;
    
    // Apply the appropriate classes based on current state
    applyNavPositionStyles();
    
    // Save to localStorage
    localStorage.setItem('isVerticalNav', isVerticalNav.toString());
    
    // Update the icon/tooltip to show current position
    updateNavPositionIcon();
    
    // Update dropdown menu position
    updateDropdownPosition();
}

// Load navigation position from localStorage
function loadNavPositionFromStorage() {
    const savedPosition = localStorage.getItem('isVerticalNav');
    
    if (savedPosition !== null) {
        isVerticalNav = savedPosition === 'true';
    }
    
    // Apply the saved position styles
    applyNavPositionStyles();
    
    // Update icon for current position
    updateNavPositionIcon();
    
    // Update dropdown menu position
    updateDropdownPosition();
}

// Apply the appropriate styles based on navigation mode
function applyNavPositionStyles() {
    // Remove responsive classes that are controlled by media queries
    chapterNavigation.classList.remove('nav-vertical', 'nav-horizontal');
    
    if (isVerticalNav) {
        // Force vertical layout regardless of screen size
        chapterNavigation.classList.add('nav-vertical');
    } else {
        // Force horizontal layout regardless of screen size
        chapterNavigation.classList.add('nav-horizontal');
    }
}

// Update the toggle button icon/tooltip to reflect current position
function updateNavPositionIcon() {
    // Update tooltip
    if (isVerticalNav) {
        toggleNavPositionBtn.title = 'Switch to horizontal layout';
        toggleNavPositionBtn.innerHTML = '<i class="fas fa-grip-horizontal"></i>';
    } else {
        toggleNavPositionBtn.title = 'Switch to vertical layout';
        toggleNavPositionBtn.innerHTML = '<i class="fas fa-grip-vertical"></i>';
    }
}

// Update dropdown position based on navigation bar position
function updateDropdownPosition() {
    const dropdownMenu = document.querySelector('.dropdown-menu');
    if (!dropdownMenu) return;
    
    // Remove any previously set positions
    dropdownMenu.classList.remove('dropdown-menu-end', 'dropdown-menu-start', 'dropdown-menu-up');
    
    if (isVerticalNav) {
        // If nav is vertical (on right side), show dropdown to the left
        dropdownMenu.classList.add('dropdown-menu-start');
    } else {
        // If nav is horizontal (at bottom), show dropdown above
        dropdownMenu.classList.add('dropdown-menu-up');
    }
}

// Load the read history from localStorage
function loadReadHistory() {
    const history = localStorage.getItem('readChapters');
    if (history) {
        try {
            readChapters = JSON.parse(history);
        } catch (error) {
            console.error('Error parsing read history:', error);
            readChapters = [];
        }
    }
}

// Save a chapter to read history
function saveReadChapter(chapterId) {
    if (!chapterId) return;
    
    // Add the chapter ID to read history if not already present
    if (!readChapters.includes(chapterId)) {
        readChapters.push(chapterId);
        // Save updated history to localStorage
        localStorage.setItem('readChapters', JSON.stringify(readChapters));
    }
}

// Load the latest chapter when no chapter_id is specified
async function loadLatestChapter(slug) {
    try {
        // Show loading indicator
        loading.style.display = 'block';
        mangaContent.style.display = 'none';
        errorMessage.style.display = 'none';
        
        // Fetch manga info to get the list of chapters
        await fetchMangaInfo(slug);
        
        // If chapters were loaded successfully
        if (chapters && chapters.length > 0) {
            // Use the latest chapter
            const latestChapter = chapters[chapters.length - 1];
            
            // Update the current chapter ID
            currentChapterId = latestChapter.id;
            
            // Update URL with the chapter ID
            const url = new URL(window.location.href);
            url.searchParams.set('chapter_id', currentChapterId);
            window.history.replaceState({}, '', url.toString());
            
            // Load the chapter content
            await fetchChapterContent(slug, currentChapterId);
            
            // Update navigation buttons
            updateNavigation();
        } else {
            throw new Error('No chapters found for this manga');
        }
    } catch (error) {
        console.error('Error loading latest chapter:', error);
        showErrorMessage(error.message || 'Unable to load manga content. Please try again later.');
    } finally {
        // Hide loading indicator
        loading.style.display = 'none';

}
}

// Handle search results
async function handleSearchResults(keyword) {
    if (!keyword || typeof keyword !== 'string') {
        mangaContent.innerHTML = '<div class="alert alert-info">Vui lòng nhập từ khóa tìm kiếm hợp lệ.</div>';
        return;
    }

    if (!mangaContent || !document.getElementById('chapter-navigation')) {
        console.error("Required DOM elements not found");
        return;
    }
    
    // Hide other elements during search
    document.getElementById('chapter-navigation').style.display = 'none';
    mangaTitle.textContent = `Kết quả tìm kiếm: "${keyword}"`;
    
    try {
        // Show loading spinner
        mangaContent.innerHTML = '<div class="text-center my-5"><div class="spinner-border"></div></div>';
        
        const response = await fetch(`https://otruyenapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success' && data.data && data.data.items && data.data.items.length > 0) {
            const resultsHtml = data.data.items.map(manga => {
                const thumbnail = manga.thumb_url ? 
                    `${data.data.APP_DOMAIN_CDN_IMAGE}/uploads/comics/${manga.thumb_url}` :
                    'https://via.placeholder.com/200x300?text=No+Image';
                const date = manga.updatedAt ? new Date(manga.updatedAt).toLocaleDateString() : 'N/A';
                const authors = Array.isArray(manga.author) ? manga.author.join(', ') : 'Unknown';
                const chapterCount = manga.chapters && Array.isArray(manga.chapters) ? manga.chapters.length : 0;
                
                return `
                    <div class="card mb-3 search-result" style="max-width: 800px; margin: auto;">
                        <div class="row g-0">
                            <div class="col-md-3">
                                <img src="${thumbnail}" class="img-fluid rounded-start" alt="${manga.name}" 
                                    style="height: 200px; object-fit: cover;"
                                    onerror="this.src='https://via.placeholder.com/200x300?text=Error+Loading+Image'">
                            </div>
                            <div class="col-md-9">
                                <div class="card-body">
                                    <h5 class="card-title">
                                        <a href="./?slug=${manga.slug}" class="text-decoration-none text-info">
                                            ${manga.name}
                                        </a>
                                    </h5>
                                    <p class="card-text">
                                        <small class="text-muted">Author: ${authors}</small><br>
                                        <small class="text-muted">Status: ${manga.status || 'Unknown'}</small><br>
                                        <small class="text-muted">Chapters: ${chapterCount}</small><br>
                                        <small class="text-muted">Updated: ${date}</small>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            mangaContent.innerHTML = `
                <div class="container">
                    ${resultsHtml}
                </div>
            `;
            loading.style.display = 'none';
        } else {
            mangaContent.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No results found for "${keyword}"
                </div>`;
            loading.style.display = 'none';
        }
    } catch (error) {
        console.error('Search error:', error);
        mangaContent.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error searching manga. Please try again later.
            </div>`;
    }
}