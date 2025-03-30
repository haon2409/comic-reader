// Global variables
let currentSlug = '';
let currentChapterId = '';
let chapters = [];
let currentChapterIndex = -1;

// DOM elements
const mangaTitle = document.getElementById('manga-title');
const slugDisplay = document.getElementById('slug-display');
const chapterIdDisplay = document.getElementById('chapter-id-display');
const mangaContent = document.getElementById('manga-content');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const prevChapterBtn = document.getElementById('prev-chapter');
const nextChapterBtn = document.getElementById('next-chapter');
const chapterList = document.getElementById('chapter-list');

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Parse URL parameters
    parseUrlParameters();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load manga content if parameters are present
    if (currentSlug && currentChapterId) {
        loadMangaContent(currentSlug, currentChapterId);
    } else {
        showEmptyState();
    }
});

// Parse URL parameters to extract slug and chapter_id
function parseUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    currentSlug = urlParams.get('slug') || '';
    currentChapterId = urlParams.get('chapter_id') || '';
    
    // Update the display with the extracted parameters
    slugDisplay.textContent = currentSlug || 'Not provided';
    chapterIdDisplay.textContent = currentChapterId || 'Not provided';
    
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
    
    // Reading mode toggle removed
    
    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        // Left arrow key for previous chapter
        if (e.key === 'ArrowLeft' && !prevChapterBtn.disabled) {
            prevChapterBtn.click();
        }
        
        // Right arrow key for next chapter
        if (e.key === 'ArrowRight' && !nextChapterBtn.disabled) {
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
        // Use the actual API endpoint for manga information
        const apiUrl = `https://otruyenapi.com/v1/api/truyen-tranh/${slug}`;
        
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
        const chaptersData = data.data.item.chapters[0].server_data || [];
        
        // Transform the chapter data into our format
        chapters = chaptersData.map(chapter => {
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
    // Clear previous content
    mangaContent.innerHTML = '';
    
    if (pages && pages.length > 0) {
        // Show chapter information at the top if available
        if (currentChapterIndex !== -1 && chapters[currentChapterIndex]) {
            const chapter = chapters[currentChapterIndex];
            const chapterInfoDiv = document.createElement('div');
            chapterInfoDiv.className = 'chapter-info mb-4 p-3 bg-dark rounded';
            chapterInfoDiv.innerHTML = `
                <h3>Chapter ${chapter.number}</h3>
                ${chapter.filename ? `<p class="text-muted">${chapter.filename}</p>` : ''}
                <p class="text-info">Viewing page <span id="current-page">1</span> of ${pages.length}</p>
            `;
            mangaContent.appendChild(chapterInfoDiv);
        }
        
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
            
            // Update current page indicator when scrolling
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        document.getElementById('current-page').textContent = index + 1;
                    }
                });
            }, { threshold: 0.5 });
            
            observer.observe(pageElement);
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
    } else {
        const listItem = document.createElement('li');
        listItem.textContent = 'No chapters available';
        chapterList.appendChild(listItem);
    }
}

// Navigate to a different chapter
function navigateToChapter(chapterId) {
    console.log("Navigating to chapter with ID:", chapterId);
    if (chapterId !== currentChapterId) {
        // Ensure we are on the /read route
        const url = new URL(window.location.href);
        const pathname = url.pathname;
        
        // If not already on /read, change the pathname
        if (!pathname.includes('/read')) {
            url.pathname = '/read';
        }
        
        // Update the chapter_id param
        url.searchParams.set('chapter_id', chapterId);
        
        // Update the browser history and URL
        window.history.pushState({}, '', url.toString());
        
        // Update the current chapter id
        currentChapterId = chapterId;
        if (chapterIdDisplay) {
            chapterIdDisplay.textContent = currentChapterId;
        }
        
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
        const prevChapter = chapters[currentChapterIndex - 1];
        prevChapterBtn.innerHTML = `<i class="fas fa-arrow-left me-2"></i>Chapter ${prevChapter.number}`;
    } else {
        prevChapterBtn.disabled = true;
        prevChapterBtn.innerHTML = `<i class="fas fa-arrow-left me-2"></i>Previous Chapter`;
    }
    
    if (currentChapterIndex < chapters.length - 1 && currentChapterIndex !== -1) {
        nextChapterBtn.disabled = false;
        const nextChapter = chapters[currentChapterIndex + 1];
        nextChapterBtn.innerHTML = `Chapter ${nextChapter.number}<i class="fas fa-arrow-right ms-2"></i>`;
    } else {
        nextChapterBtn.disabled = true;
        nextChapterBtn.innerHTML = `Next Chapter<i class="fas fa-arrow-right ms-2"></i>`;
    }
    
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
    mangaContent.style.display = 'block';
    mangaContent.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-book"></i>
            <h3>Nothing to Display</h3>
            <p>${message}</p>
            <p>Use a URL with slug and chapter_id parameters to view manga content.</p>
            <p>Example: /read?slug=manga-title&chapter_id=12345</p>
        </div>
    `;
}
