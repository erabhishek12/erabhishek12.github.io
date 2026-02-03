

'use strict';

/* ============================================
   1. CONFIGURATION & VARIABLES
============================================ */

// Typing Animation Phrases
const typingPhrases = [
    'Building Cool Projects 🚀',
    'Learning Cybersecurity 🛡️',
    'Exploring AI & ML 🤖',
    'Writing Clean Code 💻',
    'Solving Problems 🎯'
];

// Share Quotes for Project Sharing
const shareQuotes = [
    "Check out this amazing project! 🚀",
    "This is what creativity looks like! ✨",
    "Wow! You need to see this project! 🔥",
    "Built with passion and code! 💻",
    "Innovation at its finest! 🌟",
    "This project blew my mind! 🤯",
    "Talent + Hard work = This masterpiece! 💪",
    "From idea to reality - Check this out! 💡",
    "When coding becomes art! 🎨",
    "Future developer in action! 🎯",
    "This deserves your attention! 👀",
    "Impressive work by a student developer! 📚",
    "Simple yet powerful! ⚡",
    "Clean code, beautiful design! 🎭",
    "Technology meets creativity! 🔮"
];

// Konami Code
const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

// State Variables
let preloaderHidden = false;
let typingIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typingDelay = 100;
let typingStarted = false;
let konamiIndex = 0;
let cursorX = 0;
let cursorY = 0;
let outlineX = 0;
let outlineY = 0;

// Current Project for Share
let currentShareProject = {
    id: '',
    name: '',
    desc: '',
    url: '',
    image: ''
};

/* ============================================
   2. DOM ELEMENTS
============================================ */

// Get DOM Elements safely
function getElement(id) {
    return document.getElementById(id);
}

function getElements(selector) {
    return document.querySelectorAll(selector);
}

/* ============================================
   3. PRELOADER
============================================ */

function hidePreloader() {
    if (preloaderHidden) return;
    preloaderHidden = true;
    
    const preloader = getElement('preloader');
    
    if (preloader) {
        preloader.classList.add('loaded');
        document.body.classList.remove('no-scroll');
        
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 600);
    }
    
    // Initialize animations after preloader
    setTimeout(() => {
        initAOS();
        startTypingAnimation();
        initParticles();
        initGSAPAnimations();
    }, 100);
    
    console.log('✅ Preloader hidden');
}

// Multiple fallback methods for preloader
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded');
    setTimeout(hidePreloader, 1500);
});

window.addEventListener('load', () => {
    console.log('🌐 Window Loaded');
    setTimeout(hidePreloader, 300);
});

// Ultimate fallback
setTimeout(() => {
    console.log('⏰ Fallback timer');
    hidePreloader();
}, 4000);

/* ============================================
   4. CUSTOM CURSOR
============================================ */

function initCustomCursor() {
    const cursorDot = getElement('cursorDot');
    const cursorOutline = getElement('cursorOutline');
    
    if (!cursorDot || !cursorOutline) return;
    
    // Check for touch device
    if (window.matchMedia('(hover: none)').matches) {
        cursorDot.style.display = 'none';
        cursorOutline.style.display = 'none';
        return;
    }
    
    document.addEventListener('mousemove', (e) => {
        cursorX = e.clientX;
        cursorY = e.clientY;
        
        cursorDot.style.left = `${cursorX}px`;
        cursorDot.style.top = `${cursorY}px`;
    });
    
    function animateOutline() {
        outlineX += (cursorX - outlineX) * 0.15;
        outlineY += (cursorY - outlineY) * 0.15;
        
        cursorOutline.style.left = `${outlineX}px`;
        cursorOutline.style.top = `${outlineY}px`;
        
        requestAnimationFrame(animateOutline);
    }
    animateOutline();
    
    // Hover effects
    const interactiveElements = getElements('a, button, input, textarea, .project-card, .skill-card, .tech-icon, .share-btn');
    
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => cursorOutline.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursorOutline.classList.remove('hover'));
    });
    
    document.addEventListener('mousedown', () => cursorOutline.classList.add('click'));
    document.addEventListener('mouseup', () => cursorOutline.classList.remove('click'));
    
    document.addEventListener('mouseleave', () => {
        cursorDot.style.opacity = '0';
        cursorOutline.style.opacity = '0';
    });
    
    document.addEventListener('mouseenter', () => {
        cursorDot.style.opacity = '1';
        cursorOutline.style.opacity = '0.5';
    });
}

