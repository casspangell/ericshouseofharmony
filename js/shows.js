let showsPerPage = 9; // Default for larger screens
let currentPage = 1;
let shows = [];

// Adjust `showsPerPage` based on screen size
function adjustShowsPerPage() {
    if (window.innerWidth <= 480) {
        showsPerPage = 6;
    } else if (window.innerWidth <= 768) {
        showsPerPage = 6;
    } else {
        showsPerPage = 9; // Default for larger screens
    }
    console.log(`Adjusted showsPerPage to: ${showsPerPage} (screen width: ${window.innerWidth})`);
}

// Function to handle window resize
function handleResize() {
    console.log("Window resized. Adjusting showsPerPage...");
    adjustShowsPerPage();
    renderShows(currentPage);
    renderPagination();
}

// Add event listener for window resizing
window.addEventListener('resize', handleResize);

// Function to parse CSV data into structured JSON
function parseCSV(csvText) {
    console.log("Parsing CSV data...");
    const rows = csvText.split("\n").filter(row => row.trim() !== "");

    // Extract headers and convert them to lowercase
    const headers = rows[0].split(",").map(header => header.trim().toLowerCase());

    const parsedData = rows.slice(1).map((row, rowIndex) => {
        const values = row.split(",").map(value => value.replace(/(^"|"$)/g, "").trim());
        const rowData = headers.reduce((acc, header, index) => {
            acc[header] = values[index]; // Use lowercase keys
            return acc;
        }, {});

        // Debugging logs
        console.log(`Row ${rowIndex + 1} parsed:`, rowData);

        // Combine city and state into a location field
        if (rowData.city && rowData.state) {
            rowData.location = `${rowData.city}, ${rowData.state}`;
        } else if (rowData.city) {
            rowData.location = rowData.city;
        } else {
            rowData.location = "Unknown Location";
        }

        return rowData;
    });

    console.log("Parsed data:", parsedData);
    return parsedData;
}

// Function to render shows for the current page
function renderShows(page) {
    const startIndex = (page - 1) * showsPerPage;
    const endIndex = startIndex + showsPerPage;
    const showsList = document.getElementById("shows-list");

    console.log(`Rendering shows for page ${page} (startIndex: ${startIndex}, endIndex: ${endIndex})`);
    showsList.innerHTML = ""; // Clear current content

    shows.slice(startIndex, endIndex).forEach((show, index) => {
        console.log(`Rendering show ${index + startIndex + 1}:`, show);
        const div = document.createElement("div");
        div.innerHTML = `
            <span style="font-family: monospace;">${show.date}</span><br>
            <strong>Venue:</strong> ${show.venue}<br>
            <strong>Location:</strong> ${show.location}<br>
            <strong>Time:</strong> ${show.when}
        `;
        showsList.appendChild(div);
    });
}

// Function to render pagination controls
function renderPagination() {
    const totalPages = Math.ceil(shows.length / showsPerPage);
    const pagination = document.getElementById("pagination");

    console.log(`Rendering pagination (total pages: ${totalPages})`);
    pagination.innerHTML = "";

    for (let i = 1; i <= totalPages; i++) {
        console.log(`Creating pagination button for page ${i}`);
        const button = document.createElement("button");
        button.textContent = i;
        button.style.cssText = "margin: 0 5px; padding: 10px 15px; cursor: pointer;";
        if (i === currentPage) {
            button.style.fontWeight = "bold";
            button.style.backgroundColor = "#6633cc";
            button.style.color = "white";
        }

        button.addEventListener("click", () => {
            console.log(`Pagination button clicked for page ${i}`);
            currentPage = i;
            renderShows(currentPage);
            renderPagination();
        });

        pagination.appendChild(button);
    }
}

// Fetch data from Google Spreadsheet
fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vTng_Wh0JJeInWPHv-cnIHWMlZ_VrVlEXNryIEtSULHntl03MBSlMXJjJs7RDgVk3ELgyCPtZtoLRyp/pub?output=csv')
    .then(response => response.text())
    .then(csvText => {
        console.log("CSV data fetched successfully.");
        shows = parseCSV(csvText);
        adjustShowsPerPage(); // Set initial value
        renderShows(currentPage);
        renderPagination();
    })
    .catch(error => console.error("Error fetching data from Google Sheets:", error));
