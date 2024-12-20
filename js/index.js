// Handle mobile menu toggle
const toggleMenu = document.querySelector('.toggle-mnu');
const mobileMenu = document.getElementById('mobile-menu');

if (toggleMenu && mobileMenu) {
    toggleMenu.addEventListener('click', function (e) {
        e.preventDefault();
        mobileMenu.classList.toggle('active');
    });
}

// Show Pagination
const showsPerPage = 9;
let currentPage = 1;
let shows = [];

// Function to render shows
function renderShows(page) {
    const startIndex = (page - 1) * showsPerPage;
    const endIndex = startIndex + showsPerPage;
    const showsList = document.getElementById("shows-list");

    if (showsList) {
        showsList.innerHTML = ""; // Clear current content

        shows.slice(startIndex, endIndex).forEach(show => {
            const div = document.createElement("div");
            div.innerHTML = `
        <strong>Date:</strong> ${show.date}<br>
        <strong>Venue:</strong> ${show.venue}<br>
        <strong>Location:</strong> ${show.place}<br>
        <strong>Time:</strong> ${show.when}
      `;
            showsList.appendChild(div);
        });
    }
}

// Fetch data from Google Spreadsheet
fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vTng_Wh0JJeInWPHv-cnIHWMlZ_VrVlEXNryIEtSULHntl03MBSlMXJjJs7RDgVk3ELgyCPtZtoLRyp/pub?output=csv')
    .then(response => response.text())
    .then(csvText => {
        shows = parseCSV(csvText);
        renderShows(currentPage);
        renderPagination();
    })
    .catch(error => console.error("Error fetching data from Google Sheets:", error));

// Function to parse CSV
function parseCSV(csvText) {
    const rows = csvText.split("\n").filter(row => row.trim() !== "");
    const headers = rows[0].split(",").map(header => header.trim());

    return rows.slice(1).map(row => {
        const values = row.split(",").map(value => value.replace(/(^"|"$)/g, "").trim());
        return headers.reduce((acc, header, index) => {
            acc[header.toLowerCase()] = values[index];
            return acc;
        }, {});
    });
}

// Music Button
    var btn = document.getElementById("play_button");
    var audio = document.getElementById("background_audio");
    var isPlaying = false;

    function myFunction() {

    if (!isPlaying) {
    audio.play();
    btn.innerHTML = "Listening";
    isPlaying = true;
} else {
    audio.pause();
    btn.innerHTML = "Click to Listen";
    isPlaying = false;
}
}