/* ============================================
   5. THEME TOGGLE
============================================ */

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (systemPrefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    showToast('success', 'Theme Changed', `Switched to ${newTheme} mode`);
}

function setupThemeToggle() {
    const themeToggle = getElement('themeToggle');
    const themeToggleMobile = getElement('themeToggleMobile');
    
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    if (themeToggleMobile) themeToggleMobile.addEventListener('click', toggleTheme);
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
    });
}

/* ============================================
   6. NAVIGATION & MOBILE MENU
============================================ */

function setupNavigation() {
    const navMenu = getElement('navMenu');
    const navToggle = getElement('navToggle');
    const navClose = getElement('navClose');
    const navLinks = getElements('.nav-link');
    
    function openMobileMenu() {
        if (navMenu) navMenu.classList.add('show');
        if (navToggle) navToggle.classList.add('active');
        document.body.classList.add('no-scroll');
    }
    
    function closeMobileMenu() {
        if (navMenu) navMenu.classList.remove('show');
        if (navToggle) navToggle.classList.remove('active');
        document.body.classList.remove('no-scroll');
    }
    
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            if (navMenu && navMenu.classList.contains('show')) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });
    }
    
    if (navClose) {
        navClose.addEventListener('click', closeMobileMenu);
    }
    
    navLinks.forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });
    
    document.addEventListener('click', (e) => {
        if (navMenu && navMenu.classList.contains('show') && 
            !navMenu.contains(e.target) && 
            navToggle && !navToggle.contains(e.target)) {
            closeMobileMenu();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navMenu && navMenu.classList.contains('show')) {
            closeMobileMenu();
        }
    });
}

/* ============================================
   7. SCROLL EFFECTS
============================================ */

function updateScrollProgress() {
    const scrollProgress = getElement('scrollProgress');
    const backToTop = getElement('backToTop');
    
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    
    if (scrollProgress) {
        scrollProgress.style.width = `${scrollPercent}%`;
    }
    
    if (backToTop) {
        const circle = backToTop.querySelector('.progress-ring-circle');
        if (circle) {
            const circumference = 283;
            const offset = circumference - (scrollPercent / 100) * circumference;
            circle.style.strokeDashoffset = offset;
        }
    }
}

function handleHeaderScroll() {
    const header = getElement('header');
    if (!header) return;
    
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
}

function handleBackToTop() {
    const backToTop = getElement('backToTop');
    if (!backToTop) return;
    
    if (window.scrollY > 500) {
        backToTop.classList.add('visible');
    } else {
        backToTop.classList.remove('visible');
    }
}

function setupScrollEffects() {
    window.addEventListener('scroll', () => {
        updateScrollProgress();
        handleHeaderScroll();
        handleBackToTop();
        updateActiveNavLink();
    });
    
    const backToTop = getElement('backToTop');
    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

/* ============================================
   8. SMOOTH SCROLLING
============================================ */

function smoothScroll(target) {
    const header = getElement('header');
    const element = document.querySelector(target);
    
    if (element) {
        const headerHeight = header ? header.offsetHeight : 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerHeight;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href !== '#') {
                e.preventDefault();
                smoothScroll(href);
            }
        });
    });
}

/* ============================================
   9. ACTIVE NAVIGATION LINK
============================================ */

