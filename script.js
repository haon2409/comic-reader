// Global variables
let currentSlug = "";
let currentChapterId = "";
let chapters = [];
let currentChapterIndex = -1;
let isVerticalNav = true; // Default to vertical navigation (for desktop/landscape)
let readChapters = {};
let isNewest = false; // Biến mới để kiểm tra tham số newest
let followedMangas = []; // Danh sách truyện theo dõi

// DOM elements
const mangaTitle = document.getElementById("manga-title");
const mangaContent = document.getElementById("manga-content");
const loading = document.getElementById("loading");
const errorMessage = document.getElementById("error-message");
const prevChapterBtn = document.getElementById("prev-chapter");
const nextChapterBtn = document.getElementById("next-chapter");
const chapterList = document.getElementById("chapter-list");
const toggleNavPositionBtn = document.getElementById("toggle-nav-position");
const chapterNavigation = document.getElementById("chapter-navigation");
const warmthSlider = document.getElementById("warmth-slider");

// Initialize the application when the DOM is fully loaded
// Get base path for the application
function getBasePath() {
    const path = window.location.pathname;
    const segments = path.split("/").filter((segment) => segment.length > 0);
    // Check if we're on GitHub Pages with /manga-reader/
    if (segments[0] === "manga-reader") {
        return "/manga-reader/";
    }

    return "./";
}

document.addEventListener("DOMContentLoaded", function () {
    const navbarBrand = document.querySelector(".navbar-brand");
    if (navbarBrand) {
        navbarBrand.href = getBasePath();
    }

    loadFollowedMangas(); // Tải danh sách truyện theo dõi trước
    loadReadHistory(); // Tải lịch sử đọc trước
    parseUrlParameters(); // Sau đó mới parse URL

    const searchForm = document.getElementById("search-form");
    if (searchForm) {
        searchForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const keyword = document
                .getElementById("search-input")
                .value.trim();
            if (keyword) {
                handleSearchResults(keyword);
            }
        });
    }

    setupEventListeners();
    setupWarmthSlider();
});

document.addEventListener("touchstart", function (e) {
    window.touchStartX = e.touches[0].clientX;
    window.touchStartTime = Date.now();
});

document.addEventListener(
    "touchmove",
    function (e) {
        if (
            window.touchStartX < 20 ||
            window.touchStartX > window.innerWidth - 20
        ) {
            e.preventDefault(); // Chặn back gesture của iOS (chỉ hoạt động trong WebView hoặc một số trường hợp)
        }
    },
    { passive: false },
);

document.addEventListener("touchend", function (e) {
    let touchEndX = e.changedTouches[0].clientX;
    let deltaX = touchEndX - window.touchStartX;
    let duration = Date.now() - window.touchStartTime;

    // Nếu vuốt nhanh và xuất phát từ cạnh
    if (window.touchStartX < 20 && deltaX > 50 && duration < 500) {
        console.log("Quẹt từ cạnh trái!");
        prevChapterBtn.click();
        // Xử lý quẹt từ trái (mở menu, chuyển trang, v.v.)
    } else if (
        window.touchStartX > window.innerWidth - 20 &&
        deltaX < -50 &&
        duration < 500
    ) {
        console.log("Quẹt từ cạnh phải!");
        // Xử lý quẹt từ phải
        nextChapterBtn.click();
    }
});

function parseUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    currentSlug = urlParams.get("slug") || "";
    const requestedChapterId = urlParams.get("chapter_id") || "";
    isNewest = urlParams.get("newest") === "true";

    if (currentSlug) {
        const formattedSlug = currentSlug
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        mangaTitle.textContent = formattedSlug;
        const followBtn = document.getElementById("follow-manga-btn");
        followBtn.style.display = "inline-block";
        followBtn.setAttribute("data-slug", currentSlug);

        const isFollowed = followedMangas.some((m) => m.slug === currentSlug);
        if (isFollowed) {
            followBtn.classList.add("followed");
            followBtn.innerHTML = `<i class="fas fa-star me-1"></i> Đã theo dõi`;
        } else {
            followBtn.classList.remove("followed");
            followBtn.innerHTML = `<i class="fas fa-star me-1"></i> Theo dõi`;
        }
        loadMangaContent(currentSlug, requestedChapterId);
    } else {
        console.log("No slug found, showing empty state"); // Thêm log để kiểm tra
        document.getElementById("follow-manga-btn").style.display = "none";
        showEmptyState();
    }
}

