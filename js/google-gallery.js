// Google Drive Dynamic Image Gallery - Auto Pull All Images
class GoogleDriveGallery {

  const config = {
  apiKey: process.env.GOOGLE_DRIVE_API_KEY,
  folderId: process.env.GOOGLE_DRIVE_FOLDER_ID
};

  constructor() {
    this.folderId = GALLERY_CONFIG.folderId;
    this.apiKey = GALLERY_CONFIG.apiKey;
    
    this.container = document.getElementById('gallery-container');
    this.loadingElement = document.getElementById('gallery-loading');
    this.errorElement = document.getElementById('gallery-error');
    
    this.images = [];
    this.currentIndex = 0;
    
    // Only initialize if gallery container exists
    if (this.container) {
      this.init();
    }
  }

  async init() {
    try {
      this.showLoading();
      await this.loadImagesFromDriveFolder();
      this.renderGallery();
      this.initLightbox();
    } catch (error) {
      console.error('Error loading gallery:', error);
      this.showError();
    }
  }

  async loadImagesFromDriveFolder() {
    // Method 1: Using Google Drive API (recommended)
    if (this.apiKey && this.folderId !== 'YOUR_GOOGLE_DRIVE_FOLDER_ID') {
      try {
        await this.loadViaAPI();
        return;
      } catch (error) {
        console.warn('API method failed, trying alternative method:', error);
      }
    }

    // Method 2: Web scraping approach (fallback)
    try {
      await this.loadViaWebScraping();
    } catch (error) {
      console.error('Web scraping method failed:', error);
      throw new Error('Unable to load images from Google Drive');
    }
  }

  async loadViaAPI() {
    const url = `https://www.googleapis.com/drive/v3/files?q='${this.folderId}'+in+parents+and+mimeType+contains+'image/'&key=${this.apiKey}&fields=files(id,name,mimeType,createdTime)&orderBy=name`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.files || data.files.length === 0) {
      throw new Error('No images found in the folder');
    }

    this.images = data.files.map(file => ({
      id: file.id,
      name: file.name,
      caption: this.formatCaption(file.name),
      thumbnailUrl: `https://drive.google.com/uc?id=${file.id}&export=download`,
      fullUrl: `https://drive.google.com/uc?id=${file.id}&export=download`,
      createdTime: file.createdTime
    }));