function updateActiveNavLink() {
    const sections = getElements('section[id]');
    const navLinks = getElements('.nav-link');
    const scrollY = window.scrollY;
    
    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');
        
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

/* ============================================
   10. TYPING ANIMATION
============================================ */

function typeText() {
    const typingText = getElement('typingText');
    if (!typingText) return;
    
    const currentPhrase = typingPhrases[typingIndex];
    
    if (isDeleting) {
        typingText.textContent = currentPhrase.substring(0, charIndex - 1);
        charIndex--;
        typingDelay = 50;
    } else {
        typingText.textContent = currentPhrase.substring(0, charIndex + 1);
        charIndex++;
        typingDelay = 100;
    }
    
    if (!isDeleting && charIndex === currentPhrase.length) {
        typingDelay = 2000;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        typingIndex = (typingIndex + 1) % typingPhrases.length;
        typingDelay = 500;
    }
    
    setTimeout(typeText, typingDelay);
}

function startTypingAnimation() {
    if (typingStarted) return;
    typingStarted = true;
    setTimeout(typeText, 1000);
}

/* ============================================
   11. COUNTER ANIMATION
============================================ */

function animateCounter(counter) {
    const target = parseInt(counter.getAttribute('data-target'));
    if (isNaN(target)) return;
    
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;
    
    const updateCounter = () => {
        current += step;
        if (current < target) {
            counter.textContent = Math.floor(current);
            requestAnimationFrame(updateCounter);
        } else {
            counter.textContent = target;
        }
    };
    
    updateCounter();
}

function initCounterAnimation() {
    const counterNumbers = getElements('.counter-number[data-target]');
    if (counterNumbers.length === 0) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    counterNumbers.forEach(counter => observer.observe(counter));
}

/* ============================================
   12. SKILL BAR ANIMATION
============================================ */

function initSkillBars() {
    const skillBars = getElements('.skill-progress');
    if (skillBars.length === 0) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const progress = entry.target.getAttribute('data-progress');
                entry.target.style.setProperty('--progress', `${progress}%`);
                entry.target.classList.add('animated');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    skillBars.forEach(bar => observer.observe(bar));
}

/* ============================================
   13. PROJECT FILTERING
============================================ */

function filterProjects(category) {
    const projectCards = getElements('.project-card');
    
    projectCards.forEach(card => {
        const cardCategory = card.getAttribute('data-category') || '';
        
        if (category === 'all' || cardCategory.includes(category)) {
            card.classList.remove('hidden');
            card.style.display = 'block';
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'scale(1)';
            }, 50);
        } else {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.8)';
            setTimeout(() => {
                card.classList.add('hidden');
                card.style.display = 'none';
            }, 300);
        }
    });
}

function setupProjectFilters() {
    const filterBtns = getElements('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.getAttribute('data-filter');
            filterProjects(filter);
        });
    });
}

/* ============================================
   14. PROJECT SHARE FEATURE
============================================ */

function getRandomQuote() {
    return shareQuotes[Math.floor(Math.random() * shareQuotes.length)];
}

function generateShareURL(projectId) {
    const baseURL = window.location.origin + window.location.pathname;
    return `${baseURL}?project=${projectId}#project-${projectId}`;
}