// Toggle follow/unfollow for a manga
function toggleFollowManga(slug, title, chapterId = null) {
    const mangaIndex = followedMangas.findIndex((manga) => manga.slug === slug);
    const buttons = document.querySelectorAll(
        `.follow-btn[data-slug="${slug}"], #follow-manga-btn[data-slug="${slug}"]`,
    );

    if (mangaIndex === -1) {
        // Follow: Add to list
        followedMangas.push({ slug, title, chapterId });
        buttons.forEach((button) => {
            button.classList.add("followed");
            button.innerHTML = `<i class="fas fa-star me-1"></i> Đã theo dõi`;
        });
    } else {
        // Unfollow: Remove from list
        followedMangas.splice(mangaIndex, 1);
        buttons.forEach((button) => {
            button.classList.remove("followed");
            button.innerHTML = `<i class="fas fa-star me-1"></i> Theo dõi`;
        });
    }

    // Save to localStorage
    saveFollowedMangas();

    // Refresh the followed mangas list on homepage if we're on it
    if (!currentSlug) {
        showEmptyState();
    }
}

// Update setupEventListeners to handle follow buttons
function setupEventListeners() {
    // Previous chapter button
    prevChapterBtn.addEventListener("click", function (e) {
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
    nextChapterBtn.addEventListener("click", function (e) {
        e.preventDefault();
        if (
            currentChapterIndex < chapters.length - 1 &&
            currentChapterIndex !== -1
        ) {
            const nextChapterId = chapters[currentChapterIndex + 1].id;
            console.log("Navigating to next chapter: " + nextChapterId);
            navigateToChapter(nextChapterId);
        } else {
            console.log("No next chapter available");
        }
    });

    // Toggle navigation position button
    toggleNavPositionBtn.addEventListener("click", function (e) {
        e.preventDefault();
        toggleNavPosition();
    });

    // Load nav position from localStorage
    loadNavPositionFromStorage();

    // Keyboard navigation - Enhanced with more key options
    document.addEventListener("keydown", function (e) {
        if (
            (e.key === "ArrowLeft" || e.key.toLowerCase() === "p") &&
            !prevChapterBtn.disabled
        ) {
            prevChapterBtn.click();
        }
        if (
            (e.key === "ArrowRight" || e.key.toLowerCase() === "n") &&
            !nextChapterBtn.disabled
        ) {
            nextChapterBtn.click();
        }
    });

    // Log navigation button state whenever updated
    const observeNavButtons = new MutationObserver((mutations) => {
        console.log(
            "Navigation buttons updated: Previous disabled:",
            prevChapterBtn.disabled,
            "Next disabled:",
            nextChapterBtn.disabled,
        );
    });

    observeNavButtons.observe(prevChapterBtn, {
        attributes: true,
        attributeFilter: ["disabled"],
    });
    observeNavButtons.observe(nextChapterBtn, {
        attributes: true,
        attributeFilter: ["disabled"],
    });

    // Add event listeners for follow buttons
    document.addEventListener("click", function (e) {
        const followBtn = e.target.closest(".follow-btn");
        const unfollowBtn = e.target.closest(".unfollow-btn");

        if (followBtn) {
            const slug = followBtn.dataset.slug || currentSlug;
            const title = followBtn.dataset.title || mangaTitle.textContent;
            const chapterId = followBtn.dataset.chapterId || currentChapterId;
            toggleFollowManga(slug, title, chapterId);
        }

        if (unfollowBtn) {
            const slug = unfollowBtn.dataset.slug;
            const manga = followedMangas.find((m) => m.slug === slug);
            if (manga) {
                toggleFollowManga(slug, manga.title, manga.chapterId);
            }
        }
    });
}

async function loadMangaContent(slug, requestedChapterId) {
    const urlParams = new URLSearchParams(window.location.search);

    try {
        loading.style.display = "block";
        mangaContent.style.display = "none";
        errorMessage.style.display = "none";
        document.getElementById("chapter-navigation").style.display = "flex";

        currentSlug = slug;

        try {
            await fetchMangaInfo(slug);

            if (!chapters || chapters.length === 0) {
                throw new Error("No chapters available");
            }

            if (isNewest) {
                currentChapterId = chapters[chapters.length - 1].id;
            } else {
                if (requestedChapterId) {
                    const validChapter = chapters.find(
                        (chapter) => chapter.id === requestedChapterId,
                    );
                    currentChapterId = validChapter
                        ? requestedChapterId
                        : chapters[0].id;
                } else {
                    currentChapterId = chapters[0].id;
                }
            }

            currentChapterIndex = chapters.findIndex(
                (chapter) => chapter.id === currentChapterId,
            );

            const url = new URL(window.location.href);
            url.searchParams.set("slug", slug);
            url.searchParams.set("chapter_id", currentChapterId);
            if (urlParams.get("newest") === "true" && isNewest) {
                url.searchParams.set("newest", "true");
            } else {
                url.searchParams.delete("newest");
            }
            window.history.replaceState({}, "", url.toString());

            await fetchChapterContent(slug, currentChapterId);

            isNewest = false; // Đặt lại sau lần tải đầu tiên
        } catch (error) {
            console.error("Error in loadMangaContent:", error);
            throw error;
        }

        updateNavigation();

        const followBtn = document.getElementById("follow-manga-btn");
        const isFollowed = followedMangas.some((m) => m.slug === currentSlug);
        if (isFollowed) {
            followBtn.classList.add("followed");
            followBtn.innerHTML = `<i class="fas fa-star me-1"></i> Đã theo dõi`;
        } else {
            followBtn.classList.remove("followed");
            followBtn.innerHTML = `<i class="fas fa-star me-1"></i> Theo dõi`;
        }

        applyWarmthFromStorage();
    } catch (error) {
        console.error("Error loading manga content:", error);
        showErrorMessage(
            error.message ||
                "Unable to load manga content. Please try again later.",
        );
    } finally {
        loading.style.display = "none";
    }
}

// Fetch manga information (title, chapters list, etc.)
async function fetchMangaInfo(slug) {
    const apiUrl = `https://otruyenapi.com/v1/api/truyen-tranh/${encodeURIComponent(slug)}`;
    console.log(`Fetching manga info from: ${apiUrl}`);

    try {
        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        if (!data || !data.data || !data.data.item) {
            throw new Error("Invalid API response structure");
        }

        mangaTitle.textContent = data.data.item.name || "Unknown Manga";
        chapters = data.data.item.chapters[0].server_data.map((chapter) => ({
            id: chapter.chapter_api_data.split("/").pop(),
            number: chapter.chapter_name,
            title: chapter.chapter_title || "",
        }));

        currentChapterIndex = chapters.findIndex(
            (chapter) => chapter.id === currentChapterId,
        );
        if (currentChapterIndex === -1 && currentChapterId) {
            currentChapterIndex = 0;
        }

        populateChapterDropdown();
    } catch (error) {
        console.error("Error fetching manga info:", error);
        throw error; // Ném lỗi lên để hàm gọi xử lý (như loadLatestChapter)
    }
}

// Fetch detailed manga information for followed mangas
async function fetchMangaDetails(slug) {
    try {
        const apiUrl = `https://otruyenapi.com/v1/api/truyen-tranh/${encodeURIComponent(slug)}`;
        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            },
        });

        if (!response.ok) {
            throw new Error(
                `API request failed with status ${response.status}`,
            );
        }

        const data = await response.json();
        if (!data || !data.data || !data.data.item) {
            throw new Error("Invalid API response structure");
        }

        const manga = data.data.item;
        const cdnDomain =
            data.data.APP_DOMAIN_CDN_IMAGE || "https://sv1.otruyencdn.com";

        return {
            slug: manga.slug,
            name: manga.name || "Unknown Title",
            author: Array.isArray(manga.author)
                ? manga.author.join(", ")
                : "Unknown Author",
            thumbnail:
                `${cdnDomain}/uploads/comics/${manga.thumb_url}` ||
                "https://via.placeholder.com/50x70?text=No+Image",
            status: manga.status || "Unknown",
            chapterCount: manga.chapters?.[0]?.server_data?.length || 0,
            updatedAt: manga.updatedAt
                ? new Date(manga.updatedAt).toLocaleDateString()
                : "N/A",
            chapters: manga.chapters || [],
        };
    } catch (error) {
        console.error(`Error fetching details for slug ${slug}:`, error);
        return {
            slug,
            name: "Error Loading Title",
            author: "N/A",
            thumbnail: "https://via.placeholder.com/50x70?text=Error",
            status: "N/A",
            chapterCount: 0,
            updatedAt: "N/A",
        };
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
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            },
        });

        if (!response.ok) {
            throw new Error(
                `API request failed with status ${response.status}`,
            );
        }

        const data = await response.json();
        console.log("Chapter API response:", data);

        // Check if data is valid and has expected structure
        if (!data || data.status !== "success" || !data.data) {
            throw new Error("Invalid API response structure");
        }

        // Xử lý cấu trúc API mới
        const domainCdn = data.data.domain_cdn || "";
        const chapterPath = data.data.item?.chapter_path || "";
        const chapterImages = data.data.item?.chapter_image || [];

        if (!chapterImages.length) {
            throw new Error("No images found in this chapter");
        }

        // Tạo URLs của các trang theo format: domain_cdn + chapter_path + image_file
        const pages = chapterImages.map((image, index) => {
            const imageFile = image.image_file || "";
            const fullUrl = `${domainCdn}/${chapterPath}/${imageFile}`;

            return {
                id: index + 1,
                url: fullUrl,
                filename: imageFile,
            };
        });

        console.log(`Loaded ${pages.length} pages for chapter`);

        // Display the manga pages
        displayMangaPages(pages);

        // Update page title with chapter information
        if (currentChapterIndex !== -1 && chapters[currentChapterIndex]) {
            const chapter = chapters[currentChapterIndex];
            document.title = `Chap ${chapter.number} - ${mangaTitle.textContent}`;
        }
    } catch (error) {
        console.error("Error fetching chapter content:", error);
        throw new Error("Failed to fetch chapter content: " + error.message);
    }
}

