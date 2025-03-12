document.getElementById("hamburger-menu").addEventListener("click", function () {
    const navMenu = document.getElementById("navigation-menu");
    navMenu.classList.toggle("active");
});

window.addEventListener("scroll", function () {
    const header = document.querySelector(".main-header");
    if (window.scrollY > 50) {
        header.classList.add("scrolled");
    } else {
        header.classList.remove("scrolled");
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Dropdown menu handling
    const albumsDropdown = document.querySelector('.navigation-menu li:has(.dropdown)');
    
    if (albumsDropdown) {
      // Prevent default behavior of dropdown arrow
      const dropdownArrow = albumsDropdown.querySelector('.dropdown-arrow');
      if (dropdownArrow) {
        dropdownArrow.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
        });
      }
      
      // Mobile menu handling
      const hamburger = document.getElementById('hamburger-menu');
      const navMenu = document.getElementById('navigation-menu');
      
      hamburger.addEventListener('click', function() {
        this.classList.toggle('active');
        navMenu.classList.toggle('active');
      });
      
      // Close mobile menu when a link is clicked
      const navLinks = navMenu.querySelectorAll('a');
      navLinks.forEach(link => {
        link.addEventListener('click', function() {
          hamburger.classList.remove('active');
          navMenu.classList.remove('active');
        });
      });
    }
    
    // Header scroll effect
    const header = document.getElementById('header');
    
    window.addEventListener('scroll', function() {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('.scroll-link').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
          // Close mobile menu if open
          const hamburger = document.getElementById('hamburger-menu');
          const navMenu = document.getElementById('navigation-menu');
          
          hamburger.classList.remove('active');
          navMenu.classList.remove('active');
          
          // Scroll to target
          window.scrollTo({
            top: targetElement.offsetTop - 80, // Adjust for header height
            behavior: 'smooth'
          });
        }
      });
    });
});