function openShareModal(projectData) {
    const shareModal = getElement('shareModal');
    const shareProjectName = getElement('shareProjectName');
    const shareQuoteEl = getElement('shareQuote');
    const sharePreviewTitle = getElement('sharePreviewTitle');
    const sharePreviewDesc = getElement('sharePreviewDesc');
    const sharePreviewImg = getElement('sharePreviewImg');
    const shareLinkInput = getElement('shareLink');
    
    if (!shareModal) return;
    
    currentShareProject = projectData;
    
    // Set modal data
    if (shareProjectName) shareProjectName.textContent = projectData.name;
    if (sharePreviewTitle) sharePreviewTitle.textContent = projectData.name;
    if (sharePreviewDesc) sharePreviewDesc.textContent = projectData.desc;
    
    // Set share link
    const shareURL = generateShareURL(projectData.id);
    if (shareLinkInput) shareLinkInput.value = shareURL;
    currentShareProject.url = shareURL;
    
    // Set preview image
    const projectCard = getElement(`project-${projectData.id}`);
    if (projectCard) {
        const img = projectCard.querySelector('.project-image img');
        if (img && sharePreviewImg) {
            currentShareProject.image = img.src;
            sharePreviewImg.innerHTML = `<img src="${img.src}" alt="${projectData.name}">`;
        }
    }
    
    // Set random quote
    if (shareQuoteEl) shareQuoteEl.textContent = getRandomQuote();
    
    // Show modal
    shareModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeShareModal() {
    const shareModal = getElement('shareModal');
    if (shareModal) {
        shareModal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

async function copyShareLink() {
    const shareLinkInput = getElement('shareLink');
    const copyShareLinkBtn = getElement('copyShareLink');
    
    if (!shareLinkInput) return;
    
    try {
        await navigator.clipboard.writeText(shareLinkInput.value);
        
        if (copyShareLinkBtn) {
            copyShareLinkBtn.classList.add('copied');
            copyShareLinkBtn.innerHTML = '<i class="fas fa-check"></i><span>Copied!</span>';
            
            setTimeout(() => {
                copyShareLinkBtn.classList.remove('copied');
                copyShareLinkBtn.innerHTML = '<i class="fas fa-copy"></i><span>Copy</span>';
            }, 2000);
        }
        
        showToast('success', 'Link Copied!', 'Share link copied to clipboard');
    } catch (err) {
        shareLinkInput.select();
        document.execCommand('copy');
        showToast('success', 'Link Copied!', 'Share link copied to clipboard');
    }
}

function getShareText() {
    const shareQuoteEl = getElement('shareQuote');
    const quote = shareQuoteEl ? shareQuoteEl.textContent : 'Check this out!';
    return `${quote}\n\n🚀 ${currentShareProject.name}\n${currentShareProject.desc}\n\n👨‍💻 By Abhishek Kumar\n🔗 `;
}

function shareToWhatsApp() {
    const text = encodeURIComponent(getShareText() + currentShareProject.url);
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

function shareToTwitter() {
    const shareQuoteEl = getElement('shareQuote');
    const quote = shareQuoteEl ? shareQuoteEl.textContent : '';
    const text = encodeURIComponent(`${quote} 🚀\n\n${currentShareProject.name} by @abhishek\n`);
    const url = encodeURIComponent(currentShareProject.url);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
}

function shareToFacebook() {
    const url = encodeURIComponent(currentShareProject.url);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
}

function shareToLinkedIn() {
    const url = encodeURIComponent(currentShareProject.url);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
}

function shareToTelegram() {
    const text = encodeURIComponent(getShareText());
    const url = encodeURIComponent(currentShareProject.url);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
}

async function shareNativeHandler() {
    const shareQuoteEl = getElement('shareQuote');
    const quote = shareQuoteEl ? shareQuoteEl.textContent : '';
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: currentShareProject.name,
                text: `${quote} - ${currentShareProject.name} by Abhishek Kumar`,
                url: currentShareProject.url
            });
        } catch (err) {
            console.log('Share cancelled');
        }
    } else {
        copyShareLink();
    }
}

function checkSharedProject() {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project');
    
    if (projectId) {
        const projectCard = getElement(`project-${projectId}`);
        
        if (projectCard) {
            setTimeout(() => {
                const header = getElement('header');
                const headerHeight = header ? header.offsetHeight : 80;
                const projectPosition = projectCard.getBoundingClientRect().top + window.scrollY - headerHeight - 50;
                
                window.scrollTo({
                    top: projectPosition,
                    behavior: 'smooth'
                });
                
                setTimeout(() => {
                    projectCard.classList.add('shared-highlight');
                    
                    setTimeout(() => {
                        projectCard.classList.remove('shared-highlight');
                        
                        const cleanURL = window.location.origin + window.location.pathname + '#projects';
                        window.history.replaceState({}, document.title, cleanURL);
                    }, 3500);
                }, 500);
                
            }, 1000);
        }
    }
}

