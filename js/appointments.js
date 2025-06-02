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
    this.retryAttempts = 2; // Reduced attempts
    this.retryDelay = 1500; // 1.5 seconds between retries
    this.isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    this.init();
  }

  async init() {
    // Add a global timeout as a last resort
    const globalTimeout = setTimeout(() => {
      console.error('🚨 Global timeout reached - forcing error display');
      this.showError('Request timed out - Google Sheets is taking too long to respond');
    }, 15000); // 15 second global timeout

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
        console.log(`Loading services from Google Sheets - attempt ${attempt}/${this.retryAttempts}`);
        await this.loadServices();
        return; // Success, exit retry loop
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
        signal: AbortSignal.timeout(8000) // Reduced to 8 seconds for faster failure
      });

      const fetchTime = Date.now() - startTime;

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

      console.log(`✅ Successfully loaded ${services.length} services from Google Sheets`);
      this.renderServices(services);
      this.showServices();
      
    } catch (error) {
      console.error('💥 Fetch error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Handle specific error types with more helpful messages
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
    
    // Parse header to understand column structure
    const headers = this.parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    
    // Find column indices
    const columnMap = {
      name: this.findColumnIndex(headers, ['service name', 'name', 'service']),
      description: this.findColumnIndex(headers, ['description', 'desc']),
      duration: this.findColumnIndex(headers, ['duration', 'time']),
      price: this.findColumnIndex(headers, ['price', 'cost']),
      category: this.findColumnIndex(headers, ['category', 'type']),
      image: this.findColumnIndex(headers, ['image', 'img', 'icon'])
    };
    
    // Check if we found essential columns
    if (columnMap.name === -1) {
      throw new Error('Could not find "Service Name" or "Name" column in Google Sheets');
    }
    if (columnMap.description === -1) {
      throw new Error('Could not find "Description" column in Google Sheets');
    }
    
    // Skip header row (index 0) and parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      try {
        const columns = this.parseCSVLine(line);
        
        // Extract service data using column mapping
        const service = {
          name: this.getColumnValue(columns, columnMap.name) || '',
          description: this.getColumnValue(columns, columnMap.description) || '',
          duration: this.getColumnValue(columns, columnMap.duration) || '',
          price: this.getColumnValue(columns, columnMap.price) || '',
          category: this.getColumnValue(columns, columnMap.category) || '',
          image: this.getColumnValue(columns, columnMap.image) || ''
        };
        
        // Only add service if it has a name and description
        if (service.name.trim() && service.description.trim()) {
          services.push(service);
        } else {
          console.warn(`⚠️ Skipping row ${i + 1}: Missing name or description`);
        }
        
      } catch (error) {
        console.warn(`⚠️ Error parsing row ${i + 1}:`, error.message);
        continue; // Skip problematic lines
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
          // Handle escaped quotes ("")
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
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
      throw new Error('Services container element not found - check that id="services-cards-container" exists');
    }

    this.container.innerHTML = '';
    
    services.forEach((service, index) => {
      try {
        const serviceCard = this.createServiceCard(service, index + 1);
        this.container.appendChild(serviceCard);
      } catch (error) {
        console.error(`❌ Error creating card for service ${index + 1}:`, error);
      }
    });
  }

  createServiceCard(service, number) {
    const card = document.createElement('div');
    card.className = 'service-card-harmony';
    
    // Determine button text and link based on service type
    let buttonHTML = '';
    const serviceName = service.name.toLowerCase();
    
    if (serviceName.includes('workshop') || serviceName.includes('great song')) {
      buttonHTML = `<a class="btn smooth-scroll" href="https://www.ericshouseofharmony.com/greatsong.html">Learn More</a>`;
    } else {
      buttonHTML = `<a class="btn smooth-scroll" href="#connect">Book Now</a>`;
    }

    // Format price display
    const priceDisplay = this.formatPrice(service.price);

    // Format duration display
    const durationDisplay = this.formatDuration(service.duration);

    // Clean up description
    const description = this.cleanDescription(service.description);

    // Get the correct icon path
    const iconPath = this.getIconPath(service.image);

    card.innerHTML = `
      <div class="service-card-number">${number}</div>
      <div class="service-card-icon">
        <img src="${iconPath}" alt="${service.name} Icon" onerror="this.style.display='none'">
      </div>
      <h3 class="service-card-title">${this.escapeHtml(service.name)}</h3>
      <p class="service-card-desc">${this.escapeHtml(description)}</p>
      ${durationDisplay ? `<div class="service-duration">Duration: ${durationDisplay}</div>` : ''}
      <div class="service-price">${priceDisplay}</div>
      ${buttonHTML}
    `;
    
    return card;
  }

  getIconPath(imageValue) {
    // Map of spreadsheet image values to file paths
    const iconMap = {
      'voice': '/img/serviceicons/voice.png',
      'sound': '/img/serviceicons/sound.png',
      'headphones': '/img/serviceicons/headphones.png',
      'fork': '/img/serviceicons/fork.png',
      'equilizer': '/img/serviceicons/equilizer.png',
      'bowl': '/img/serviceicons/bowl.png'
    };

    // Clean up the image value (remove spaces, convert to lowercase)
    const cleanImageValue = imageValue ? imageValue.trim().toLowerCase() : '';
    
    // Return the mapped path or a default
    const iconPath = iconMap[cleanImageValue];
    
    if (iconPath) {
      return iconPath;
    } else {
      console.warn(`⚠️ Unknown image value: "${imageValue}" - using default icon`);
      return '/img/serviceicons/default.png'; // You can create a default icon or remove this line
    }
  }

  formatPrice(price) {
    if (!price || price === '0' || price.toLowerCase().includes('contact')) {
      return 'Contact for Pricing';
    }
    
    // Remove any existing currency symbols and whitespace
    const cleanPrice = price.replace(/[$,\s]/g, '');
    
    // Check if it's a valid number
    if (!isNaN(parseFloat(cleanPrice)) && isFinite(cleanPrice)) {
      return `$${parseFloat(cleanPrice).toFixed(2)}`;
    }
    
    return price; // Return original if can't parse
  }

  formatDuration(duration) {
    if (!duration) return '';
    
    // Handle common duration formats
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
    
    // Remove excessive whitespace and line breaks
    return description.replace(/\s+/g, ' ').trim();
  }

  escapeHtml(text) {
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
          " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
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
    // Only initialize if we're on a page with services
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