    // Sort by name for consistent ordering
    this.images.sort((a, b) => a.name.localeCompare(b.name));
  }

  async loadViaWebScraping() {
    // This method attempts to scrape the public folder view
    // Note: This is less reliable and may break if Google changes their interface
    
    if (this.folderId === 'YOUR_GOOGLE_DRIVE_FOLDER_ID') {
      throw new Error('Please set your Google Drive folder ID');
    }

    const folderUrl = `https://drive.google.com/drive/folders/${this.folderId}`;
    
    try {
      // Use a CORS proxy to fetch the folder page
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(folderUrl)}`;
      const response = await fetch(proxyUrl);
      const data = await response.json();
      
      // Parse the HTML to extract file information
      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, 'text/html');
      
      // This is a simplified extraction - Google's structure may change
      const fileElements = doc.querySelectorAll('[data-id]');
      const imageFiles = [];
      
      fileElements.forEach(element => {
        const fileId = element.getAttribute('data-id');
        const fileName = element.textContent.trim();
        
        // Check if it's an image file
        if (fileName && this.isImageFile(fileName) && fileId) {
          imageFiles.push({
            id: fileId,
            name: fileName,
            caption: this.formatCaption(fileName),
            thumbnailUrl: `https://drive.google.com/uc?id=${fileId}&export=download`,
            fullUrl: `https://drive.google.com/uc?id=${fileId}&export=download`
          });
        }
      });

      if (imageFiles.length === 0) {
        throw new Error('No images found using web scraping method');
      }

      this.images = imageFiles;
      
    } catch (error) {
      // If web scraping fails, fall back to manual list
      console.warn('Web scraping failed, using manual fallback');
      this.loadFallbackImageList();
    }
  }

  loadFallbackImageList() {
    // Fallback: Manual list of images (you can specify specific files here)
    this.images = [
      {
        id: 'EXAMPLE_FILE_ID_1',
        name: 'ericfull.jpg',
        caption: 'Eric full portrait'
      },
      {
        id: 'EXAMPLE_FILE_ID_2',
        name: 'forks1.jpg',
        caption: 'Tuning forks'
      },
      {
        id: 'EXAMPLE_FILE_ID_3',
        name: 'erictingsha.jpg',
        caption: 'Eric with tingsha'
      },
      {
        id: 'EXAMPLE_FILE_ID_4',
        name: 'ericbowl2.jpg',
        caption: 'Eric with second bowl'
      },
      {
        id: 'EXAMPLE_FILE_ID_5',
        name: 'Pagosa.jpg',
        caption: 'Pagosa landscape'
      }
    ];

    // Generate URLs for each image
    this.images = this.images.map(image => ({
      ...image,
      thumbnailUrl: `https://drive.google.com/uc?id=${image.id}&export=download`,
      fullUrl: `https://drive.google.com/uc?id=${image.id}&export=download`
    }));
  }

  isImageFile(filename) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  formatCaption(filename) {
    // Convert filename to readable caption
    return filename
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
      .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize words
  }

  renderGallery() {
    if (this.images.length === 0) {
      this.showError();
      return;
    }

    this.container.innerHTML = `
      <div class="gallery-thumbnails">
        ${this.images.map((image, index) => `
          <img src="${image.thumbnailUrl}" 
               alt="${image.caption}" 
               class="thumbnail" 
               data-index="${index}"
               data-caption="${image.caption}"
               loading="lazy"
               onerror="this.style.display='none'; console.warn('Failed to load image: ${image.name}');">
        `).join('')}
      </div>
    `;

    this.showGallery();
  }

  initLightbox() {
    // Add click listeners to thumbnails
    const thumbnails = this.container.querySelectorAll('.thumbnail');
    thumbnails.forEach(thumbnail => {
      thumbnail.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.openLightbox(index);
      });
    });

    // Create lightbox if it doesn't exist
    if (!document.getElementById('lightbox')) {
      this.createLightboxHTML();
    }

    // Initialize lightbox controls
    this.setupLightboxControls();
  }

  createLightboxHTML() {
    const lightboxHTML = `
      <div class="lightbox" id="lightbox">
        <div class="lightbox-content">
          <button class="lightbox-close" id="lightbox-close">&times;</button>
          <button class="lightbox-nav lightbox-prev" id="lightbox-prev">&#8249;</button>
          <button class="lightbox-nav lightbox-next" id="lightbox-next">&#8250;</button>
          
          <img class="lightbox-image" id="lightbox-image" src="" alt="">
          
          <div class="lightbox-caption" id="lightbox-caption"></div>
          <div class="lightbox-counter" id="lightbox-counter"></div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', lightboxHTML);
  }

  setupLightboxControls() {
    const lightbox = document.getElementById('lightbox');
    const closeBtn = document.getElementById('lightbox-close');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');

    closeBtn.addEventListener('click', () => this.closeLightbox());
    prevBtn.addEventListener('click', () => this.showPrevious());
    nextBtn.addEventListener('click', () => this.showNext());

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) this.closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;
      
      switch(e.key) {
        case 'Escape': this.closeLightbox(); break;
        case 'ArrowLeft': this.showPrevious(); break;
        case 'ArrowRight': this.showNext(); break;
      }
    });
  }

  openLightbox(index) {
    this.currentIndex = index;
    this.updateLightboxContent();
    document.getElementById('lightbox').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
    document.body.style.overflow = '';
  }

  showPrevious() {
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.updateLightboxContent();
  }

  showNext() {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.updateLightboxContent();
  }

  updateLightboxContent() {
    const currentImage = this.images[this.currentIndex];
    
    document.getElementById('lightbox-image').src = currentImage.fullUrl;
    document.getElementById('lightbox-image').alt = currentImage.caption;
    document.getElementById('lightbox-caption').textContent = currentImage.caption;
    document.getElementById('lightbox-counter').textContent = `${this.currentIndex + 1} / ${this.images.length}`;
  }

  showLoading() {
    if (this.loadingElement) this.loadingElement.style.display = 'block';
    if (this.errorElement) this.errorElement.style.display = 'none';
    if (this.container) this.container.style.display = 'none';
  }

  showGallery() {
    if (this.loadingElement) this.loadingElement.style.display = 'none';
    if (this.errorElement) this.errorElement.style.display = 'none';
    if (this.container) this.container.style.display = 'block';
  }

  showError() {
    if (this.loadingElement) this.loadingElement.style.display = 'none';
    if (this.errorElement) this.errorElement.style.display = 'block';
    if (this.container) this.container.style.display = 'none';
  }
}

// Helper function to extract folder ID from Google Drive folder URL
function extractFolderIdFromDriveUrl(url) {
  const match = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

// Initialize gallery when page loads
document.addEventListener('DOMContentLoaded', () => {
  new GoogleDriveGallery();
});

  renderGallery() {
    this.container.innerHTML = `
      <div class="gallery-thumbnails">
        ${this.images.map((image, index) => `
          <img src="${image.thumbnailUrl}" 
               alt="${image.caption}" 
               class="thumbnail" 
               data-index="${index}"
               data-caption="${image.caption}"
               loading="lazy"
               onerror="this.style.display='none'">
        `).join('')}
      </div>
    `;

    this.showGallery();
  }

  initLightbox() {
    // Add click listeners to thumbnails
    const thumbnails = this.container.querySelectorAll('.thumbnail');
    thumbnails.forEach(thumbnail => {
      thumbnail.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.openLightbox(index);
      });
    });

    // Create lightbox if it doesn't exist
    if (!document.getElementById('lightbox')) {
      this.createLightboxHTML();
    }

    // Initialize lightbox controls
    this.setupLightboxControls();
  }

  createLightboxHTML() {
    const lightboxHTML = `
      <div class="lightbox" id="lightbox">
        <div class="lightbox-content">
          <button class="lightbox-close" id="lightbox-close">&times;</button>
          <button class="lightbox-nav lightbox-prev" id="lightbox-prev">&#8249;</button>
          <button class="lightbox-nav lightbox-next" id="lightbox-next">&#8250;</button>
          
          <img class="lightbox-image" id="lightbox-image" src="" alt="">
          
          <div class="lightbox-caption" id="lightbox-caption"></div>
          <div class="lightbox-counter" id="lightbox-counter"></div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', lightboxHTML);
  }

  setupLightboxControls() {
    const lightbox = document.getElementById('lightbox');
    const closeBtn = document.getElementById('lightbox-close');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');

    closeBtn.addEventListener('click', () => this.closeLightbox());
    prevBtn.addEventListener('click', () => this.showPrevious());
    nextBtn.addEventListener('click', () => this.showNext());

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) this.closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;
      
      switch(e.key) {
        case 'Escape': this.closeLightbox(); break;
        case 'ArrowLeft': this.showPrevious(); break;
        case 'ArrowRight': this.showNext(); break;
      }
    });
  }

  openLightbox(index) {
    this.currentIndex = index;
    this.updateLightboxContent();
    document.getElementById('lightbox').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
    document.body.style.overflow = '';
  }

  showPrevious() {
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.updateLightboxContent();
  }

  showNext() {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.updateLightboxContent();
  }

  updateLightboxContent() {
    const currentImage = this.images[this.currentIndex];
    
    document.getElementById('lightbox-image').src = currentImage.fullUrl;
    document.getElementById('lightbox-image').alt = currentImage.caption;
    document.getElementById('lightbox-caption').textContent = currentImage.caption;
    document.getElementById('lightbox-counter').textContent = `${this.currentIndex + 1} / ${this.images.length}`;
  }

  showLoading() {
    if (this.loadingElement) this.loadingElement.style.display = 'block';
    if (this.errorElement) this.errorElement.style.display = 'none';
    if (this.container) this.container.style.display = 'none';
  }

  showGallery() {
    if (this.loadingElement) this.loadingElement.style.display = 'none';
    if (this.errorElement) this.errorElement.style.display = 'none';
    if (this.container) this.container.style.display = 'block';
  }

  showError() {
    if (this.loadingElement) this.loadingElement.style.display = 'none';
    if (this.errorElement) this.errorElement.style.display = 'block';
    if (this.container) this.container.style.display = 'none';
  }
}

// Helper function to extract file ID from Google Drive share link
function extractFileIdFromDriveUrl(url) {
  const match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

// Initialize gallery when page loads
document.addEventListener('DOMContentLoaded', () => {
  new GoogleDriveGallery();
});