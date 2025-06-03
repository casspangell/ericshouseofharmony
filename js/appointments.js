// Simple Google Sheets Integration - No Fallback Data
class ServicesManager {
  constructor() {
    // Your Google Sheets CSV URL
    this.sheetsURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-SZoJOTTt_ireuf0_GDyH5BA3MP-KFMqn4MB6UG65YjOeNRqzLmwljCNXW52iOHoAnOnSOjQKJDM5/pub?output=csv';
    
    // DOM elements
    this.container = document.getElementById('services-cards-container');
    this.loadingElement = document.getElementById('services-loading');
    this.errorElement = document.getElementById('services-error');
    
    // Configuration - more aggressive for server environment
    this.retryAttempts = 2;
    this.retryDelay = 1500;
    this.isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    this.init();
  }

  async init() {
    // Add a global timeout as a last resort
    const globalTimeout = setTimeout(() => {
      console.error('🚨 Global timeout reached - forcing error display');
      this.showError('Request timed out - Google Sheets is taking too long to respond');
    }, 15000);

    try {
      await this.loadServicesWithRetry();
      clearTimeout(globalTimeout);
    } catch (error) {
      clearTimeout(globalTimeout);
      console.error('Failed to load services from Google Sheets:', error);
      this.showError(error.message);
    }
  }

