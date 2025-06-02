// Google Sheets Integration for Dynamic Services
class ServicesManager {
  constructor() {
    // Replace this with your published Google Sheets CSV URL
    this.sheetsURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-SZoJOTTt_ireuf0_GDyH5BA3MP-KFMqn4MB6UG65YjOeNRqzLmwljCNXW52iOHoAnOnSOjQKJDM5/pub?output=csv';
    this.container = document.getElementById('services-cards-container');
    this.loadingElement = document.getElementById('services-loading');
    this.errorElement = document.getElementById('services-error');
    
    this.init();
  }

  async init() {
    try {
      await this.loadServices();
    } catch (error) {
      console.error('Error loading services:', error);
      this.showError();
    }
  }

  async loadServices() {
    // Show loading state
    this.showLoading();

    try {
      const response = await fetch(this.sheetsURL);
      if (!response.ok) {
        throw new Error('Failed to fetch services data');
      }

      const csvText = await response.text();
      const services = this.parseCSV(csvText);
      
      if (services.length === 0) {
        throw new Error('No services data found');
      }

      this.renderServices(services);
      this.showServices();
      
    } catch (error) {
      console.error('Error in loadServices:', error);
      throw error;
    }
  }

  parseCSV(csvText) {
    const lines = csvText.split('\n');
    const services = [];
    
    // Skip header row (index 0)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Simple CSV parsing (handles basic cases)
      const columns = this.parseCSVLine(line);
      
      if (columns.length >= 4) {
        services.push({
          name: columns[0] || '',
          description: columns[1] || '',
          duration: columns[2] || '',
          price: columns[3] || '',
          category: columns[4] || '',
          image: columns[5] || ''
        });
      }
    }
    
    return services;
  }

  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result.map(item => item.replace(/^"|"$/g, '')); // Remove surrounding quotes
  }

  renderServices(services) {
    this.container.innerHTML = '';
    
    services.forEach((service, index) => {
      const serviceCard = this.createServiceCard(service, index + 1);
      this.container.appendChild(serviceCard);
    });
  }

  createServiceCard(service, number) {
    const card = document.createElement('div');
    card.className = 'service-card-harmony';
    
    // Determine button text and link
    let buttonHTML = '';
    if (service.name.toLowerCase().includes('workshop') || service.name.toLowerCase().includes('great song')) {
      buttonHTML = `<a class="btn smooth-scroll" href="https://www.ericshouseofharmony.com/greatsong.html">Read More</a>`;
    } else {
      buttonHTML = `<a class="btn smooth-scroll" href="#connect">Select</a>`;
    }

    // Format price display
    let priceDisplay = service.price;
    if (!service.price || service.price === '0' || service.price.toLowerCase().includes('contact')) {
      priceDisplay = 'Contact for Pricing';
    } else if (!service.price.includes('$') && !isNaN(parseFloat(service.price))) {
      priceDisplay = `$${service.price}`;
    }

    card.innerHTML = `
      <div class="service-card-number">${number}</div>
      <div class="service-card-icon">
        <img src="/img/img${number}.png" alt="${service.name} Icon" onerror="this.style.display='none'">
      </div>
      <h3 class="service-card-title">${service.name}</h3>
      <p class="service-card-desc">${service.description}</p>
      <div class="service-price">${priceDisplay}</div>
      ${buttonHTML}
    `;
    
    return card;
  }

  showLoading() {
    this.loadingElement.style.display = 'block';
    this.errorElement.style.display = 'none';
    this.container.style.display = 'none';
  }

  showServices() {
    this.loadingElement.style.display = 'none';
    this.errorElement.style.display = 'none';
    this.container.style.display = 'grid';
  }

  showError() {
    this.loadingElement.style.display = 'none';
    this.errorElement.style.display = 'block';
    this.container.style.display = 'none';
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
  // Only initialize if we're on a page with services
  if (document.getElementById('services-cards-container')) {
    new ServicesManager();
  }
});