// Display manga pages in the content container
function displayMangaPages(pages) {
    if (!mangaContent) {
        console.error("Manga content container not found");
        return;
    }

    // Clear previous content
    mangaContent.innerHTML = "";

    if (Array.isArray(pages) && pages.length > 0) {
        // Create container for pages
        const pagesContainer = document.createElement("div");
        pagesContainer.className = "manga-pages-container";
        mangaContent.appendChild(pagesContainer);

        // Create elements for each page
        pages.forEach((page, index) => {
            const pageElement = document.createElement("div");
            pageElement.className = "manga-page-container";
            pageElement.dataset.pageNumber = index + 1;

            // Create image element
            const img = document.createElement("img");
            img.src = page.url;
            img.alt = `Page ${page.id}`;
            img.className = "manga-page";
            img.loading = "lazy"; // Lazy load images for better performance

            // Add error handling for images
            img.onerror = function () {
                this.onerror = null;
                this.src =
                    "https://via.placeholder.com/800x1200/333333/FFFFFF?text=Image+Load+Error";
                console.error(`Failed to load image: ${page.url}`);
            };

            // Add page number indicator
            const pageNumber = document.createElement("div");
            pageNumber.className = "page-number badge bg-secondary";
            pageNumber.textContent = `Page ${index + 1}`;

            // Add elements to container
            pageElement.appendChild(img);
            pageElement.appendChild(pageNumber);
            pagesContainer.appendChild(pageElement);
        });

        // Show the content container
        mangaContent.style.display = "block";

        // Always in vertical mode (reading mode toggle removed)
        pagesContainer.classList.remove("horizontal-mode");
    } else {
        showEmptyState("No pages found for this chapter");
    }
}

