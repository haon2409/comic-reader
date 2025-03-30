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
const readingModeToggle = document.getElementById('reading-mode');

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
    prevChapterBtn.addEventListener('click', function() {
        if (currentChapterIndex > 0) {
            navigateToChapter(chapters[currentChapterIndex - 1].id);
        }
    });
    
    // Next chapter button
    nextChapterBtn.addEventListener('click', function() {
        if (currentChapterIndex < chapters.length - 1) {
            navigateToChapter(chapters[currentChapterIndex + 1].id);
        }
    });
    
    // Reading mode toggle
    readingModeToggle.addEventListener('change', function() {
        if (this.checked) {
            // Vertical reading mode
            mangaContent.classList.remove('horizontal-mode');
        } else {
            // Horizontal reading mode
            mangaContent.classList.add('horizontal-mode');
        }
    });
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
        
        // Then fetch chapter content
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
        // This is a placeholder for the actual API endpoint
        // In a real application, you would use the actual API endpoint
        const apiUrl = `https://api.example.com/manga/${slug}`;
        
        // For this static demo, we'll simulate that chapter information is fetched
        // In a real app, you would replace this with an actual fetch call
        console.log(`Fetching manga info from: ${apiUrl}`);
        
        // Simulating API response for development
        // In a real app, replace this with actual API call
        chapters = [
            { id: '653a18aa19227e32c83a9079', number: 1, title: 'Chapter 1' },
            { id: '653a18aa19227e32c83a9080', number: 2, title: 'Chapter 2' },
            { id: '653a18aa19227e32c83a9081', number: 3, title: 'Chapter 3' }
        ];
        
        // Find the current chapter index
        currentChapterIndex = chapters.findIndex(chapter => chapter.id === currentChapterId);
        
        // Populate chapter dropdown
        populateChapterDropdown();
        
    } catch (error) {
        console.error('Error fetching manga info:', error);
        throw new Error('Failed to fetch manga information');
    }
}

// Fetch chapter content (pages/images)
async function fetchChapterContent(slug, chapterId) {
    try {
        // This is a placeholder for the actual API endpoint
        // In a real application, you would use the actual API endpoint
        const apiUrl = `https://api.example.com/manga/${slug}/chapters/${chapterId}`;
        
        console.log(`Fetching chapter content from: ${apiUrl}`);
        
        // In a real app, replace this with actual API call
        // For this static demo, we'll simulate that images are fetched
        const chapterData = {
            title: 'Chapter Title',
            pages: [
                { id: 1, url: 'https://via.placeholder.com/800x1200/333333/FFFFFF?text=Manga+Page+1' },
                { id: 2, url: 'https://via.placeholder.com/800x1200/333333/FFFFFF?text=Manga+Page+2' },
                { id: 3, url: 'https://via.placeholder.com/800x1200/333333/FFFFFF?text=Manga+Page+3' },
                { id: 4, url: 'https://via.placeholder.com/800x1200/333333/FFFFFF?text=Manga+Page+4' },
                { id: 5, url: 'https://via.placeholder.com/800x1200/333333/FFFFFF?text=Manga+Page+5' }
            ]
        };
        
        // Display the manga pages
        displayMangaPages(chapterData.pages);
        
    } catch (error) {
        console.error('Error fetching chapter content:', error);
        throw new Error('Failed to fetch chapter content');
    }
}

// Display manga pages in the content container
function displayMangaPages(pages) {
    // Clear previous content
    mangaContent.innerHTML = '';
    
    if (pages && pages.length > 0) {
        // Create elements for each page
        pages.forEach(page => {
            const pageElement = document.createElement('div');
            pageElement.className = 'manga-page-container';
            
            // In a real app, these would be actual manga images
            // For this static demo, we're using placeholders
            const img = document.createElement('img');
            img.src = page.url;
            img.alt = `Page ${page.id}`;
            img.className = 'manga-page';
            img.loading = 'lazy'; // Lazy load images for better performance
            
            pageElement.appendChild(img);
            mangaContent.appendChild(pageElement);
        });
        
        // Show the content container
        mangaContent.style.display = 'block';
        
        // Apply reading mode based on toggle state
        if (!readingModeToggle.checked) {
            mangaContent.classList.add('horizontal-mode');
        } else {
            mangaContent.classList.remove('horizontal-mode');
        }
    } else {
        showEmptyState('No pages found for this chapter');
    }
}

// Populate the chapter dropdown menu
function populateChapterDropdown() {
    // Clear previous items
    chapterList.innerHTML = '';
    
    if (chapters && chapters.length > 0) {
        chapters.forEach(chapter => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.className = 'dropdown-item';
            link.href = '#';
            link.textContent = `Chapter ${chapter.number}${chapter.title ? ': ' + chapter.title : ''}`;
            
            if (chapter.id === currentChapterId) {
                link.classList.add('active');
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
        chapterIdDisplay.textContent = currentChapterId;
        
        // Load the new chapter content
        loadMangaContent(currentSlug, currentChapterId);
    }
}

// Update navigation button states based on current chapter
function updateNavigation() {
    if (currentChapterIndex > 0) {
        prevChapterBtn.disabled = false;
    } else {
        prevChapterBtn.disabled = true;
    }
    
    if (currentChapterIndex < chapters.length - 1 && currentChapterIndex !== -1) {
        nextChapterBtn.disabled = false;
    } else {
        nextChapterBtn.disabled = true;
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
