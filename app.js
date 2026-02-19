'use strict';

/* ================================================================
   1. CONFIGURATION
   ================================================================ */
const CONFIG = {
    // ==========================================
    // GOOGLE SHEETS API CREDENTIALS
    // ==========================================
    GOOGLE_SHEETS: {
        API_KEY: 'AIzaSyAMA_OQVjhHxAvKjkoAsIfJO-k85y16-pk',
        SPREADSHEET_ID: '17pSblzdALF2JaoVQ16l65KEjUfqCA3t-2CbLJJmqUZI',
        
        // Sheet tab names (must match exactly)
        SHEETS: {
            COURSES: 'Courses',
            MODULES: 'Modules',
            LESSONS: 'Lessons'
        }
    },
    
    // ==========================================
    // APPLICATION SETTINGS
    // ==========================================
    APP: {
        NAME: 'Premium Course Platform',
        VERSION: '2.0.0',
        DEBUG: true,
        
        // Timing
        TOAST_DURATION: 4000,
        ANIMATION_DURATION: 300,
        DEBOUNCE_DELAY: 150,
        
        // Storage keys
        STORAGE: {
            THEME: 'course_platform_theme',
            PURCHASES: 'course_platform_purchases',
            PROGRESS: 'course_platform_progress'
        },
        
        // Default theme
        DEFAULT_THEME: 'dark'
    },
    
    // ==========================================
    // FALLBACK IMAGES
    // ==========================================
    IMAGES: {
        PLACEHOLDER_COLORS: ['6366f1', '8b5cf6', 'ec4899', '22d3ee', '10b981', 'f97316', 'ef4444'],
        DEFAULT_COURSE_IMAGE: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=750&fit=crop',
        YOUTUBE_THUMBNAIL_QUALITY: 'hqdefault' // maxresdefault, hqdefault, mqdefault, default
    }
};

/* ================================================================
   2. APPLICATION STATE
   ================================================================ */
const AppState = {
    // Current view
    currentView: 'home', // 'home' | 'course' | 'module'
    previousView: null,
    
    // Data from Google Sheets
    courses: [],
    modules: [],
    lessons: [],
    
    // Currently selected items
    selectedCourse: null,
    selectedModule: null,
    selectedLesson: null,
    
    // Current index in selector
    currentIndex: 0,
    
    // UI states
    isLoading: true,
    isVideoPlaying: false,
    hasError: false,
    
    // Theme
    currentTheme: 'dark',
    
    // Purchases (for premium courses)
    purchasedCourses: [],
    
    // DOM elements cache
    elements: {}
};

/* ================================================================
   3. UTILITY FUNCTIONS
   ================================================================ */
const Utils = {
    /**
     * Debug logger - only logs when DEBUG is true
     * @param {...any} args - Arguments to log
     */
    log(...args) {
        if (CONFIG.APP.DEBUG) {
            console.log(`[${CONFIG.APP.NAME}]`, ...args);
        }
    },
    
    /**
     * Error logger
     * @param {...any} args - Arguments to log
     */
    error(...args) {
        console.error(`[${CONFIG.APP.NAME} ERROR]`, ...args);
    },
    
    /**
     * Truncate text to specified length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    truncate(text, maxLength = 50) {
        if (!text || typeof text !== 'string') return '';
        text = text.trim();
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    },
    
    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    debounce(func, wait = CONFIG.APP.DEBOUNCE_DELAY) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * Capitalize first letter
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },
    
    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    /**
     * Check if value is empty
     * @param {any} value - Value to check
     * @returns {boolean} True if empty
     */
    isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    },
    
    /**
     * Safely parse JSON
     * @param {string} json - JSON string
     * @param {any} fallback - Fallback value
     * @returns {any} Parsed value or fallback
     */
    parseJSON(json, fallback = null) {
        try {
            return JSON.parse(json);
        } catch (e) {
            return fallback;
        }
    },
    
    /**
     * Delay execution
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    /**
     * Get element by ID with error handling
     * @param {string} id - Element ID
     * @returns {HTMLElement|null} Element or null
     */
    $(id) {
        return document.getElementById(id);
    },
    
    /**
     * Query selector with error handling
     * @param {string} selector - CSS selector
     * @param {HTMLElement} parent - Parent element
     * @returns {HTMLElement|null} Element or null
     */
    $$(selector, parent = document) {
        return parent.querySelector(selector);
    },
    
    /**
     * Query selector all
     * @param {string} selector - CSS selector
     * @param {HTMLElement} parent - Parent element
     * @returns {NodeList} NodeList of elements
     */
    $$$(selector, parent = document) {
        return parent.querySelectorAll(selector);
    }
};

/* ================================================================
   4. YOUTUBE HELPERS
   ================================================================ */
const YouTubeHelpers = {
    /**
     * Extract YouTube video ID from various URL formats
     * @param {string} url - YouTube URL
     * @returns {string|null} Video ID or null
     */
    extractVideoId(url) {
        if (!url || typeof url !== 'string') return null;
        
        url = url.trim();
        
        // If already just an ID (11 characters)
        if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
            return url;
        }
        
        // Various YouTube URL patterns
        const patterns = [
            // Standard watch URL
            /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
            // Short URL
            /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
            // Embed URL
            /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            // V URL
            /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
            // Shorts URL
            /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
            // Live URL
            /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
            // With additional parameters
            /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
            // youtu.be with parameters
            /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\?|&|#|$)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                // Clean the ID (remove any trailing parameters)
                let videoId = match[1];
                videoId = videoId.split('?')[0].split('&')[0].split('#')[0];
                
                // Verify it's exactly 11 characters
                if (videoId.length === 11) {
                    return videoId;
                }
            }
        }
        
        // Last resort: try to find any 11-character alphanumeric sequence
        const fallbackMatch = url.match(/[a-zA-Z0-9_-]{11}/);
        if (fallbackMatch) {
            return fallbackMatch[0];
        }
        
        return null;
    },
    
    /**
     * Get YouTube thumbnail URL
     * @param {string} videoUrl - YouTube video URL
     * @param {string} quality - Thumbnail quality
     * @returns {string|null} Thumbnail URL or null
     */
    getThumbnail(videoUrl, quality = CONFIG.IMAGES.YOUTUBE_THUMBNAIL_QUALITY) {
        const videoId = this.extractVideoId(videoUrl);
        if (!videoId) return null;
        
        // Available qualities: maxresdefault, hqdefault, mqdefault, default
        return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
    },
    
    /**
     * Get YouTube embed URL for iframe
     * @param {string} videoUrl - YouTube video URL
     * @param {object} options - Embed options
     * @returns {string|null} Embed URL or null
     */
    getEmbedUrl(videoUrl, options = {}) {
        const videoId = this.extractVideoId(videoUrl);
        if (!videoId) return null;
        
        const defaultOptions = {
            autoplay: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1
        };
        
        const params = { ...defaultOptions, ...options };
        const queryString = Object.entries(params)
            .map(([key, value]) => `${key}=${value}`)
            .join('&');
        
        return `https://www.youtube.com/embed/${videoId}?${queryString}`;
    },
    
    /**
     * Check if URL is a valid YouTube URL
     * @param {string} url - URL to check
     * @returns {boolean} True if valid YouTube URL
     */
    isValidUrl(url) {
        return this.extractVideoId(url) !== null;
    }
};

/* ================================================================
   5. THUMBNAIL HELPERS
   ================================================================ */