// Populate the chapter dropdown menu
function populateChapterDropdown() {
    // Clear previous items
    chapterList.innerHTML = "";

    if (chapters && chapters.length > 0) {
        // Update the dropdown button text to show the currently selected chapter
        if (currentChapterIndex !== -1) {
            const currentChapter = chapters[currentChapterIndex];
            document.getElementById("chapterDropdown").textContent =
                `Chap ${currentChapter.number}`;
        } else {
            document.getElementById("chapterDropdown").textContent =
                "Chap Selection";
        }

        // Add chapters to dropdown in reverse order (newest first)
        // Create a copy of the array for sorting to avoid affecting the original order
        const sortedChapters = [...chapters].reverse();

        sortedChapters.forEach((chapter) => {
            const listItem = document.createElement("li");
            const link = document.createElement("a");
            link.className = "dropdown-item";
            link.href = "#";

            // Format chapter name with number and title if available
            let chapterText = `Chapter ${chapter.number}`;
            if (chapter.title && chapter.title.trim() !== "") {
                chapterText += `: ${chapter.title}`;
            }
            link.textContent = chapterText;

            // Mark chapter as read if in read history
            if (readChapters[currentSlug]?.includes(chapter.id)) {
                link.classList.add("read");
            }

            // Highlight the current chapter
            if (chapter.id === currentChapterId) {
                link.classList.add("active");
                link.innerHTML = `<i class="fas fa-bookmark me-2"></i>${chapterText}`;
            }

            link.addEventListener("click", (e) => {
                e.preventDefault();
                navigateToChapter(chapter.id);
            });

            listItem.appendChild(link);
            chapterList.appendChild(listItem);
        });

        // Set dropdown position based on current navigation position
        updateDropdownPosition();
    } else {
        const listItem = document.createElement("li");
        listItem.textContent = "No chapters available";
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
        const url = new URL(window.location.href);
        url.searchParams.set("slug", currentSlug);
        url.searchParams.set("chapter_id", chapterId);
        url.searchParams.delete("newest"); // Xóa newest khi chuyển chương
        window.history.pushState({}, "", url.toString());

        currentChapterId = chapterId;
        console.log(
            `Loading new chapter content for slug: ${currentSlug}, chapterId: ${currentChapterId}`,
        );
        loadMangaContent(currentSlug, currentChapterId);
    } else {
        console.log("Already on this chapter, not navigating");
    }
}

