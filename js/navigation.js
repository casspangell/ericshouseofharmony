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