const ThumbnailHelpers = {
    /**
     * Generate a placeholder image URL
     * @param {string} text - Text for placeholder
     * @param {number} size - Image size
     * @returns {string} Placeholder URL
     */
    generatePlaceholder(text, size = 400) {
        const safeText = (text || 'Course').toString().trim();
        const colors = CONFIG.IMAGES.PLACEHOLDER_COLORS;
        
        // Generate color based on first characters
        const charCode = safeText.charCodeAt(0) + (safeText.charCodeAt(1) || 0);
        const colorIndex = Math.abs(charCode) % colors.length;
        const bgColor = colors[colorIndex];
        
        // Get initials (up to 2 characters)
        const initials = safeText
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .substring(0, 2)
            .toUpperCase();
        
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bgColor}&color=ffffff&size=${size}&bold=true&font-size=0.4`;
    },
    
    /**
     * Check if URL is a valid image URL
     * @param {string} url - URL to check
     * @returns {boolean} True if valid
     */
    isValidImageUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        const trimmed = url.trim().toLowerCase();
        
        // Check for empty or invalid values
        if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined' || trimmed === '-' || trimmed === 'n/a') {
            return false;
        }
        
        // Check for valid URL patterns
        return trimmed.startsWith('http://') || 
               trimmed.startsWith('https://') || 
               trimmed.startsWith('data:image');
    },
    
    /**
     * Get thumbnail URL for an item with smart fallbacks
     * @param {object} item - Course, module, or lesson object
     * @param {string} type - Item type: 'course', 'module', or 'lesson'
     * @returns {string} Thumbnail URL
     */
    getThumbnail(item, type = 'course') {
        if (!item) {
            return CONFIG.IMAGES.DEFAULT_COURSE_IMAGE;
        }
        
        Utils.log(`Getting thumbnail for ${type}:`, item.title);
        
        // Priority 1: Direct thumbnail_url field
        if (this.isValidImageUrl(item.thumbnail_url)) {
            Utils.log('  → Using direct thumbnail_url');
            return item.thumbnail_url;
        }
        
        // Priority 2: For lessons - try YouTube thumbnail from video_url
        if (type === 'lesson' && item.video_url) {
            const ytThumbnail = YouTubeHelpers.getThumbnail(item.video_url);
            if (ytThumbnail) {
                Utils.log('  → Using YouTube thumbnail from video_url');
                return ytThumbnail;
            }
        }
        
        // Priority 3: For modules - try first lesson's thumbnail
        if (type === 'module') {
            const moduleLessons = AppState.lessons.filter(
                lesson => String(lesson.module_id) === String(item.id)
            );
            
            Utils.log(`  → Module has ${moduleLessons.length} lessons`);
            
            // Try each lesson for a thumbnail
            for (const lesson of moduleLessons) {
                // Check lesson's direct thumbnail
                if (this.isValidImageUrl(lesson.thumbnail_url)) {
                    Utils.log('  → Using lesson thumbnail_url');
                    return lesson.thumbnail_url;
                }
                
                // Try YouTube thumbnail from lesson video
                if (lesson.video_url) {
                    const ytThumbnail = YouTubeHelpers.getThumbnail(lesson.video_url);
                    if (ytThumbnail) {
                        Utils.log('  → Using lesson YouTube thumbnail');
                        return ytThumbnail;
                    }
                }
            }
            
            // Try parent course thumbnail
            const parentCourse = AppState.courses.find(
                course => String(course.id) === String(item.course_id)
            );
            if (parentCourse && this.isValidImageUrl(parentCourse.thumbnail_url)) {
                Utils.log('  → Using parent course thumbnail');
                return parentCourse.thumbnail_url;
            }
        }
        
        // Priority 4: For courses - try first module's first lesson
        if (type === 'course') {
            const courseModules = AppState.modules.filter(
                module => String(module.course_id) === String(item.id)
            );
            
            Utils.log(`  → Course has ${courseModules.length} modules`);
            
            for (const module of courseModules) {
                const moduleLessons = AppState.lessons.filter(
                    lesson => String(lesson.module_id) === String(module.id)
                );
                
                for (const lesson of moduleLessons) {
                    // Try YouTube thumbnail from lesson video
                    if (lesson.video_url) {
                        const ytThumbnail = YouTubeHelpers.getThumbnail(lesson.video_url);
                        if (ytThumbnail) {
                            Utils.log('  → Using nested lesson YouTube thumbnail');
                            return ytThumbnail;
                        }
                    }
                }
            }
        }
        
        // Priority 5: Generate placeholder
        Utils.log('  → Using generated placeholder');
        return this.generatePlaceholder(item.title);
    }
};

/* ================================================================
   6. PRICE HELPERS
   ================================================================ */
const PriceHelpers = {
    /**
     * Check if a price value represents "free"
     * @param {any} price - Price value
     * @returns {boolean} True if free
     */
    isFree(price) {
        if (price === null || price === undefined) return true;
        
        const priceStr = String(price).toLowerCase().trim();
        
        const freeValues = ['', '0', 'free', 'null', 'undefined', '-', 'n/a', 'none', 'nil'];
        return freeValues.includes(priceStr) || parseFloat(priceStr) === 0;
    },
    
    /**
     * Format price for display
     * @param {any} price - Price value
     * @returns {string} Formatted price string
     */
    format(price) {
        if (this.isFree(price)) {
            return 'FREE';
        }
        
        // Remove non-numeric characters except decimal point
        const cleanPrice = String(price).replace(/[^0-9.]/g, '');
        const numPrice = parseFloat(cleanPrice);
        
        if (isNaN(numPrice) || numPrice === 0) {
            return 'FREE';
        }
        
        // Format with Indian locale
        return `₹${numPrice.toLocaleString('en-IN')}`;
    },
    
    /**
     * Get price badge text
     * @param {any} price - Price value
     * @returns {string} Badge text
     */
    getBadgeText(price) {
        return this.isFree(price) ? 'FREE' : 'PREMIUM';
    },
    
    /**
     * Get price badge class
     * @param {any} price - Price value
     * @returns {string} CSS class
     */
    getBadgeClass(price) {
        return this.isFree(price) ? 'free' : 'paid';
    }
};

/* ================================================================
   7. GOOGLE SHEETS SERVICE
   ================================================================ */
const GoogleSheetsService = {
    /**
     * Build API URL for fetching sheet data
     * @param {string} sheetName - Name of the sheet
     * @returns {string} API URL
     */
    buildApiUrl(sheetName) {
        const { API_KEY, SPREADSHEET_ID } = CONFIG.GOOGLE_SHEETS;
        const encodedSheetName = encodeURIComponent(sheetName);
        return `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodedSheetName}?key=${API_KEY}`;
    },
    
    /**
     * Normalize column name to standard format
     * @param {string} name - Column name from sheet
     * @param {string} sheetType - Type of sheet (courses, modules, lessons)
     * @returns {string} Normalized column name
     */
    normalizeColumnName(name, sheetType = '') {
        if (!name) return '';
        
        // Convert to lowercase, replace spaces with underscores, remove special chars
        let normalized = name.toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');
        
        // Column name mappings
        const mappings = {
            // ID mappings
            'course_id': sheetType === 'courses' ? 'id' : 'course_id',
            'courseid': sheetType === 'courses' ? 'id' : 'course_id',
            'module_id': sheetType === 'modules' ? 'id' : 'module_id',
            'moduleid': sheetType === 'modules' ? 'id' : 'module_id',
            'lesson_id': 'id',
            'lessonid': 'id',
            
            // Title mappings
            'course_title': 'title',
            'coursetitle': 'title',
            'module_title': 'title',
            'moduletitle': 'title',
            'lesson_title': 'title',
            'lessontitle': 'title',
            'name': 'title',
            
            // Description mappings
            'course_description': 'description',
            'coursedescription': 'description',
            'module_description': 'description',
            'moduledescription': 'description',
            'lesson_description': 'description',
            'lessondescription': 'description',
            'desc': 'description',
            
            // Thumbnail mappings
            'thumbnail': 'thumbnail_url',
            'thumbnailurl': 'thumbnail_url',
            'image': 'thumbnail_url',
            'image_url': 'thumbnail_url',
            'imageurl': 'thumbnail_url',
            'img': 'thumbnail_url',
            'img_url': 'thumbnail_url',
            'imgurl': 'thumbnail_url',
            'course_image': 'thumbnail_url',
            'courseimage': 'thumbnail_url',
            'cover': 'thumbnail_url',
            'cover_image': 'thumbnail_url',
            'coverimage': 'thumbnail_url',
            'poster': 'thumbnail_url',
            
            // Video URL mappings
            'youtube_url': 'video_url',
            'youtubeurl': 'video_url',
            'youtube': 'video_url',
            'video': 'video_url',
            'videourl': 'video_url',
            'video_link': 'video_url',
            'videolink': 'video_url',
            'url': 'video_url',
            'link': 'video_url',
            
            // Price mappings
            'course_price': 'price',
            'courseprice': 'price',
            'cost': 'price',
            'amount': 'price',
            
            // Count mappings
            'total_modules': 'total_modules',
            'totalmodules': 'total_modules',
            'modules': 'total_modules',
            'module_count': 'total_modules',
            'modulecount': 'total_modules',
            'num_modules': 'total_modules',
            'nummodules': 'total_modules',
            
            'total_lessons': 'total_lessons',
            'totallessons': 'total_lessons',
            'lessons': 'total_lessons',
            'lesson_count': 'total_lessons',
            'lessoncount': 'total_lessons',
            'num_lessons': 'total_lessons',
            'numlessons': 'total_lessons'
        };
        
        return mappings[normalized] || normalized;
    },
    
    /**
     * Parse raw sheet data into array of objects
     * @param {Array} values - Raw values from API
     * @param {string} sheetType - Type of sheet
     * @returns {Array} Array of parsed objects
     */
    parseSheetData(values, sheetType = '') {
        if (!values || !Array.isArray(values) || values.length < 2) {
            Utils.log(`No data or only headers in ${sheetType} sheet`);
            return [];
        }
        
        // Get and normalize headers
        const rawHeaders = values[0];
        Utils.log(`Raw headers for ${sheetType}:`, rawHeaders);
        
        const headers = rawHeaders.map(h => this.normalizeColumnName(h, sheetType));
        Utils.log(`Normalized headers for ${sheetType}:`, headers);
        
        // Parse data rows
        const rows = values.slice(1);
        const parsedData = [];
        
        rows.forEach((row, rowIndex) => {
            const obj = {};
            let hasContent = false;
            
            headers.forEach((header, colIndex) => {
                const value = row[colIndex];
                const cleanValue = value !== undefined && value !== null 
                    ? String(value).trim() 
                    : '';
                
                obj[header] = cleanValue;
                
                if (cleanValue !== '') {
                    hasContent = true;
                }
            });
            
            // Only add rows that have some content
            if (hasContent) {
                // Ensure ID exists
                if (!obj.id && rowIndex >= 0) {
                    obj.id = String(rowIndex + 1);
                }
                parsedData.push(obj);
            }
        });
        
        Utils.log(`Parsed ${parsedData.length} rows from ${sheetType}`);
        return parsedData;
    },
    
    /**
     * Fetch a single sheet from Google Sheets
     * @param {string} sheetName - Name of the sheet
     * @returns {Promise<Array>} Array of parsed data
     */
    async fetchSheet(sheetName) {
        const url = this.buildApiUrl(sheetName);
        Utils.log(`Fetching sheet: ${sheetName}`);
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorText = await response.text();
                Utils.error(`Failed to fetch ${sheetName}:`, response.status, errorText);
                throw new Error(`Failed to fetch ${sheetName}: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.values) {
                Utils.log(`No values in ${sheetName} response`);
                return [];
            }
            
            // Determine sheet type for column name normalization
            const sheetType = sheetName.toLowerCase().replace(/s$/, '');
            
            return this.parseSheetData(data.values, sheetType);
            
        } catch (error) {
            Utils.error(`Error fetching ${sheetName}:`, error);
            throw error;
        }
    },
    
    /**
     * Process courses data
     * @param {Array} courses - Raw courses data
     * @returns {Array} Processed courses
     */
    processCourses(courses) {
        return courses.map((course, index) => ({
            id: String(course.id || index + 1),
            title: course.title || 'Untitled Course',
            description: course.description || '',
            thumbnail_url: course.thumbnail_url || '',
            price: course.price || 'free',
            total_modules: parseInt(course.total_modules) || 0
        }));
    },
    
    /**
     * Process modules data
     * @param {Array} modules - Raw modules data
     * @returns {Array} Processed modules
     */
    processModules(modules) {
        return modules.map((module, index) => ({
            id: String(module.id || index + 1),
            course_id: String(module.course_id || ''),
            title: module.title || 'Untitled Module',
            description: module.description || '',
            total_lessons: parseInt(module.total_lessons) || 0,
            thumbnail_url: module.thumbnail_url || module.image || ''
        }));
    },
    
    /**
     * Process lessons data
     * @param {Array} lessons - Raw lessons data
     * @returns {Array} Processed lessons
     */
    processLessons(lessons) {
        return lessons.map((lesson, index) => ({
            id: String(lesson.id || index + 1),
            module_id: String(lesson.module_id || ''),
            title: lesson.title || 'Untitled Lesson',
            description: lesson.description || '',
            video_url: lesson.video_url || '',
            duration: lesson.duration || '',
            thumbnail_url: lesson.thumbnail_url || ''
        }));
    },
    
    /**
     * Fetch all data from Google Sheets
     * @returns {Promise<Object>} Object with courses, modules, lessons
     */
    async fetchAllData() {
        const { SHEETS } = CONFIG.GOOGLE_SHEETS;
        
        Utils.log('Starting to fetch all data from Google Sheets...');
        
        try {
            // Fetch all sheets in parallel
            const [coursesRaw, modulesRaw, lessonsRaw] = await Promise.all([
                this.fetchSheet(SHEETS.COURSES),
                this.fetchSheet(SHEETS.MODULES),
                this.fetchSheet(SHEETS.LESSONS)
            ]);
            
            // Process the data
            const courses = this.processCourses(coursesRaw);
            const modules = this.processModules(modulesRaw);
            const lessons = this.processLessons(lessonsRaw);
            
            Utils.log('Data fetched successfully:');
            Utils.log(`  - ${courses.length} courses`);
            Utils.log(`  - ${modules.length} modules`);
            Utils.log(`  - ${lessons.length} lessons`);
            
            return { courses, modules, lessons };
            
        } catch (error) {
            Utils.error('Failed to fetch data from Google Sheets:', error);
            throw error;
        }
    }
};