// Trong hàm updateNavigation
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

    if (
        currentChapterIndex < chapters.length - 1 &&
        currentChapterIndex !== -1
    ) {
        nextChapterBtn.disabled = false;
        nextChapterBtn.innerHTML = `<i class="fas fa-arrow-right"></i>`;
        nextChapterBtn.title = `Next Chapter (${chapters[currentChapterIndex + 1].number})`;
    } else {
        nextChapterBtn.disabled = true;
        nextChapterBtn.innerHTML = `<i class="fas fa-arrow-right"></i>`;
        nextChapterBtn.title = `No Next Chapter`;
    }

    // Gọi saveReadChapter lưu chương hiện tại
    if (currentChapterId) {
        saveReadChapter(currentChapterId);
    }

    // Cập nhật tiêu đề trang
    if (currentChapterIndex !== -1 && chapters[currentChapterIndex]) {
        const chapter = chapters[currentChapterIndex];
        document.title = `Chapter ${chapter.number} - ${mangaTitle.textContent}`;
    } else {
        document.title = "Manga Reader";
    }

    // Cập nhật tổng số chapter
    const chapterCountElement = document.getElementById("chapter-count");
    if (chapterCountElement) {
        if (chapters.length > 0) {
            chapterCountElement.textContent = `${chapters.length}`;
        } else {
            chapterCountElement.textContent = "No chapters available";
        }
    }
}

// Show error message
function showErrorMessage(message) {
    errorMessage.style.display = "block";
    document.getElementById("error-text").textContent = message;
    mangaContent.style.display = "none";
}

// Toggle the navigation bar layout between vertical (desktop) and horizontal (mobile)
function toggleNavPosition() {
    // Toggle the navigation layout state
    isVerticalNav = !isVerticalNav;

    // Apply the appropriate classes based on current state
    applyNavPositionStyles();

    // Save to localStorage
    localStorage.setItem("isVerticalNav", isVerticalNav.toString());

    // Update the icon/tooltip to show current position
    updateNavPositionIcon();

    // Update dropdown menu position
    updateDropdownPosition();
}

