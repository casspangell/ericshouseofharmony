/**
 * Eric's House of Harmony - Header and Navigation JavaScript
 * Handles header behavior, navigation, and smooth scrolling
 */

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

  
  // Elements
  const hamburger = document.getElementById('hamburger-menu');
  const navMenu = document.getElementById('navigation-menu');
  const header = document.getElementById('header');
  const scrollLinks = document.querySelectorAll('.scroll-link');
  
  // Hamburger menu toggle
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', function() {
      this.classList.toggle('active');
      navMenu.classList.toggle('active');
    });
  }
  
  // Header scroll effect
  if (header) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }
  
  // Smooth scrolling for anchor links
  if (scrollLinks.length > 0) {
    scrollLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
          // Close mobile menu if open
          if (hamburger && navMenu) {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
          }
          
          // Scroll to target
          window.scrollTo({
            top: targetElement.offsetTop - 80, // Adjust for header height
            behavior: 'smooth'
          });
        }
      });
    });
  }
});