  async loadServicesWithRetry() {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`Loading services - attempt ${attempt}/${this.retryAttempts}`);
        await this.loadServices();
        return;
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.retryAttempts) {
          console.log(`Retrying in ${this.retryDelay/1000} seconds...`);
          await this.delay(this.retryDelay);
        }
      }
    }
    
    throw lastError;
  }

  async loadServices() {
    this.showLoading();

    try {
      const startTime = Date.now();
      
      const response = await fetch(this.sheetsURL, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv',
          'Cache-Control': 'no-cache',
        },
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        console.error('❌ HTTP Error:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText || 'Failed to fetch from Google Sheets'}`);
      }

      const csvText = await response.text();
      
      if (!csvText || csvText.trim().length === 0) {
        throw new Error('Google Sheets returned empty data');
      }

      const services = this.parseCSV(csvText);
      
      if (services.length === 0) {
        throw new Error('No valid services found in Google Sheets');
      }

      this.renderServices(services);
      this.showServices();
      
    } catch (error) {
      console.error('💥 Fetch error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      if (error.name === 'AbortError') {
        throw new Error('Request timed out after 8 seconds - Google Sheets is not responding');
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Network error - Cannot connect to Google Sheets. Check your internet connection or try again later.');
      } else if (error.message.includes('HTTP')) {
        throw new Error(`Server error: ${error.message}`);
      } else {
        throw error;
      }
    }
  }

  parseCSV(csvText) {
    const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
    const services = [];
    
    if (lines.length < 2) {
      throw new Error('Google Sheets must have at least a header row and one data row');
    }
    
    const headers = this.parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    
    const columnMap = {
      name: this.findColumnIndex(headers, ['service name', 'name', 'service']),
      description: this.findColumnIndex(headers, ['description', 'desc']),
      duration: this.findColumnIndex(headers, ['duration', 'time']),
      price: this.findColumnIndex(headers, ['price', 'cost']),
      category: this.findColumnIndex(headers, ['category', 'type']),
      image: this.findColumnIndex(headers, ['image', 'img', 'icon'])
    };
    
    if (columnMap.name === -1) {
      throw new Error('Could not find "Service Name" or "Name" column in Google Sheets');
    }
    if (columnMap.description === -1) {
      throw new Error('Could not find "Description" column in Google Sheets');
    }
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      try {
        const columns = this.parseCSVLine(line);
        
        const service = {
          name: this.getColumnValue(columns, columnMap.name) || '',
          description: this.getColumnValue(columns, columnMap.description) || '',
          duration: this.getColumnValue(columns, columnMap.duration) || '',
          price: this.getColumnValue(columns, columnMap.price) || '',
          category: this.getColumnValue(columns, columnMap.category) || '',
          image: this.getColumnValue(columns, columnMap.image) || ''
        };
        
        if (service.name.trim() && service.description.trim()) {
          services.push(service);
          console.log(`✅ Added service: ${service.name}`);
        } else {
          console.warn(`⚠️ Skipping row ${i + 1}: Missing name or description`);
        }
        
      } catch (error) {
        console.warn(`⚠️ Error parsing row ${i + 1}:`, error.message);
        continue;
      }
    }
    
    return services;
  }

  findColumnIndex(headers, possibleNames) {
    for (const name of possibleNames) {
      const index = headers.findIndex(header => header.includes(name));
      if (index !== -1) {
        return index;
      }
    }
    return -1;
  }

  getColumnValue(columns, index) {
    return (index >= 0 && index < columns.length) ? columns[index].trim() : '';
  }

  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    
    result.push(current);
    return result.map(item => item.replace(/^"|"$/g, '').trim());
  }

  renderServices(services) {
    if (!this.container) {
      throw new Error('Services container element not found');
    }

    this.container.innerHTML = '';
    
    services.forEach((service, index) => {
      try {
        const serviceCard = this.createServiceCard(service, index + 1);
        
        if (!serviceCard) {
          console.error(`❌ createServiceCard returned null for service ${index + 1}`);
          return;
        }
        
        this.container.appendChild(serviceCard);
        
      } catch (error) {
        console.error(`❌ Error creating card for service ${index + 1}:`, error);
        const errorCard = this.createErrorCard(service, index + 1, error.message);
        if (errorCard) {
          this.container.appendChild(errorCard);
        }
      }
    });
  }

  createErrorCard(service, number, errorMessage) {
    try {
      const card = document.createElement('div');
      card.className = 'service-card-harmony';
      card.style.backgroundColor = '#ffe6e6';
      card.style.border = '2px solid #ff9999';
      
      card.innerHTML = `
        <div class="service-card-number">${number}</div>
        <h3 class="service-card-title" style="color: #cc0000;">Error Loading Service</h3>
        <p class="service-card-desc" style="color: #666;">
          Service Name: ${this.escapeHtml(service.name || 'Unknown')}<br>
          Error: ${this.escapeHtml(errorMessage)}
        </p>
        <div class="service-price">Contact for Info</div>
        <a class="btn" href="mailto:info@ericshouseofharmony.com" style="background: #cc0000;">Contact for Details</a>
      `;
      
      return card;
    } catch (e) {
      console.error('Failed to create error card:', e);
      return null;
    }
  }

  createServiceCard(service, number) {
    try {
      if (!service || !service.name || service.name.trim().length === 0) {
        throw new Error('Service name is required');
      }
      
      const card = document.createElement('div');
      card.className = 'service-card-harmony';
      
      // Determine button text and link based on service type
      let buttonHTML = '';
      const serviceName = (service.name || '').toLowerCase();
      
      if (serviceName.includes('workshop') || serviceName.includes('great song')) {
        buttonHTML = `<a class="btn smooth-scroll" href="https://www.ericshouseofharmony.com/greatsong.html">Learn More</a>`;
      } else {
        // Format service duration from text to minutes
        let durationMinutes = 60; // default
        if (service.duration) {
          const durationText = service.duration.toLowerCase().trim();
          const match = durationText.match(/(\d+)/);
          if (match) {
            durationMinutes = parseInt(match[1]);
            if (durationMinutes < 10 && durationText.includes('hour')) {
              durationMinutes *= 60;
            }
          }
        }
        
        // Format price as a number
        let priceValue = 0;
        if (service.price) {
          const priceText = service.price.replace(/[^\d.]/g, '');
          priceValue = parseFloat(priceText) || 0;
        }
        
        // Create the booking button with proper data attributes
        buttonHTML = `<button class="btn smooth-scroll book-service-btn" 
          data-service-id="${number}"
          data-service-name="${this.escapeHtml(service.name)}"
          data-service-duration="${durationMinutes}"
          data-service-price="${priceValue}">
          Book Now
        </button>`;
      }

      // Format price display
      const priceDisplay = this.formatPrice(service.price);

      // Format duration display
      const durationDisplay = this.formatDuration(service.duration);

      // Clean up description
      const description = this.cleanDescription(service.description);

      // Get the correct icon path
      const iconPath = this.getIconPath(service.image);

      // Build the card HTML
      const cardHTML = `
        <div class="service-card-number">${number}</div>
        <div class="service-card-icon">
          <img src="${this.escapeHtml(iconPath)}" alt="${this.escapeHtml(service.name)} Icon" onerror="this.style.display='none'">
        </div>
        <h3 class="service-card-title">${this.escapeHtml(service.name)}</h3>
        <p class="service-card-desc">${this.escapeHtml(description)}</p>
        ${durationDisplay ? `<div class="service-duration">Duration: ${this.escapeHtml(durationDisplay)}</div>` : ''}
        <div class="service-price">${this.escapeHtml(priceDisplay)}</div>
        ${buttonHTML}
      `;
      
      card.innerHTML = cardHTML;
      
      // Add click event listener to booking buttons
      const bookBtn = card.querySelector('.book-service-btn');
      if (bookBtn) {
        bookBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const serviceData = {
            id: bookBtn.dataset.serviceId,
            name: bookBtn.dataset.serviceName,
            duration: bookBtn.dataset.serviceDuration,
            price: bookBtn.dataset.servicePrice
          };
          this.navigateToBooking(serviceData);
        });
      }
      
      return card;
      
    } catch (error) {
      console.error(`Failed to create service card for service ${number}:`, error);
      throw error;
    }
  }

  // New method to handle navigation to booking page
  navigateToBooking(serviceData) {
    try {
      // Your Google Apps Script web app URL
      const baseUrl = 'https://script.google.com/macros/s/AKfycbwUa9kKDvd4zj-SYJ5KZQ2vGkqP6P_EHbTpl79U2X3RjRCf03hdNiPUteFPL13BfoSQ_g/exec';
      
      const url = new URL(baseUrl);
      
      // Add service parameters with proper encoding
      url.searchParams.append('id', serviceData.id);
      url.searchParams.append('name', serviceData.name);
      url.searchParams.append('duration', serviceData.duration);
      url.searchParams.append('price', serviceData.price);
      
      console.log('Navigating to booking page with URL:', url.toString());
      
      // Navigate to the booking page
      window.location.href = url.toString();
      
    } catch (error) {
      console.error('Error navigating to booking page:', error);
      alert('Error loading booking page. Please try again or contact support.');
    }
  }

  getIconPath(imageValue) {
    const iconMap = {
      'voice': '/img/serviceicons/voice.png',
      'sound': '/img/serviceicons/sound.png',
      'headphones': '/img/serviceicons/headphones.png',
      'fork': '/img/serviceicons/fork.png',
      'equilizer': '/img/serviceicons/equilizer.png',
      'bowl': '/img/serviceicons/bowl.png'
    };

    const cleanImageValue = imageValue ? imageValue.trim().toLowerCase() : '';
    const iconPath = iconMap[cleanImageValue];
    
    if (iconPath) {
      return iconPath;
    } else {
      console.warn(`⚠️ Unknown image value: "${imageValue}" - using default icon`);
      return '/img/serviceicons/default.png';
    }
  }

  formatPrice(price) {
    if (!price || price === '0' || price.toLowerCase().includes('contact')) {
      return 'Contact for Pricing';
    }
    
    const cleanPrice = price.replace(/[$,\s]/g, '');
    
    if (!isNaN(parseFloat(cleanPrice)) && isFinite(cleanPrice)) {
      return `$${parseFloat(cleanPrice).toFixed(2)}`;
    }
    
    return price;
  }

  formatDuration(duration) {
    if (!duration) return '';
    
    const cleanDuration = duration.toLowerCase().trim();
    if (cleanDuration.includes('min')) {
      return cleanDuration;
    } else if (!isNaN(parseFloat(cleanDuration))) {
      return `${cleanDuration} minutes`;
    }
    
    return cleanDuration;
  }

  cleanDescription(description) {
    if (!description) return '';
    return description.replace(/\s+/g, ' ').trim();
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showLoading() {
    if (this.loadingElement) this.loadingElement.style.display = 'block';
    if (this.errorElement) this.errorElement.style.display = 'none';
    if (this.container) this.container.style.display = 'none';
  }

  showServices() {
    if (this.loadingElement) this.loadingElement.style.display = 'none';
    if (this.errorElement) this.errorElement.style.display = 'none';
    if (this.container) this.container.style.display = 'grid';
  }

  showError(errorMessage) {
    console.error('❌ Showing error to user:', errorMessage);
    
    if (this.loadingElement) this.loadingElement.style.display = 'none';
    if (this.container) this.container.style.display = 'none';
    
    if (this.errorElement) {
      this.errorElement.style.display = 'block';
      this.errorElement.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <h3 style="color: #dc3545; margin-bottom: 15px;">⚠️ Unable to Load Services</h3>
          <p style="color: #666; margin-bottom: 20px; line-height: 1.5;">
            <strong>Error:</strong> ${this.escapeHtml(errorMessage)}
          </p>
          <button onclick="location.reload()" style="
            background: linear-gradient(135deg, #00c5d7, #0099aa);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 500;
            transition: all 0.3s ease;
          ">
            🔄 Try Again
          </button>
          <p style="font-size: 0.9rem; color: #888; margin-top: 15px;">
            If this error persists, please contact the site administrator.
          </p>
        </div>
      `;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  try {
    if (document.getElementById('services-cards-container')) {
      new ServicesManager();
    } else {
      console.log('ℹ️ Services container not found - skipping initialization');
    }
  } catch (error) {
    console.error('💥 Failed to initialize Services Manager:', error);
  }
});

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ServicesManager;
}