function setupProjectShare() {
    // Share button clicks
    const shareBtns = getElements('.share-btn');
    shareBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const projectData = {
                id: btn.dataset.projectId,
                name: btn.dataset.projectName,
                desc: btn.dataset.projectDesc
            };
            
            openShareModal(projectData);
        });
    });
    
    // Modal close
    const shareModalClose = getElement('shareModalClose');
    if (shareModalClose) {
        shareModalClose.addEventListener('click', closeShareModal);
    }
    
    const shareModal = getElement('shareModal');
    if (shareModal) {
        const overlay = shareModal.querySelector('.share-modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', closeShareModal);
        }
    }
    
    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeShareModal();
        }
    });
    
    // Refresh quote
    const refreshQuoteBtn = getElement('refreshQuote');
    if (refreshQuoteBtn) {
        refreshQuoteBtn.addEventListener('click', () => {
            const shareQuoteEl = getElement('shareQuote');
            if (shareQuoteEl) {
                shareQuoteEl.textContent = getRandomQuote();
            }
            refreshQuoteBtn.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                refreshQuoteBtn.style.transform = '';
            }, 300);
        });
    }
    
    // Copy link
    const copyShareLinkBtn = getElement('copyShareLink');
    if (copyShareLinkBtn) {
        copyShareLinkBtn.addEventListener('click', copyShareLink);
    }
    
    // Social share buttons
    const shareWhatsApp = getElement('shareWhatsApp');
    const shareTwitter = getElement('shareTwitter');
    const shareFacebook = getElement('shareFacebook');
    const shareLinkedIn = getElement('shareLinkedIn');
    const shareTelegram = getElement('shareTelegram');
    const shareNative = getElement('shareNative');
    
    if (shareWhatsApp) shareWhatsApp.addEventListener('click', shareToWhatsApp);
    if (shareTwitter) shareTwitter.addEventListener('click', shareToTwitter);
    if (shareFacebook) shareFacebook.addEventListener('click', shareToFacebook);
    if (shareLinkedIn) shareLinkedIn.addEventListener('click', shareToLinkedIn);
    if (shareTelegram) shareTelegram.addEventListener('click', shareToTelegram);
    if (shareNative) shareNative.addEventListener('click', shareNativeHandler);
    
    // Check for shared project on load
    checkSharedProject();
    setTimeout(checkSharedProject, 2000);
}

/* ============================================
   15. TESTIMONIALS SWIPER
============================================ */

function initTestimonialsSwiper() {
    if (typeof Swiper === 'undefined') {
        console.log('Swiper not loaded');
        return;
    }
    
    const swiperContainer = document.querySelector('.testimonialsSwiper');
    if (!swiperContainer) return;
    
    new Swiper('.testimonialsSwiper', {
        slidesPerView: 1,
        spaceBetween: 30,
        loop: true,
        autoplay: {
            delay: 5000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev'
        },
        effect: 'fade',
        fadeEffect: {
            crossFade: true
        }
    });
    
    console.log('✅ Swiper initialized');
}

/* ============================================
   16. TIMELINE ANIMATION
============================================ */

function initTimeline() {
    const timeline = document.querySelector('.timeline');
    const timelineProgress = getElement('timelineProgress');
    
    if (!timeline || !timelineProgress) return;
    
    function updateTimeline() {
        const rect = timeline.getBoundingClientRect();
        const timelineTop = rect.top;
        const timelineHeight = rect.height;
        const windowHeight = window.innerHeight;
        
        if (timelineTop < windowHeight && timelineTop + timelineHeight > 0) {
            const scrollPercent = Math.min(
                Math.max(((windowHeight - timelineTop) / (timelineHeight + windowHeight)) * 100, 0),
                100
            );
            timelineProgress.style.height = `${scrollPercent}%`;
        }
    }
    
    window.addEventListener('scroll', updateTimeline);
    updateTimeline();
}

