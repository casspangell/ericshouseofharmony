/**
 * Eric's House of Harmony - Responsive JavaScript
 * Handles navigation, scroll effects, and interactive elements
 */

document.addEventListener('DOMContentLoaded', function() {
  
  // ======== 1. Header and Navigation ========
  
  // Elements
  const header = document.getElementById('header');
  const hamburger = document.getElementById('hamburger-menu');
  const navMenu = document.getElementById('navigation-menu');
  const body = document.body;
  
  // Header scroll effect
  window.addEventListener('scroll', function() {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
  
  // Hamburger menu toggle
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', function() {
      this.classList.toggle('active');
      navMenu.classList.toggle('active');
      body.classList.toggle('nav-active'); // Prevent body scroll when nav is open
    });
  }
  
  // Handle dropdown menus on mobile
  const dropdownParents = document.querySelectorAll('.dropdown-parent');
  
  dropdownParents.forEach(parent => {
    // For mobile: toggle dropdown on parent link click
    const parentLink = parent.querySelector('a');
    const dropdown = parent.querySelector('.dropdown');
    
    if (parentLink && dropdown) {
      parentLink.addEventListener('click', function(e) {
        // Only prevent default and toggle if on mobile
        if (window.innerWidth <= 768) {
          e.preventDefault();
          parent.classList.toggle('active');
          
          // Close other open dropdowns
          dropdownParents.forEach(otherParent => {
            if (otherParent !== parent && otherParent.classList.contains('active')) {
              otherParent.classList.remove('active');
            }
          });
        }
      });
    }
  });
  
  // Close mobile menu when clicking on a nav link
  const navLinks = document.querySelectorAll('.navigation-menu a:not(.dropdown-parent > a)');
  
  navLinks.forEach(link => {
    link.addEventListener('click', function() {
      if (hamburger.classList.contains('active')) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
        body.classList.remove('nav-active');
      }
    });
  });
  
  // Close mobile menu and dropdowns when resizing to desktop
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
      if (navMenu.classList.contains('active')) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
        body.classList.remove('nav-active');
      }
      
      // Close all active dropdowns
      dropdownParents.forEach(parent => {
        if (parent.classList.contains('active')) {
          parent.classList.remove('active');
        }
      });
    }
  });
  
  // ======== 2. Smooth Scrolling ========
  
  // Smooth scroll for all anchor links
  const scrollLinks = document.querySelectorAll('a[href^="#"]:not([href="#"])');
  
  scrollLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        e.preventDefault();
        
        // Close mobile menu if open
        if (hamburger && navMenu) {
          hamburger.classList.remove('active');
          navMenu.classList.remove('active');
          body.classList.remove('nav-active');
        }
        
        // Calculate header height for accurate scrolling
        const headerHeight = header.offsetHeight;
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
        
        window.scrollTo({
          top: targetPosition - headerHeight - 20, // Add a small buffer
          behavior: 'smooth'
        });
      }
    });
  });
  
  // ======== 3. Current Year for Footer ========
  
  const currentYearElement = document.getElementById('currentYear');
  if (currentYearElement) {
    currentYearElement.textContent = new Date().getFullYear();
  }
  
  // ======== 4. Accessibility Enhancements ========
  
  // Add aria attributes to improve accessibility
  const addAriaAttributes = () => {
    // Add aria-expanded to dropdowns
    dropdownParents.forEach(parent => {
      const toggle = parent.querySelector('a');
      const dropdown = parent.querySelector('.dropdown');
      
      if (toggle && dropdown) {
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-haspopup', 'true');
        
        // Update aria-expanded on toggle
        toggle.addEventListener('click', function() {
          if (window.innerWidth <= 768) {
            const expanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', !expanded);
          }
        });
        
        // Reset on mouse leave for desktop
        if (window.innerWidth > 768) {
          parent.addEventListener('mouseleave', function() {
            toggle.setAttribute('aria-expanded', 'false');
          });
          
          parent.addEventListener('mouseenter', function() {
            toggle.setAttribute('aria-expanded', 'true');
          });
        }
      }
    });
    
    // Add role="menuitem" to nav links
    const menuItems = document.querySelectorAll('.navigation-menu a');
    menuItems.forEach(item => {
      item.setAttribute('role', 'menuitem');
    });
  };
  
  addAriaAttributes();
  
  // ======== 5. Intersection Observer for Animations ========
  
  // Only run if IntersectionObserver is supported
  if ('IntersectionObserver' in window) {
    const animatedElements = document.querySelectorAll('.service-card, .stat-box, .senior-benefit, .benefit-item, .journey-step');
    
    const animationObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
          animationObserver.unobserve(entry.target); // Stop observing once animated
        }
      });
    }, {
      threshold: 0.1, // Trigger when 10% of the element is visible
      rootMargin: '0px 0px -50px 0px' // Adjust the trigger point
    });
    
    animatedElements.forEach(element => {
      // Add a base class for animations
      element.classList.add('animate-on-scroll');
      animationObserver.observe(element);
    });
  }
  
  // ======== 6. Responsive Video Handling ========
  
  // Lazy load videos and make them responsive
  const videos = document.querySelectorAll('video');
  
  videos.forEach(video => {
    // Add loading="lazy" attribute if not already present
    if (!video.hasAttribute('loading')) {
      video.setAttribute('loading', 'lazy');
    }
    
    // Set playsinline attribute for better mobile experience
    video.setAttribute('playsinline', '');
    
    // Set preload to none to improve initial page load
    video.setAttribute('preload', 'none');
    
    // Add poster if not already present
    if (!video.hasAttribute('poster')) {
      video.setAttribute('poster', 'img/video-cover2_800.jpg');
    }
  });
  
  // ======== 7. Custom Animation Classes ========
  
  // Add animation classes to elements
  document.querySelectorAll('.service-card').forEach((card, index) => {
    card.style.animationDelay = `${index * 0.1}s`;
  });
  
  document.querySelectorAll('.stat-box').forEach((box, index) => {
    box.style.animationDelay = `${index * 0.1}s`;
  });
});

// Add some CSS for the animations
document.addEventListener('DOMContentLoaded', function() {
  const style = document.createElement('style');
  style.textContent = `
    .animate-on-scroll {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.6s ease, transform 0.6s ease;
    }
    
    .animate-on-scroll.animated {
      opacity: 1;
      transform: translateY(0);
    }
    
    @media (prefers-reduced-motion: reduce) {
      .animate-on-scroll {
        transition: none;
        opacity: 1;
        transform: none;
      }
    }
  `;
  document.head.appendChild(style);
});