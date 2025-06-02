document.addEventListener("DOMContentLoaded", () => {
    const header = document.getElementById("header");
    const hamburgerMenu = document.getElementById("hamburger-menu");
    const mobileMenu = document.getElementById("mobile-menu");
    const closeMenu = document.getElementById("close-menu");

    let lastScrollY = window.scrollY;

    window.addEventListener("scroll", () => {
        if (window.scrollY > lastScrollY && window.scrollY > 50) {
            header.classList.add("shrink");
        } else {
            header.classList.remove("shrink");
        }
        lastScrollY = window.scrollY;
    });

    hamburgerMenu.addEventListener("click", () => {
        console.log("Hamburger menu clicked");
        mobileMenu.style.display = "flex";
    });

    closeMenu.addEventListener("click", () => {
        mobileMenu.style.display = "none";
    });

    window.addEventListener("scroll", () => {
        if (window.scrollY === 0) {
            header.classList.remove("shrink");
        }
    });

    // Add scroll-link event listeners
    document.querySelectorAll('.scroll-link').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            const offset = 50;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = target.getBoundingClientRect().top;
            const offsetPosition = elementRect - bodyRect - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        });
    });
});