/* ============================================
   17. AGE VERIFICATION MODAL
============================================ */

function setupAgeVerification() {
    const ageModal = getElement('ageModal');
    const verifyAgeBtn = getElement('verifyAgeBtn');
    const ageConfirm = getElement('ageConfirm');
    const ageDeny = getElement('ageDeny');
    
    function showAgeModal() {
        if (ageModal) {
            ageModal.classList.add('active');
            document.body.classList.add('no-scroll');
        }
    }
    
    function hideAgeModal() {
        if (ageModal) {
            ageModal.classList.remove('active');
            document.body.classList.remove('no-scroll');
        }
    }
    
    function handleAgeVerification(verified) {
        hideAgeModal();
        
        if (verified) {
            const adultContent = getElement('adultProjectContent');
            const blurOverlay = document.querySelector('.fun-card-blur');
            
            if (adultContent) adultContent.classList.remove('hidden');
            if (blurOverlay) blurOverlay.classList.add('hidden');
            
            sessionStorage.setItem('ageVerified', 'true');
            showToast('success', 'Verified', 'Age verification successful');
        } else {
            showToast('info', 'Access Denied', 'You must be 18+ to view this content');
        }
    }
    
    if (verifyAgeBtn) {
        verifyAgeBtn.addEventListener('click', showAgeModal);
    }
    
    if (ageConfirm) {
        ageConfirm.addEventListener('click', () => handleAgeVerification(true));
    }
    
    if (ageDeny) {
        ageDeny.addEventListener('click', () => handleAgeVerification(false));
    }
    
    if (ageModal) {
        const overlay = ageModal.querySelector('.modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', hideAgeModal);
        }
    }
    
    // Check if already verified
    if (sessionStorage.getItem('ageVerified') === 'true') {
        const adultContent = getElement('adultProjectContent');
        const blurOverlay = document.querySelector('.fun-card-blur');
        
        if (adultContent) adultContent.classList.remove('hidden');
        if (blurOverlay) blurOverlay.classList.add('hidden');
    }
}

/* ============================================
   18. COPY TO CLIPBOARD
============================================ */

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        } catch (e) {
            document.body.removeChild(textarea);
            return false;
        }
    }
}

function setupCopyButtons() {
    const copyBtns = getElements('.copy-btn');
    
    copyBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const textToCopy = btn.getAttribute('data-copy');
            const success = await copyToClipboard(textToCopy);
            
            if (success) {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i><span class="copy-tooltip">Copied!</span>';
                
                showToast('success', 'Copied!', 'Text copied to clipboard');
                
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                }, 2000);
            } else {
                showToast('error', 'Failed', 'Could not copy to clipboard');
            }
        });
    });
}

/* ============================================
   19. TOAST NOTIFICATIONS
============================================ */

function showToast(type = 'info', title = '', message = '', duration = 4000) {
    const container = getElement('toastContainer');
    if (!container) {
        console.log('Toast:', type, title, message);
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check',
        error: 'fa-times',
        info: 'fa-info',
        warning: 'fa-exclamation'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${icons[type] || icons.info}"></i>
        </div>
        <div class="toast-content">
            <h4 class="toast-title">${title}</h4>
            <p class="toast-message">${message}</p>
        </div>
        <button class="toast-close" aria-label="Close notification">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => removeToast(toast));
    }
    
    setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast) {
    if (!toast) return;
    toast.classList.add('removing');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 300);
}

// Make showToast globally available
window.showToast = showToast;

/* ============================================
   20. FLOATING CONTACT BUTTON
============================================ */

function setupFloatingContact() {
    const floatingContact = getElement('floatingContact');
    const floatingMainBtn = getElement('floatingMainBtn');
    
    if (floatingMainBtn && floatingContact) {
        floatingMainBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            floatingContact.classList.toggle('active');
        });
        
        document.addEventListener('click', (e) => {
            if (!floatingContact.contains(e.target)) {
                floatingContact.classList.remove('active');
            }
        });
    }
}