// Load navigation position from localStorage
function loadNavPositionFromStorage() {
    const savedPosition = localStorage.getItem("isVerticalNav");

    if (savedPosition !== null) {
        isVerticalNav = savedPosition === "true";
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
    chapterNavigation.classList.remove("nav-vertical", "nav-horizontal");

    if (isVerticalNav) {
        // Force vertical layout regardless of screen size
        chapterNavigation.classList.add("nav-vertical");
    } else {
        // Force horizontal layout regardless of screen size
        chapterNavigation.classList.add("nav-horizontal");
    }
}

// Update the toggle button icon/tooltip to reflect current position
function updateNavPositionIcon() {
    // Update tooltip
    if (isVerticalNav) {
        toggleNavPositionBtn.title = "Switch to horizontal layout";
        toggleNavPositionBtn.innerHTML =
            '<i class="fas fa-grip-horizontal"></i>';
    } else {
        toggleNavPositionBtn.title = "Switch to vertical layout";
        toggleNavPositionBtn.innerHTML = '<i class="fas fa-grip-vertical"></i>';
    }
}

// Update dropdown position based on navigation bar position
function updateDropdownPosition() {
    const dropdownMenu = document.querySelector(".dropdown-menu");
    if (!dropdownMenu) return;

    // Remove any previously set positions
    dropdownMenu.classList.remove(
        "dropdown-menu-end",
        "dropdown-menu-start",
        "dropdown-menu-up",
    );

    if (isVerticalNav) {
        // If nav is vertical (on right side), show dropdown to the left
        dropdownMenu.classList.add("dropdown-menu-start");
    } else {
        // If nav is horizontal (at bottom), show dropdown above
        dropdownMenu.classList.add("dropdown-menu-up");
    }
}

function loadReadHistory() {
    const history = localStorage.getItem("readChapters");
    if (history) {
        try {
            readChapters = JSON.parse(history);
            // Không cần xử lý dữ liệu cũ, giả sử luôn là đối tượng
            if (typeof readChapters !== "object" || readChapters === null) {
                readChapters = {};
            }
        } catch (error) {
            console.error("Error parsing read history:", error);
            readChapters = {};
        }
    }
}

async function showEmptyState(message = "No manga content to display") {
    loading.style.display = "none";
    mangaContent.style.display = "block";
    document.getElementById("chapter-navigation").style.display = "none";
    document.getElementById("follow-manga-btn").style.display = "none";

    let emptyStateHtml = "";

    if (followedMangas.length === 0) {
        emptyStateHtml = `
            <div class="empty-state">
                <i class="fas fa-book"></i>
                <h3>Welcome to Manga Reader</h3>
                <p>${message}</p>
                <p>Enter a valid manga URL to begin reading.</p>
                <p><a href="./?slug=dao-hai-tac&chapter_id=65901d64ac52820f564b373e" target="_blank">Example: ?slug=dao-hai-tac&chapter_id=65901d64ac52820f564b373e</a></p>
            </div>
        `;
    }

    if (followedMangas.length > 0) {
        mangaContent.innerHTML = `
            <div class="text-center my-5">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading followed mangas...</span>
                </div>
            </div>
        `;

        const mangaDetailsPromises = followedMangas.map((manga) =>
            fetchMangaDetails(manga.slug),
        );
        const mangaDetails = await Promise.all(mangaDetailsPromises);

        const followedMangasHtml = mangaDetails
            .map((manga, index) => {
                const latestChapterId = followedMangas.find(
                    (m) => m.slug === manga.slug,
                )?.chapterId;
                const url = latestChapterId
                    ? `./?slug=${manga.slug}&chapter_id=${latestChapterId}`
                    : `./?slug=${manga.slug}`;

                // Lấy thông tin chapter từ API đã gọi trong fetchMangaDetails

                const chapters = manga.chapters?.[0]?.server_data || [];

                const chapterIndex = chapters.findIndex(
                    (ch) =>
                        ch.chapter_api_data.split("/").pop() ===
                        latestChapterId,
                );

                const chapter =
                    chapterIndex !== -1 ? chapters[chapterIndex] : null;

                const chapterName =
                    chapter?.chapter_name ||
                    (chapterIndex !== -1 ? `${chapterIndex + 1}` : "");
                const chapterTitle = chapter?.chapter_title || "";
                const readingText = chapterName
                    ? `Đang đọc: ${chapterName}${chapterTitle ? ` - ${chapterTitle}` : ""}`
                    : "";

                return `
                <div class="followed-manga-card">
                    <img src="${manga.thumbnail}" alt="${manga.name}" class="followed-manga-thumbnail" onerror="this.src='https://via.placeholder.com/80x120?text=Error';">
                    <div class="followed-manga-info">
                        <a href="${url}" class="followed-manga-title">${manga.name}</a>
                        <p class="small text-muted mb-1">Tác giả: <span class="highlight-text">${manga.author}</span></p>
                        <p class="small text-muted mb-1">Trạng thái: <span class="highlight-text">${manga.status}</span></p>
                        <p class="small text-muted mb-1">Chương: <span class="highlight-text">${manga.chapterCount}</span> | Cập nhật: <span class="highlight-text">${manga.updatedAt}</span></p>
                        <p class="small text-muted mb-0">${readingText}</p>
                    </div>
                    <button class="unfollow-btn" data-slug="${manga.slug}" title="Bỏ theo dõi">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            })
            .join("");

        emptyStateHtml = `
            <div class="followed-mangas">
                <h4 class="mb-4">Truyện theo dõi</h4>
                <div class="followed-mangas-grid">
                    ${followedMangasHtml}
                </div>
            </div>
        `;
    }

    mangaContent.innerHTML = emptyStateHtml;
}

// Load followed mangas from localStorage
function loadFollowedMangas() {
    const followed = localStorage.getItem("followedMangas");
    if (followed) {
        try {
            followedMangas = JSON.parse(followed);
            console.log("Loaded followed mangas:", followedMangas);
        } catch (error) {
            console.error("Error parsing followed mangas:", error);
            followedMangas = [];
        }
    }
}

function saveReadChapter(chapterId) {
    if (!chapterId || !currentSlug) return;

    // Khởi tạo mảng cho slug nếu chưa có
    if (!readChapters[currentSlug]) {
        readChapters[currentSlug] = [];
    }

    // Thêm chapterId nếu chưa tồn tại
    if (!readChapters[currentSlug].includes(chapterId)) {
        readChapters[currentSlug].push(chapterId);
        localStorage.setItem("readChapters", JSON.stringify(readChapters));
    }

    // Cập nhật chapterId mới nhất trong followedMangas
    const mangaIndex = followedMangas.findIndex(
        (manga) => manga.slug === currentSlug,
    );
    if (mangaIndex !== -1) {
        followedMangas[mangaIndex].chapterId = chapterId;
        saveFollowedMangas();
    }
}

// Save followed mangas to localStorage
function saveFollowedMangas() {
    localStorage.setItem("followedMangas", JSON.stringify(followedMangas));
}

// Load the latest chapter when no chapter_id is specified
async function loadLatestChapter(slug) {
    try {
        loading.style.display = "block";
        mangaContent.style.display = "none";
        errorMessage.style.display = "none";

        currentSlug = slug;
        await fetchMangaInfo(slug);

        if (chapters && chapters.length > 0) {
            currentChapterId = chapters[chapters.length - 1].id;

            const url = new URL(window.location.href);
            url.searchParams.set("slug", slug);
            url.searchParams.set("chapter_id", currentChapterId);
            url.searchParams.set("newest", "true");
            window.history.replaceState({}, "", url.toString());

            await fetchChapterContent(slug, currentChapterId);
            updateNavigation();
            applyWarmthFromStorage();
        } else {
            throw new Error("No chapters found for this manga");
        }
    } catch (error) {
        console.error("Error loading latest chapter:", error);
        showErrorMessage(
            error.message ||
                "Unable to load manga content. Please try again later.",
        );
    } finally {
        loading.style.display = "none";
    }
}

async function handleSearchResults(keyword) {
    if (!keyword || typeof keyword !== "string") {
        mangaContent.innerHTML =
            '<div class="alert alert-info">Vui lòng nhập từ khóa tìm kiếm hợp lệ.</div>';
        return;
    }

    if (!mangaContent || !document.getElementById("chapter-navigation")) {
        console.error("Required DOM elements not found");
        return;
    }

    document.getElementById("chapter-navigation").style.display = "none";
    mangaTitle.textContent = `Kết quả tìm kiếm: "${keyword}"`;
    document.getElementById("follow-manga-btn").style.display = "none";

    try {
        mangaContent.innerHTML =
            '<div class="text-center my-5"><div class="spinner-border"></div></div>';

        const response = await fetch(
            `https://otruyenapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}`,
            {
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            },
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (
            data.status === "success" &&
            data.data &&
            data.data.items &&
            data.data.items.length > 0
        ) {
            const resultsHtml = data.data.items
                .map((manga) => {
                    const thumbnail = manga.thumb_url
                        ? `${data.data.APP_DOMAIN_CDN_IMAGE}/uploads/comics/${manga.thumb_url}`
                        : "https://via.placeholder.com/200x300?text=No+Image";
                    const date = manga.updatedAt
                        ? new Date(manga.updatedAt).toLocaleDateString()
                        : "N/A";
                    const authors = Array.isArray(manga.author)
                        ? manga.author.join(", ")
                        : "Unknown";
                    const chapterCount =
                        manga.chapters &&
                        Array.isArray(manga.chapters) &&
                        manga.chapters[0] &&
                        Array.isArray(manga.chapters[0].server_data)
                            ? manga.chapters[0].server_data.length
                            : 0;

                    const isFollowed = followedMangas.some(
                        (m) => m.slug === manga.slug,
                    );
                    const followText = isFollowed ? "Đã theo dõi" : "Theo dõi";
                    const followClass = isFollowed ? "followed" : "";

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
                                    <div class="d-flex align-items-center">
                                        <h5 class="card-title me-2">
                                            <a href="#" onclick="handleMangaClick('${manga.slug}'); return false;" class="text-decoration-none text-info">
                                                ${manga.name}
                                            </a>
                                        </h5>
                                        <button class="btn btn-sm btn-outline-info follow-btn ${followClass}" data-slug="${manga.slug}" data-title="${manga.name}">
                                            <i class="fas fa-star me-1"></i> ${followText}
                                        </button>
                                    </div>
                                    <p class="card-text">
                                        <small class="text-muted">Author: <span class="highlight-text">${authors}</span></small><br>
                                        <small class="text-muted">Status: <span class="highlight-text">${manga.status || "Unknown"}</span></small><br>
                                        <small class="text-muted">Chapters: <span class="highlight-text">${chapterCount}</span></small><br>
                                        <small class="text-muted">Updated: <span class="highlight-text">${date}</span></small>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                })
                .join("");

            mangaContent.innerHTML = `
                <div class="container">
                    ${resultsHtml}
                </div>
            `;
            loading.style.display = "none";
        } else {
            mangaContent.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No results found for "${keyword}"
                </div>`;
            loading.style.display = "none";
        }
    } catch (error) {
        console.error("Search error:", error);
        mangaContent.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error searching manga. Please try again later.
            </div>`;
    }
}

function handleMangaClick(slug) {
    // Fetch manga info first to get chapters
    fetch(
        `https://otruyenapi.com/v1/api/truyen-tranh/${encodeURIComponent(slug)}`,
        {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
        },
    )
        .then((response) => response.json())
        .then((data) => {
            if (data?.data?.item?.chapters?.[0]?.server_data) {
                // Get first chapter ID
                const firstChapter = data.data.item.chapters[0].server_data[0];
                const chapterApiUrl = firstChapter.chapter_api_data;
                const chapterId = chapterApiUrl.split("/").pop();

                // Navigate to manga with first chapter
                window.location.href = `./?slug=${slug}&chapter_id=${chapterId}`;
            } else {
                window.location.href = `./?slug=${slug}`;
            }
        })
        .catch((error) => {
            console.error("Error fetching manga info:", error);
            window.location.href = `./?slug=${slug}`;
        });
}

// Warmth slider functionality
function setupWarmthSlider() {
    // Load saved warmth value from localStorage
    const savedWarmth = localStorage.getItem("warmthValue");
    if (savedWarmth !== null) {
        warmthSlider.value = savedWarmth;
    }

    // Apply warmth when slider changes
    warmthSlider.addEventListener("input", function () {
        const warmthValue = warmthSlider.value;
        applyWarmth(warmthValue);
        localStorage.setItem("warmthValue", warmthValue);
    });
}

function applyWarmth(warmthValue) {
    const mangaPages = document.querySelectorAll(".manga-page");
    const sepia = warmthValue * 1.0; // Tăng lên 100% để có tông vàng-nâu đậm
    const brightness = 100 - warmthValue * 0.15; // Giảm sáng nhẹ 15% để giữ chi tiết
    const hueRotate = warmthValue * 0.2; // Tăng nhẹ đến 20deg để nghiêng về vàng, tránh xanh
    const contrast = 100 - warmthValue * 0.1; // Giảm contrast nhẹ 10% để tạo cảm giác cũ

    // Tính màu nền từ trắng (#ffffff) đến vàng giấy cũ (#d4a017)
    const red = Math.round(255 - (255 - 212) * (warmthValue / 100)); // Từ 255 xuống 212
    const green = Math.round(255 - (255 - 160) * (warmthValue / 100)); // Từ 255 xuống 160
    const blue = Math.round(255 - (255 - 23) * (warmthValue / 100)); // Từ 255 xuống 23
    warmthSlider.style.background = `rgb(${red}, ${green}, ${blue})`;

    mangaPages.forEach((page) => {
        page.style.filter = `sepia(${sepia}%) brightness(${brightness}%) hue-rotate(${hueRotate}deg) contrast(${contrast}%)`;
    });
}

function applyWarmthFromStorage() {
    const savedWarmth = localStorage.getItem("warmthValue");
    if (savedWarmth !== null) {
        warmthSlider.value = savedWarmth;
        applyWarmth(savedWarmth);
    }
}