/* ================================================================
   8. DOM MANAGER
   ================================================================ */
const DOMManager = {
    /**
     * Cache all required DOM elements
     */
    cacheElements() {
        AppState.elements = {
            // Loader
            loader: Utils.$('loader'),
            
            // App
            app: Utils.$('app'),
            
            // Error screen
            errorScreen: Utils.$('error-screen'),
            errorMessage: Utils.$('error-message'),
            retryBtn: Utils.$('btn-retry'),
            
            // Header / Navigation
            header: Utils.$('header'),
            breadcrumb: Utils.$('breadcrumb'),
            navHome: Utils.$('nav-home'),
            navCourse: Utils.$('nav-course'),
            navCourseText: Utils.$('nav-course-text'),
            navModule: Utils.$('nav-module'),
            navModuleText: Utils.$('nav-module-text'),
            navArrow1: Utils.$('nav-arrow-1'),
            navArrow2: Utils.$('nav-arrow-2'),
            themeToggle: Utils.$('theme-toggle'),
            
            // Left Panel - Details
            panelLeft: Utils.$('panel-left'),
            detailBadge: Utils.$('detail-badge'),
            detailTitle: Utils.$('detail-title'),
            detailDesc: Utils.$('detail-desc'),
            statsGrid: Utils.$('stats-grid'),
            stat1: Utils.$('stat-1'),
            stat1Label: Utils.$('stat-1-label'),
            stat2: Utils.$('stat-2'),
            stat2Label: Utils.$('stat-2-label'),
            stat3: Utils.$('stat-3'),
            stat3Label: Utils.$('stat-3-label'),
            priceSection: Utils.$('price-section'),
            priceAmount: Utils.$('price-amount'),
            priceBadge: Utils.$('price-badge'),
            btnAction: Utils.$('btn-action'),
            btnActionText: Utils.$('btn-action-text'),
            btnActionIcon: Utils.$('btn-action-icon'),
            paymentSection: Utils.$('payment-section'),
            btnPayment: Utils.$('btn-payment'),
            
            // Center Panel - Featured
            panelCenter: Utils.$('panel-center'),
            featuredContainer: Utils.$('featured-container'),
            featuredCard: Utils.$('featured-card'),
            featuredImage: Utils.$('featured-image'),
            featuredPlayBtn: Utils.$('featured-play-btn'),
            floatBadge1: Utils.$('float-badge-1'),
            floatBadge2: Utils.$('float-badge-2'),
            floatText1: Utils.$('float-text-1'),
            floatText2: Utils.$('float-text-2'),
            scrollHint: Utils.$('scroll-hint'),
            
            // Video
            videoContainer: Utils.$('video-container'),
            videoIframe: Utils.$('video-iframe'),
            videoTitle: Utils.$('video-title'),
            videoCloseBtn: Utils.$('video-close-btn'),
            btnFullscreen: Utils.$('btn-fullscreen'),
            
            // Right Panel - Selector
            panelRight: Utils.$('panel-right'),
            selectorTitle: Utils.$('selector-title'),
            selectorCount: Utils.$('selector-count'),
            selectorWrapper: Utils.$('selector-wrapper'),
            selectorList: Utils.$('selector-list'),
            pagination: Utils.$('pagination'),
            currentPage: Utils.$('current-page'),
            totalPages: Utils.$('total-pages'),
            btnPrev: Utils.$('btn-prev'),
            btnNext: Utils.$('btn-next'),
            
            // Toast
            toastContainer: Utils.$('toast-container')
        };
        
        Utils.log('DOM elements cached');
    },
    
    /**
     * Check if all required elements exist
     * @returns {boolean} True if all elements exist
     */
    validateElements() {
        const required = ['loader', 'app', 'selectorList', 'featuredImage', 'detailTitle'];
        
        for (const key of required) {
            if (!AppState.elements[key]) {
                Utils.error(`Required element not found: ${key}`);
                return false;
            }
        }
        
        return true;
    }
};

