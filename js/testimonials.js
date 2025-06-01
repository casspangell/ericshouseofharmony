document.addEventListener("DOMContentLoaded", () => {
    const swiperContainer = document.querySelector("swiper-container.mySwiper");
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vScjxLgYnP6zvbpI6BhCeHOKlc44U8M5bi9TvqCGZeLxVik9U6b53ph5VR8qoO-vUjzRFHrfBSOnR0Z/pub?output=csv';

    // Fetch and parse CSV data
    fetch(sheetUrl)
        .then(response => response.text())
        .then(csvText => {
            console.log("CSV data fetched successfully.");
            const testimonials = parseCSV(csvText);

            // Populate Swiper with slides
            testimonials.forEach(testimonial => {
                const slide = document.createElement("swiper-slide");
                slide.innerHTML = `
                    <div class="testimonial-item">
                        <span class="name">${testimonial.name || "Anonymous"}</span>
                        <span class="venue">${testimonial.testimonial || ""}</span>
                        ${testimonial.date ? `<span class="date">${testimonial.date}</span>` : ""}
                    </div>
                `;
                swiperContainer.appendChild(slide);
            });

            // Initialize SwiperJS
            new Swiper(".mySwiper", {
                pagination: { el: ".swiper-pagination", clickable: true },
                loop: true,
                breakpoints: {
                    480: { slidesPerView: 1 }, // 1 slide on smallest screens
                    768: { slidesPerView: 2 }, // 2 slides on medium screens
                    1024: { slidesPerView: 3 } // 3 slides on larger screens
                },
            });
        })
        .catch(error => console.error("Error fetching data from Google Sheets:", error));

    // Function to parse CSV into structured JSON
    function parseCSV(csvText) {
        console.log("Parsing CSV data...");

        // Split into rows and ensure non-empty rows
        const rows = csvText.split("\n").filter(row => row.trim() !== "");

        // Extract headers (first row) and trim quotes
        const headers = rows[0].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g).map(header =>
            header.replace(/(^"|"$)/g, "").trim()
        );

        // Map rows to JSON objects
        return rows.slice(1).map(row => {
            // Match values while respecting quoted fields
            const values = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g).map(value =>
                value.replace(/(^"|"$)/g, "").trim()
            );

            // Reduce headers and values into a JSON object
            return headers.reduce((acc, header, index) => {
                acc[header.toLowerCase()] = values[index] || ""; // Assign empty string for missing fields
                return acc;
            }, {});
        });
    }
});