/* ============================================
   21. PARALLAX EFFECTS
============================================ */

function initParallax() {
    const blobs = getElements('.gradient-blob');
    
    if (blobs.length === 0 || window.innerWidth < 768) return;
    
    document.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        
        blobs.forEach((blob, index) => {
            const speed = (index + 1) * 15;
            blob.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
        });
    });
}

/* ============================================
   22. PROFILE CARD TILT EFFECT
============================================ */

function initProfileCardTilt() {
    const profileCard = getElement('profileCard');
    
    if (!profileCard || window.innerWidth < 1024) return;
    
    profileCard.addEventListener('mousemove', (e) => {
        const rect = profileCard.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;
        
        profileCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        
        const glow = profileCard.querySelector('.card-glow');
        if (glow) {
            glow.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(102, 126, 234, 0.4), transparent 50%)`;
        }
    });
    
    profileCard.addEventListener('mouseleave', () => {
        profileCard.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
        
        const glow = profileCard.querySelector('.card-glow');
        if (glow) {
            glow.style.background = '';
        }
    });
}

/* ============================================
   23. EASTER EGG (KONAMI CODE)
============================================ */

function activateEasterEgg() {
    document.body.classList.add('easter-egg-active');
    createConfetti();
    showToast('success', '🎉 Easter Egg Found!', 'You discovered the secret!');
    
    setTimeout(() => {
        document.body.classList.remove('easter-egg-active');
    }, 10000);
}

function createConfetti() {
    const colors = ['#667eea', '#764ba2', '#00d4ff', '#f5576c', '#fbbf24'];
    
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: fixed;
            width: 10px;
            height: 10px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${Math.random() * 100}vw;
            top: -10px;
            border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
            pointer-events: none;
            z-index: 10000;
            animation: confetti-fall ${2 + Math.random() * 3}s linear forwards;
        `;
        document.body.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 5000);
    }
    
    if (!getElement('confetti-style')) {
        const style = document.createElement('style');
        style.id = 'confetti-style';
        style.textContent = `
            @keyframes confetti-fall {
                to {
                    transform: translateY(100vh) rotate(720deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

function setupKonamiCode() {
    document.addEventListener('keydown', (e) => {
        if (e.code === konamiCode[konamiIndex]) {
            konamiIndex++;
            
            if (konamiIndex === konamiCode.length) {
                activateEasterEgg();
                konamiIndex = 0;
            }
        } else {
            konamiIndex = 0;
        }
    });
}

/* ============================================
   24. CONTACT FORM HANDLING
============================================ */

function setupContactForm() {
    const contactForm = getElement('contactForm');
    
    if (!contactForm) return;
    
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = contactForm.querySelector('.btn-submit');
        
        if (submitBtn) {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
        }
        
        try {
            // Simulate form submission
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            showToast('success', 'Message Sent!', 'Thank you! I\'ll get back to you soon.');
            contactForm.reset();
            
        } catch (error) {
            showToast('error', 'Error', 'Something went wrong. Please try again.');
        } finally {
            if (submitBtn) {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        }
    });
}

/* ============================================
   25. AOS INITIALIZATION
============================================ */

function initAOS() {
    if (typeof AOS === 'undefined') {
        console.log('AOS not loaded');
        return;
    }
    
    AOS.init({
        duration: 800,
        easing: 'ease-out-cubic',
        once: true,
        offset: 50,
        delay: 0,
        disable: window.innerWidth < 768 ? 'mobile' : false
    });
    
    console.log('✅ AOS initialized');
}

/* ============================================
   26. GSAP ANIMATIONS
============================================ */

function initGSAPAnimations() {
    if (typeof gsap === 'undefined') {
        console.log('GSAP not loaded');
        return;
    }
    
    gsap.from('.hero-tag', { opacity: 0, y: 30, duration: 0.8, delay: 0.2 });
    gsap.from('.hero-title', { opacity: 0, y: 50, duration: 1, delay: 0.4 });
    gsap.from('.hero-role', { opacity: 0, y: 30, duration: 0.8, delay: 0.6 });
    gsap.from('.hero-typing', { opacity: 0, duration: 0.8, delay: 0.8 });
    gsap.from('.hero-description', { opacity: 0, y: 20, duration: 0.8, delay: 1 });
    gsap.from('.hero-buttons .btn', { opacity: 0, y: 20, duration: 0.6, stagger: 0.2, delay: 1.2 });
    gsap.from('.hero-socials', { opacity: 0, y: 20, duration: 0.6, delay: 1.6 });
    gsap.from('.profile-card', { opacity: 0, scale: 0.8, duration: 1, delay: 0.5, ease: 'back.out(1.7)' });
    gsap.from('.floating-badge', { opacity: 0, scale: 0, duration: 0.5, stagger: 0.1, delay: 1.5, ease: 'back.out(1.7)' });
    
    console.log('✅ GSAP initialized');
}

/* ============================================
   27. PARTICLES EFFECT
============================================ */

function initParticles() {
    const particlesContainer = getElement('particles');
    if (!particlesContainer) return;
    
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        
        const size = Math.random() * 4 + 1;
        const x = Math.random() * 100;
        const duration = Math.random() * 20 + 10;
        const delay = Math.random() * 20;
        
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: rgba(102, 126, 234, ${Math.random() * 0.5 + 0.1});
            border-radius: 50%;
            left: ${x}%;
            bottom: -10px;
            pointer-events: none;
            animation: particle-float ${duration}s linear ${delay}s infinite;
        `;
        
        particlesContainer.appendChild(particle);
    }
    
    if (!getElement('particle-style')) {
        const style = document.createElement('style');
        style.id = 'particle-style';
        style.textContent = `
            @keyframes particle-float {
                0%, 100% {
                    transform: translateY(0) translateX(0);
                    opacity: 0;
                }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% {
                    transform: translateY(-100vh) translateX(50px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    console.log('✅ Particles initialized');
}

/* ============================================
   28. UTILITY FUNCTIONS
============================================ */

function setCurrentYear() {
    const currentYear = getElement('currentYear');
    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }
}

function debounce(func, wait = 100) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Handle resize
window.addEventListener('resize', debounce(() => {
    if (window.innerWidth > 1024) {
        initProfileCardTilt();
    }
    
    if (typeof AOS !== 'undefined') {
        AOS.refresh();
    }
}, 250));

/* ============================================
   29. CONSOLE EASTER EGG
============================================ */

console.log(`
%c╔═══════════════════════════════════════════╗
║   👋 Hello, Developer!                    ║
║   Built with ❤️ by Abhishek Kumar         ║
║   📧 abhishekyadav954698@gmail.com        ║
║   🌐 github.com/erabhishek12              ║
╚═══════════════════════════════════════════╝
`, 'color: #667eea; font-weight: bold;');

/* ============================================
   30. MAIN INITIALIZATION
============================================ */

function initializeApp() {
    console.log('🚀 Portfolio initializing...');
    
    // Set body to no-scroll for preloader
    document.body.classList.add('no-scroll');
    
    // Initialize theme
    initTheme();
    
    // Setup all features
    setupThemeToggle();
    setupNavigation();
    setupScrollEffects();
    setupSmoothScroll();
    setupProjectFilters();
    setupProjectShare();
    setupAgeVerification();
    setupCopyButtons();
    setupFloatingContact();
    setupContactForm();
    setupKonamiCode();
    
    // Initialize animations
    initCustomCursor();
    initCounterAnimation();
    initSkillBars();
    initTimeline();
    initParallax();
    initProfileCardTilt();
    
    // Initialize Swiper
    initTestimonialsSwiper();
    
    // Set current year
    setCurrentYear();
    
    // Initial scroll effects
    handleHeaderScroll();
    updateActiveNavLink();
    handleBackToTop();
    updateScrollProgress();
    
    console.log('✅ All features initialized');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