/* ================================================================
   9. UI MANAGER
   ================================================================ */
const UIManager = {
    /**
     * Show loading screen
     */
    showLoader() {
        const { loader, app, errorScreen } = AppState.elements;
        
        if (loader) loader.classList.remove('hidden');
        if (app) app.classList.remove('visible');
        if (errorScreen) errorScreen.classList.add('hidden');
        
        AppState.isLoading = true;
    },
    
    /**
     * Hide loading screen and show app
     */
    hideLoader() {
        const { loader, app } = AppState.elements;
        
        if (loader) {
            loader.classList.add('hidden');
        }
        
        if (app) {
            app.classList.add('visible');
        }
        
        AppState.isLoading = false;
    },
    
    /**
     * Show error screen
     * @param {string} message - Error message
     */
    showError(message) {
        const { loader, app, errorScreen, errorMessage } = AppState.elements;
        
        if (loader) loader.classList.add('hidden');
        if (app) app.classList.remove('visible');
        if (errorScreen) errorScreen.classList.remove('hidden');
        if (errorMessage) errorMessage.textContent = message;
        
        AppState.hasError = true;
    },
    
    /**
     * Hide error screen
     */
    hideError() {
        const { errorScreen } = AppState.elements;
        
        if (errorScreen) errorScreen.classList.add('hidden');
        
        AppState.hasError = false;
    },
    
    /**
     * Animate element with GSAP
     * @param {HTMLElement} element - Element to animate
     * @param {object} props - Animation properties
     * @param {object} options - Animation options
     */
    animate(element, props, options = {}) {
        if (!element) return;
        
        const defaults = {
            duration: 0.3,
            ease: 'power2.out'
        };
        
        if (typeof gsap !== 'undefined') {
            gsap.to(element, { ...defaults, ...props, ...options });
        }
    },
    
    /**
     * Animate element from values
     * @param {HTMLElement} element - Element to animate
     * @param {object} fromProps - Starting properties
     * @param {object} toProps - Ending properties
     * @param {object} options - Animation options
     */
    animateFrom(element, fromProps, toProps, options = {}) {
        if (!element) return;
        
        const defaults = {
            duration: 0.4,
            ease: 'power2.out'
        };
        
        if (typeof gsap !== 'undefined') {
            gsap.fromTo(element, fromProps, { ...defaults, ...toProps, ...options });
        }
    }
};

/* ================================================================
   10. TOAST MANAGER
   ================================================================ */
const ToastManager = {
    /**
     * Show a toast notification
     * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
     * @param {string} title - Toast title
     * @param {string} message - Toast message (optional)
     */
    show(type, title, message = '') {
        const { toastContainer } = AppState.elements;
        if (!toastContainer) return;
        
        // Icon mapping
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            <button class="toast-close" aria-label="Close">×</button>
        `;
        
        // Add close handler
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.remove(toast));
        }
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Auto remove after duration
        setTimeout(() => {
            this.remove(toast);
        }, CONFIG.APP.TOAST_DURATION);
        
        Utils.log(`Toast shown: ${type} - ${title}`);
    },
    
    /**
     * Remove a toast
     * @param {HTMLElement} toast - Toast element
     */
    remove(toast) {
        if (!toast) return;
        
        toast.classList.add('removing');
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    },
    
    /**
     * Show success toast
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     */
    success(title, message = '') {
        this.show('success', title, message);
    },
    
    /**
     * Show error toast
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     */
    error(title, message = '') {
        this.show('error', title, message);
    },
    
    /**
     * Show warning toast
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     */
    warning(title, message = '') {
        this.show('warning', title, message);
    },
    
    /**
     * Show info toast
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     */
    info(title, message = '') {
        this.show('info', title, message);
    }
};

/* ================================================================
   11. NAVIGATION MANAGER
   ================================================================ */
const NavigationManager = {
    /**
     * Update breadcrumb navigation
     */
    updateBreadcrumb() {
        const {
            navHome, navCourse, navModule,
            navCourseText, navModuleText,
            navArrow1, navArrow2
        } = AppState.elements;
        
        const { currentView, selectedCourse, selectedModule } = AppState;
        
        // Reset all
        [navCourse, navModule, navArrow1, navArrow2].forEach(el => {
            if (el) el.classList.add('hidden');
        });
        
        [navHome, navCourse, navModule].forEach(el => {
            if (el) el.classList.remove('active');
        });
        
        // Set based on current view
        switch (currentView) {
            case 'home':
                if (navHome) navHome.classList.add('active');
                break;
                
            case 'course':
                if (navArrow1) navArrow1.classList.remove('hidden');
                if (navCourse) {
                    navCourse.classList.remove('hidden');
                    navCourse.classList.add('active');
                }
                if (navCourseText && selectedCourse) {
                    navCourseText.textContent = Utils.truncate(selectedCourse.title, 20);
                }
                break;
                
            case 'module':
                if (navArrow1) navArrow1.classList.remove('hidden');
                if (navArrow2) navArrow2.classList.remove('hidden');
                if (navCourse) navCourse.classList.remove('hidden');
                if (navModule) {
                    navModule.classList.remove('hidden');
                    navModule.classList.add('active');
                }
                if (navCourseText && selectedCourse) {
                    navCourseText.textContent = Utils.truncate(selectedCourse.title, 15);
                }
                if (navModuleText && selectedModule) {
                    navModuleText.textContent = Utils.truncate(selectedModule.title, 15);
                }
                break;
        }
    },
    
    /**
     * Navigate to home (all courses)
     */
    goToHome() {
        Utils.log('Navigating to Home');
        
        AppState.previousView = AppState.currentView;
        AppState.currentView = 'home';
        AppState.selectedModule = null;
        AppState.selectedLesson = null;
        AppState.currentIndex = 0;
        
        // Close video if playing
        VideoManager.close();
        
        // Update UI
        this.updateBreadcrumb();
        SelectorManager.render(AppState.courses, 'course', 'All Courses');
        
        // Select first course
        if (AppState.courses.length > 0) {
            AppState.selectedCourse = AppState.courses[0];
            DetailsManager.update(AppState.selectedCourse, 'course');
        }
        
        // Animate transition
        this.animateTransition();
    },
    
    /**
     * Navigate to a course (show modules)
     * @param {object} course - Course object
     */
    goToCourse(course) {
        if (!course) return;
        
        Utils.log('Navigating to Course:', course.title);
        
        // Get modules for this course
        const courseModules = AppState.modules.filter(
            m => String(m.course_id) === String(course.id)
        );
        
        if (courseModules.length === 0) {
            ToastManager.info('No Modules', 'This course has no modules yet');
            return;
        }
        
        AppState.previousView = AppState.currentView;
        AppState.currentView = 'course';
        AppState.selectedCourse = course;
        AppState.selectedModule = null;
        AppState.selectedLesson = null;
        AppState.currentIndex = 0;
        
        // Close video if playing
        VideoManager.close();
        
        // Update UI
        this.updateBreadcrumb();
        SelectorManager.render(courseModules, 'module', `${Utils.truncate(course.title, 25)} - Modules`);
        
        // Select first module
        AppState.selectedModule = courseModules[0];
        DetailsManager.update(courseModules[0], 'module');
        
        // Animate transition
        this.animateTransition();
    },
    
    /**
     * Navigate to a module (show lessons)
     * @param {object} module - Module object
     */
    goToModule(module) {
        if (!module) return;
        
        Utils.log('Navigating to Module:', module.title);
        
        // Check if course is accessible
        if (!PriceHelpers.isFree(AppState.selectedCourse?.price) && 
            !AppState.purchasedCourses.includes(String(AppState.selectedCourse?.id))) {
            ToastManager.warning('Premium Content', 'Purchase this course to access lessons');
            return;
        }
        
        // Get lessons for this module
        const moduleLessons = AppState.lessons.filter(
            l => String(l.module_id) === String(module.id)
        );
        
        if (moduleLessons.length === 0) {
            ToastManager.info('No Lessons', 'This module has no lessons yet');
            return;
        }
        
        AppState.previousView = AppState.currentView;
        AppState.currentView = 'module';
        AppState.selectedModule = module;
        AppState.selectedLesson = null;
        AppState.currentIndex = 0;
        
        // Update UI
        this.updateBreadcrumb();
        SelectorManager.render(moduleLessons, 'lesson', `${Utils.truncate(module.title, 25)} - Lessons`);
        
        // Select first lesson
        AppState.selectedLesson = moduleLessons[0];
        DetailsManager.update(moduleLessons[0], 'lesson');
        
        // Animate transition
        this.animateTransition();
    },
    
    /**
     * Go back one level
     */
    goBack() {
        switch (AppState.currentView) {
            case 'module':
                this.goToCourse(AppState.selectedCourse);
                break;
            case 'course':
                this.goToHome();
                break;
            default:
                // Already at home
                break;
        }
    },
    
    /**
     * Animate view transition
     */
    animateTransition() {
        const { panelLeft, panelRight, featuredCard } = AppState.elements;
        
        if (typeof gsap === 'undefined') return;
        
        // Animate panels
        if (panelLeft) {
            gsap.fromTo(panelLeft, 
                { opacity: 0.5, x: -30 },
                { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }
            );
        }
        
        if (panelRight) {
            gsap.fromTo(panelRight,
                { opacity: 0.5, x: 30 },
                { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out', delay: 0.1 }
            );
        }
        
        if (featuredCard) {
            gsap.fromTo(featuredCard,
                { opacity: 0.5, scale: 0.95 },
                { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.7)', delay: 0.05 }
            );
        }
    }
};

/* ================================================================
   12. VIDEO MANAGER
   ================================================================ */
const VideoManager = {
    /**
     * Play a video
     * @param {object} lesson - Lesson object with video_url
     */
    play(lesson) {
        if (!lesson || !lesson.video_url) {
            ToastManager.error('Error', 'No video available for this lesson');
            return;
        }
        
        Utils.log('Playing video:', lesson.title, lesson.video_url);
        
        // Get embed URL
        const embedUrl = YouTubeHelpers.getEmbedUrl(lesson.video_url);
        
        if (!embedUrl) {
            ToastManager.error('Error', 'Invalid video URL');
            return;
        }
        
        const { 
            featuredContainer, videoContainer, 
            videoIframe, videoTitle, scrollHint 
        } = AppState.elements;
        
        // Set video source and title
        if (videoIframe) {
            videoIframe.src = embedUrl;
        }
        if (videoTitle) {
            videoTitle.textContent = lesson.title;
        }
        
        // Hide featured image, show video
        if (featuredContainer) featuredContainer.classList.add('hidden');
        if (videoContainer) videoContainer.classList.remove('hidden');
        if (scrollHint) scrollHint.classList.add('hidden');
        
        AppState.isVideoPlaying = true;
        
        // Animate video container in
        if (typeof gsap !== 'undefined' && videoContainer) {
            gsap.fromTo(videoContainer,
                { opacity: 0, scale: 0.9 },
                { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.7)' }
            );
        }
        
        ToastManager.success('Now Playing', lesson.title);
    },
    
    /**
     * Close video player
     */
    close() {
        if (!AppState.isVideoPlaying) return;
        
        Utils.log('Closing video player');
        
        const { 
            featuredContainer, videoContainer, 
            videoIframe, scrollHint 
        } = AppState.elements;
        
        // Stop video
        if (videoIframe) {
            videoIframe.src = '';
        }
        
        // Show featured image, hide video
        if (videoContainer) videoContainer.classList.add('hidden');
        if (featuredContainer) featuredContainer.classList.remove('hidden');
        if (scrollHint) scrollHint.classList.remove('hidden');
        
        AppState.isVideoPlaying = false;
        
        // Animate featured container back
        if (typeof gsap !== 'undefined' && featuredContainer) {
            gsap.fromTo(featuredContainer,
                { opacity: 0, scale: 0.95 },
                { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.7)' }
            );
        }
    },
    
    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        const { videoContainer } = AppState.elements;
        
        if (!videoContainer) return;
        
        const videoWrapper = videoContainer.querySelector('.video-player-wrapper');
        
        if (!videoWrapper) return;
        
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => {
                Utils.error('Error exiting fullscreen:', err);
            });
        } else {
            videoWrapper.requestFullscreen().catch(err => {
                ToastManager.error('Fullscreen Error', err.message);
            });
        }
    }
};

/* ================================================================
   13. SELECTOR MANAGER
   ================================================================ */
const SelectorManager = {
    items: [],
    itemType: 'course',
    
    /**
     * Render selector list
     * @param {Array} items - Items to render
     * @param {string} type - Item type: 'course', 'module', 'lesson'
     * @param {string} title - Selector title
     */
    render(items, type, title) {
        this.items = items;
        this.itemType = type;
        
        const { selectorList, selectorTitle, selectorCount } = AppState.elements;
        
        // Update header
        if (selectorTitle) {
            selectorTitle.textContent = title;
        }
        if (selectorCount) {
            selectorCount.textContent = `${items.length} ${items.length === 1 ? 'item' : 'items'}`;
        }
        
        // Clear list
        if (selectorList) {
            selectorList.innerHTML = '';
            
            // Render items
            items.forEach((item, index) => {
                const element = this.createItemElement(item, type, index);
                selectorList.appendChild(element);
            });
        }
        
        // Update pagination
        this.updatePagination();
        
        Utils.log(`Selector rendered: ${items.length} ${type}s`);
    },
    
    /**
     * Create a selector item element
     * @param {object} item - Item data
     * @param {string} type - Item type
     * @param {number} index - Item index
     * @returns {HTMLElement} Item element
     */
    createItemElement(item, type, index) {
        const element = document.createElement('div');
        element.className = `selector-item ${index === AppState.currentIndex ? 'active' : ''}`;
        element.dataset.index = index;
        element.dataset.id = item.id;
        
        // Get thumbnail
        const thumbnail = ThumbnailHelpers.getThumbnail(item, type);
        
        // Get meta info based on type
        let metaText = '';
        let badge = '';
        
        switch (type) {
            case 'course':
                const moduleCount = AppState.modules.filter(
                    m => String(m.course_id) === String(item.id)
                ).length;
                metaText = `${moduleCount} module${moduleCount !== 1 ? 's' : ''}`;
                
                const isFree = PriceHelpers.isFree(item.price);
                badge = `<span class="selector-item-badge ${isFree ? '' : 'paid'}">${isFree ? 'FREE' : '₹' + item.price}</span>`;
                break;
                
            case 'module':
                const lessonCount = AppState.lessons.filter(
                    l => String(l.module_id) === String(item.id)
                ).length;
                metaText = `${lessonCount} lesson${lessonCount !== 1 ? 's' : ''}`;
                break;
                
            case 'lesson':
                metaText = item.duration || 'Video';
                break;
        }
        
        element.innerHTML = `
            <div class="selector-item-thumb">
                <img src="${thumbnail}" alt="${item.title}" loading="lazy" 
                     onerror="this.src='${ThumbnailHelpers.generatePlaceholder(item.title)}'">
            </div>
            <div class="selector-item-info">
                <div class="selector-item-title">${item.title || 'Untitled'}</div>
                <div class="selector-item-meta">
                    ${metaText}
                    ${badge}
                </div>
            </div>
        `;
        
        // Add click handler
        element.addEventListener('click', () => {
            this.selectItem(index);
        });
        
        return element;
    },
    
    /**
     * Select an item
     * @param {number} index - Item index
     */
    selectItem(index) {
        if (index < 0 || index >= this.items.length) return;
        
        const previousIndex = AppState.currentIndex;
        AppState.currentIndex = index;
        
        const item = this.items[index];
        
        // Update active state in UI
        const { selectorList } = AppState.elements;
        if (selectorList) {
            const items = selectorList.querySelectorAll('.selector-item');
            items.forEach((el, i) => {
                el.classList.toggle('active', i === index);
            });
            
            // Scroll item into view
            if (items[index]) {
                items[index].scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest' 
                });
            }
        }
        
        // Update pagination
        this.updatePagination();
        
        // Update based on type
        switch (this.itemType) {
            case 'course':
                AppState.selectedCourse = item;
                DetailsManager.update(item, 'course');
                break;
            case 'module':
                AppState.selectedModule = item;
                DetailsManager.update(item, 'module');
                break;
            case 'lesson':
                AppState.selectedLesson = item;
                DetailsManager.update(item, 'lesson');
                break;
        }
        
        Utils.log(`Selected ${this.itemType}:`, item.title);
    },
    
    /**
     * Navigate to previous item
     */
    prev() {
        if (AppState.currentIndex > 0) {
            this.selectItem(AppState.currentIndex - 1);
        }
    },
    
    /**
     * Navigate to next item
     */
    next() {
        if (AppState.currentIndex < this.items.length - 1) {
            this.selectItem(AppState.currentIndex + 1);
        }
    },
    
    /**
     * Update pagination display
     */
    updatePagination() {
        const { currentPage, totalPages, btnPrev, btnNext } = AppState.elements;
        
        if (currentPage) {
            currentPage.textContent = AppState.currentIndex + 1;
        }
        if (totalPages) {
            totalPages.textContent = this.items.length;
        }
        
        // Update button states
        if (btnPrev) {
            btnPrev.disabled = AppState.currentIndex === 0;
        }
        if (btnNext) {
            btnNext.disabled = AppState.currentIndex >= this.items.length - 1;
        }
    },
    
    /**
     * Handle double-click on item (navigate to it)
     */
    activateCurrentItem() {
        const item = this.items[AppState.currentIndex];
        if (!item) return;
        
        switch (this.itemType) {
            case 'course':
                NavigationManager.goToCourse(item);
                break;
            case 'module':
                NavigationManager.goToModule(item);
                break;
            case 'lesson':
                VideoManager.play(item);
                break;
        }
    }
};

/* ================================================================
   14. DETAILS MANAGER
   ================================================================ */
const DetailsManager = {
    /**
     * Update details panel with item information
     * @param {object} item - Item data
     * @param {string} type - Item type
     */
    update(item, type) {
        if (!item) return;
        
        Utils.log(`Updating details for ${type}:`, item.title);
        
        // Update badge
        this.updateBadge(type);
        
        // Update title and description
        this.updateTitleAndDesc(item);
        
        // Update stats
        this.updateStats(item, type);
        
        // Update price (only for courses)
        this.updatePrice(item, type);
        
        // Update action button
        this.updateActionButton(type);
        
        // Update payment section
        this.updatePaymentSection(item, type);
        
        // Update featured image
        this.updateFeaturedImage(item, type);
        
        // Update floating badges
        this.updateFloatingBadges(item, type);
        
        // Animate the update
        this.animateUpdate();
    },
    
    /**
     * Update badge
     * @param {string} type - Item type
     */
    updateBadge(type) {
        const { detailBadge } = AppState.elements;
        if (!detailBadge) return;
        
        const badges = {
            course: { icon: '📚', text: 'Course' },
            module: { icon: '📖', text: 'Module' },
            lesson: { icon: '🎬', text: 'Lesson' }
        };
        
        const badge = badges[type] || badges.course;
        
        detailBadge.innerHTML = `
            <span class="badge-icon">${badge.icon}</span>
            <span class="badge-text">${badge.text}</span>
        `;
    },
    
    /**
     * Update title and description
     * @param {object} item - Item data
     */
    updateTitleAndDesc(item) {
        const { detailTitle, detailDesc } = AppState.elements;
        
        if (detailTitle) {
            detailTitle.textContent = item.title || 'Untitled';
        }
        
        if (detailDesc) {
            detailDesc.textContent = item.description || 'No description available.';
        }
    },
    
    /**
     * Update stats grid
     * @param {object} item - Item data
     * @param {string} type - Item type
     */
    updateStats(item, type) {
        const { stat1, stat1Label, stat2, stat2Label, stat3, stat3Label } = AppState.elements;
        
        switch (type) {
            case 'course':
                const courseModules = AppState.modules.filter(
                    m => String(m.course_id) === String(item.id)
                );
                let totalLessons = 0;
                courseModules.forEach(m => {
                    totalLessons += AppState.lessons.filter(
                        l => String(l.module_id) === String(m.id)
                    ).length;
                });
                
                if (stat1) stat1.textContent = courseModules.length;
                if (stat1Label) stat1Label.textContent = 'Modules';
                if (stat2) stat2.textContent = totalLessons;
                if (stat2Label) stat2Label.textContent = 'Lessons';
                if (stat3) stat3.textContent = totalLessons > 0 ? `~${totalLessons * 15}m` : '-';
                if (stat3Label) stat3Label.textContent = 'Duration';
                break;
                
            case 'module':
                const moduleLessons = AppState.lessons.filter(
                    l => String(l.module_id) === String(item.id)
                );
                
                // Calculate total duration
                let totalSeconds = 0;
                moduleLessons.forEach(lesson => {
                    if (lesson.duration) {
                        const parts = lesson.duration.split(':').map(Number);
                        if (parts.length === 2) {
                            totalSeconds += parts[0] * 60 + parts[1];
                        } else if (parts.length === 3) {
                            totalSeconds += parts[0] * 3600 + parts[1] * 60 + parts[2];
                        }
                    }
                });
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const durationText = hours > 0 ? `${hours}h ${minutes}m` : minutes > 0 ? `${minutes}m` : '-';
                
                if (stat1) stat1.textContent = moduleLessons.length;
                if (stat1Label) stat1Label.textContent = 'Lessons';
                if (stat2) stat2.textContent = durationText;
                if (stat2Label) stat2Label.textContent = 'Duration';
                if (stat3) stat3.textContent = '▶';
                if (stat3Label) stat3Label.textContent = 'Play';
                break;
                
            case 'lesson':
                if (stat1) stat1.textContent = item.duration || '-';
                if (stat1Label) stat1Label.textContent = 'Duration';
                if (stat2) stat2.textContent = 'HD';
                if (stat2Label) stat2Label.textContent = 'Quality';
                if (stat3) stat3.textContent = '▶';
                if (stat3Label) stat3Label.textContent = 'Play';
                break;
        }
    },
    
    /**
     * Update price section
     * @param {object} item - Item data
     * @param {string} type - Item type
     */
    updatePrice(item, type) {
        const { priceSection, priceAmount, priceBadge } = AppState.elements;
        
        if (type !== 'course') {
            if (priceSection) priceSection.style.display = 'none';
            return;
        }
        
        if (priceSection) priceSection.style.display = 'flex';
        
        const isFree = PriceHelpers.isFree(item.price);
        const isPurchased = AppState.purchasedCourses.includes(String(item.id));
        
        if (priceAmount) {
            if (isPurchased) {
                priceAmount.textContent = 'OWNED';
            } else {
                priceAmount.textContent = PriceHelpers.format(item.price);
            }
        }
        
        if (priceBadge) {
            if (isPurchased) {
                priceBadge.textContent = '✓ PURCHASED';
                priceBadge.className = 'price-badge owned';
            } else if (isFree) {
                priceBadge.textContent = 'FREE';
                priceBadge.className = 'price-badge free';
            } else {
                priceBadge.textContent = 'PREMIUM';
                priceBadge.className = 'price-badge paid';
            }
        }
    },
    
    /**
     * Update action button
     * @param {string} type - Item type
     */
    updateActionButton(type) {
        const { btnActionText, btnActionIcon, featuredPlayBtn } = AppState.elements;
        
        const actions = {
            course: { text: 'View Modules', icon: '→' },
            module: { text: 'View Lessons', icon: '→' },
            lesson: { text: 'Play Video', icon: '▶' }
        };
        
        // Check if course is locked
        if (type === 'module' && AppState.selectedCourse) {
            const isFree = PriceHelpers.isFree(AppState.selectedCourse.price);
            const isPurchased = AppState.purchasedCourses.includes(String(AppState.selectedCourse.id));
            
            if (!isFree && !isPurchased) {
                if (btnActionText) btnActionText.textContent = 'Unlock Course';
                if (btnActionIcon) btnActionIcon.textContent = '🔒';
                return;
            }
        }
        
        const action = actions[type] || actions.course;
        
        if (btnActionText) btnActionText.textContent = action.text;
        if (btnActionIcon) btnActionIcon.textContent = action.icon;
        
        // Show/hide play button on featured image
        if (featuredPlayBtn) {
            if (type === 'lesson') {
                featuredPlayBtn.classList.remove('hidden');
            } else {
                featuredPlayBtn.classList.add('hidden');
            }
        }
    },
    
    /**
     * Update payment section
     * @param {object} item - Item data
     * @param {string} type - Item type
     */
    updatePaymentSection(item, type) {
        const { paymentSection } = AppState.elements;
        
        if (!paymentSection) return;
        
        if (type !== 'course') {
            paymentSection.classList.add('hidden');
            return;
        }
        
        const isFree = PriceHelpers.isFree(item.price);
        const isPurchased = AppState.purchasedCourses.includes(String(item.id));
        
        if (!isFree && !isPurchased) {
            paymentSection.classList.remove('hidden');
        } else {
            paymentSection.classList.add('hidden');
        }
    },
    
    /**
     * Update featured image
     * @param {object} item - Item data
     * @param {string} type - Item type
     */
    updateFeaturedImage(item, type) {
        const { featuredImage } = AppState.elements;
        
        if (!featuredImage) return;
        
        const thumbnail = ThumbnailHelpers.getThumbnail(item, type);
        
        // Animate image change
        if (typeof gsap !== 'undefined') {
            gsap.to(featuredImage, {
                opacity: 0,
                scale: 0.95,
                duration: 0.15,
                onComplete: () => {
                    featuredImage.src = thumbnail;
                    featuredImage.onerror = () => {
                        featuredImage.src = ThumbnailHelpers.generatePlaceholder(item.title);
                    };
                    
                    gsap.to(featuredImage, {
                        opacity: 1,
                        scale: 1,
                        duration: 0.25,
                        ease: 'back.out(1.7)'
                    });
                }
            });
        } else {
            featuredImage.src = thumbnail;
            featuredImage.onerror = () => {
                featuredImage.src = ThumbnailHelpers.generatePlaceholder(item.title);
            };
        }
    },
    
    /**
     * Update floating badges
     * @param {object} item - Item data
     * @param {string} type - Item type
     */
    updateFloatingBadges(item, type) {
        const { floatText1, floatText2 } = AppState.elements;
        
        switch (type) {
            case 'course':
                const isFree = PriceHelpers.isFree(item.price);
                const moduleCount = AppState.modules.filter(
                    m => String(m.course_id) === String(item.id)
                ).length;
                
                if (floatText1) floatText1.textContent = isFree ? 'Free Course' : 'Premium';
                if (floatText2) floatText2.textContent = `${moduleCount} Modules`;
                break;
                
            case 'module':
                const lessonCount = AppState.lessons.filter(
                    l => String(l.module_id) === String(item.id)
                ).length;
                
                if (floatText1) floatText1.textContent = `${lessonCount} Lessons`;
                if (floatText2) floatText2.textContent = 'Click to explore';
                break;
                
            case 'lesson':
                if (floatText1) floatText1.textContent = item.duration || 'Video';
                if (floatText2) floatText2.textContent = 'Click to play';
                break;
        }
    },
    
    /**
     * Animate details update
     */
    animateUpdate() {
        const { detailTitle, detailDesc, statsGrid } = AppState.elements;
        
        if (typeof gsap === 'undefined') return;
        
        const elements = [detailTitle, detailDesc, statsGrid].filter(Boolean);
        
        gsap.fromTo(elements,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out' }
        );
    }
};

/* ================================================================
   15. THEME MANAGER
   ================================================================ */
const ThemeManager = {
    /**
     * Initialize theme from storage or default
     */
    init() {
        const savedTheme = localStorage.getItem(CONFIG.APP.STORAGE.THEME);
        const theme = savedTheme || CONFIG.APP.DEFAULT_THEME;
        this.set(theme);
    },
    
    /**
     * Set theme
     * @param {string} theme - 'dark' or 'light'
     */
    set(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(CONFIG.APP.STORAGE.THEME, theme);
        AppState.currentTheme = theme;
        
        Utils.log(`Theme set to: ${theme}`);
    },
    
    /**
     * Toggle between dark and light theme
     */
    toggle() {
        const newTheme = AppState.currentTheme === 'dark' ? 'light' : 'dark';
        this.set(newTheme);
        ToastManager.info('Theme Changed', `Switched to ${newTheme} mode`);
    },
    
    /**
     * Get current theme
     * @returns {string} Current theme
     */
    get() {
        return AppState.currentTheme;
    }
};

/* ================================================================
   16. EVENT HANDLERS
   ================================================================ */
const EventHandlers = {
    /**
     * Set up all event listeners
     */
    init() {
        this.setupNavigationEvents();
        this.setupActionEvents();
        this.setupVideoEvents();
        this.setupKeyboardEvents();
        this.setupThemeEvents();
        
        Utils.log('Event handlers initialized');
    },
    
    /**
     * Set up navigation event listeners
     */
    setupNavigationEvents() {
        const { navHome, navCourse, btnPrev, btnNext, retryBtn } = AppState.elements;
        
        // Breadcrumb navigation
        if (navHome) {
            navHome.addEventListener('click', () => {
                NavigationManager.goToHome();
            });
        }
        
        if (navCourse) {
            navCourse.addEventListener('click', () => {
                if (AppState.selectedCourse) {
                    NavigationManager.goToCourse(AppState.selectedCourse);
                }
            });
        }
        
        // Selector navigation
        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                SelectorManager.prev();
            });
        }
        
        if (btnNext) {
            btnNext.addEventListener('click', () => {
                SelectorManager.next();
            });
        }
        
        // Retry button
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                App.init();
            });
        }
    },
    
    /**
     * Set up action button events
     */
    setupActionEvents() {
        const { btnAction, featuredCard, featuredPlayBtn, btnPayment } = AppState.elements;
        
        // Main action button
        if (btnAction) {
            btnAction.addEventListener('click', () => {
                this.handleActionButtonClick();
            });
        }
        
        // Featured card click
        if (featuredCard) {
            featuredCard.addEventListener('click', () => {
                if (AppState.currentView === 'module' && AppState.selectedLesson) {
                    VideoManager.play(AppState.selectedLesson);
                } else {
                    this.handleActionButtonClick();
                }
            });
        }
        
        // Play button
        if (featuredPlayBtn) {
            featuredPlayBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (AppState.selectedLesson) {
                    VideoManager.play(AppState.selectedLesson);
                }
            });
        }
        
        // Payment button
        if (btnPayment) {
            btnPayment.addEventListener('click', () => {
                this.handlePayment();
            });
        }
    },
    
    /**
     * Handle action button click based on current view
     */
    handleActionButtonClick() {
        const { currentView, selectedCourse, selectedModule, selectedLesson } = AppState;
        
        switch (currentView) {
            case 'home':
                if (selectedCourse) {
                    NavigationManager.goToCourse(selectedCourse);
                }
                break;
                
            case 'course':
                if (selectedModule) {
                    // Check if course is accessible
                    const isFree = PriceHelpers.isFree(selectedCourse?.price);
                    const isPurchased = AppState.purchasedCourses.includes(String(selectedCourse?.id));
                    
                    if (isFree || isPurchased) {
                        NavigationManager.goToModule(selectedModule);
                    } else {
                        ToastManager.warning('Premium Content', 'Purchase this course to access lessons');
                        // Scroll to payment section
                        const { paymentSection } = AppState.elements;
                        if (paymentSection) {
                            paymentSection.scrollIntoView({ behavior: 'smooth' });
                        }
                    }
                }
                break;
                
            case 'module':
                if (selectedLesson) {
                    VideoManager.play(selectedLesson);
                }
                break;
        }
    },
    
    /**
     * Handle payment
     */
    handlePayment() {
        const course = AppState.selectedCourse;
        
        if (!course) {
            ToastManager.error('Error', 'No course selected');
            return;
        }
        
        // Simulate payment (in production, integrate with payment gateway)
        ToastManager.info('Processing...', 'This is a demo. Payment integration needed.');
        
        setTimeout(() => {
            // Simulate successful purchase
            AppState.purchasedCourses.push(String(course.id));
            localStorage.setItem(
                CONFIG.APP.STORAGE.PURCHASES,
                JSON.stringify(AppState.purchasedCourses)
            );
            
            ToastManager.success('Purchase Successful!', 'You now have full access to this course');
            
            // Refresh details
            DetailsManager.update(course, 'course');
        }, 1500);
    },
    
    /**
     * Set up video event listeners
     */
    setupVideoEvents() {
        const { videoCloseBtn, btnFullscreen } = AppState.elements;
        
        if (videoCloseBtn) {
            videoCloseBtn.addEventListener('click', () => {
                VideoManager.close();
            });
        }
        
        if (btnFullscreen) {
            btnFullscreen.addEventListener('click', () => {
                VideoManager.toggleFullscreen();
            });
        }
    },
    
    /**
     * Set up keyboard event listeners
     */
    setupKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            // Escape key
            if (e.key === 'Escape') {
                if (AppState.isVideoPlaying) {
                    VideoManager.close();
                } else {
                    NavigationManager.goBack();
                }
                return;
            }
            
            // Arrow keys for navigation
            if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                SelectorManager.prev();
                return;
            }
            
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                SelectorManager.next();
                return;
            }
            
            // Enter key to select
            if (e.key === 'Enter') {
                e.preventDefault();
                SelectorManager.activateCurrentItem();
                return;
            }
            
            // Space to play/pause video
            if (e.key === ' ' && AppState.currentView === 'module') {
                e.preventDefault();
                if (AppState.isVideoPlaying) {
                    // Would need to control iframe - not directly possible
                } else if (AppState.selectedLesson) {
                    VideoManager.play(AppState.selectedLesson);
                }
                return;
            }
        });
    },
    
    /**
     * Set up theme event listeners
     */
    setupThemeEvents() {
        const { themeToggle } = AppState.elements;
        
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                ThemeManager.toggle();
            });
        }
    }
};

/* ================================================================
   17. INITIALIZATION
   ================================================================ */
const App = {
    /**
     * Initialize the application
     */
    async init() {
        Utils.log('🚀 Initializing application...');
        Utils.log(`Version: ${CONFIG.APP.VERSION}`);
        
        try {
            // Cache DOM elements
            DOMManager.cacheElements();
            
            // Validate required elements
            if (!DOMManager.validateElements()) {
                throw new Error('Required DOM elements not found');
            }
            
            // Show loading screen
            UIManager.showLoader();
            
            // Initialize theme
            ThemeManager.init();
            
            // Load purchased courses from storage
            this.loadPurchases();
            
            // Set up event handlers
            EventHandlers.init();
            
            // Fetch data from Google Sheets
            Utils.log('Fetching data from Google Sheets...');
            const data = await GoogleSheetsService.fetchAllData();
            
            // Store data in state
            AppState.courses = data.courses;
            AppState.modules = data.modules;
            AppState.lessons = data.lessons;
            
            // Check if we have courses
            if (AppState.courses.length === 0) {
                throw new Error('No courses found. Please check your Google Sheet.');
            }
            
            // Navigate to home
            NavigationManager.goToHome();
            
            // Hide loader and show app
            await Utils.delay(500); // Small delay for smooth transition
            UIManager.hideLoader();
            
            // Show welcome toast
            ToastManager.success(
                'Welcome!', 
                `${AppState.courses.length} course${AppState.courses.length !== 1 ? 's' : ''} loaded`
            );
            
            Utils.log('✅ Application initialized successfully!');
            Utils.log(`Loaded: ${AppState.courses.length} courses, ${AppState.modules.length} modules, ${AppState.lessons.length} lessons`);
            
        } catch (error) {
            Utils.error('Failed to initialize:', error);
            UIManager.showError(error.message || 'Failed to load courses. Please try again.');
        }
    },
    
    /**
     * Load purchased courses from localStorage
     */
    loadPurchases() {
        try {
            const saved = localStorage.getItem(CONFIG.APP.STORAGE.PURCHASES);
            if (saved) {
                AppState.purchasedCourses = Utils.parseJSON(saved, []);
                Utils.log(`Loaded ${AppState.purchasedCourses.length} purchased courses`);
            }
        } catch (e) {
            Utils.error('Failed to load purchases:', e);
        }
    }
};

/* ================================================================
   START APPLICATION
   ================================================================ */
// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}

/* ================================================================
   EXPORT FOR DEBUGGING
   ================================================================ */
window.CoursePlatform = {
    App,
    AppState,
    CONFIG,
    Utils,
    YouTubeHelpers,
    ThumbnailHelpers,
    PriceHelpers,
    GoogleSheetsService,
    UIManager,
    ToastManager,
    NavigationManager,
    VideoManager,
    SelectorManager,
    DetailsManager,
    ThemeManager
};

Utils.log('🎉 Course Platform script loaded');