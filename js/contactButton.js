class ContactButton {
  constructor(options = {}) {
    this.options = {
      type: options.type || 'email', // 'email' or 'phone'
      value: options.value || '', // email address or phone number
      text: options.text || 'Contact Us',
      style: options.style || 'primary', // 'primary', 'secondary', 'minimal', 'floating'
      size: options.size || 'medium', // 'small', 'medium', 'large'
      position: options.position || 'inline', // 'inline', 'fixed-top-right', 'fixed-bottom-right', 'fixed-bottom-left'
      icon: options.icon !== false, // true/false
      animation: options.animation || 'fade-in', // 'fade-in', 'slide-in', 'bounce-in', 'none'
      container: options.container || document.body,
      loading: options.loading || false,
      onClick: options.onClick || null,
      onSuccess: options.onSuccess || null,
      onError: options.onError || null
    };

    this.init();
  }

  init() {
    this.createButton();
    this.addEventListeners();
  }

  createButton() {
    const button = document.createElement('a');
    button.className = this.generateClasses();
    button.href = this.generateHref();
    button.setAttribute('data-contact-type', this.options.type);
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', this.generateAriaLabel());
    
    if (this.options.icon) {
      const icon = document.createElement('i');
      icon.className = `contact-btn__icon fas fa-${this.options.type === 'email' ? 'envelope' : 'phone'}`;
      icon.setAttribute('aria-hidden', 'true');
      button.appendChild(icon);
    }

    const text = document.createTextNode(this.options.text);
    button.appendChild(text);

    if (this.options.loading) {
      button.classList.add('contact-btn--loading');
    }

    this.options.container.appendChild(button);
    this.button = button;
  }

  generateClasses() {
    const classes = ['contact-btn'];
    
    // Add style variant
    classes.push(`contact-btn--${this.options.style}`);
    
    // Add size variant
    classes.push(`contact-btn--${this.options.size}`);
    
    // Add position variant if not inline
    if (this.options.position !== 'inline') {
      classes.push('contact-btn--fixed');
      classes.push(`contact-btn--${this.options.position}`);
    }
    
    // Add animation class
    if (this.options.animation !== 'none') {
      classes.push(`contact-btn--${this.options.animation}`);
    }
    
    return classes.join(' ');
  }

  generateHref() {
    return this.options.type === 'email' 
      ? `mailto:${this.options.value}`
      : `tel:${this.options.value}`;
  }

  generateAriaLabel() {
    return `${this.options.type === 'email' ? 'Send email to' : 'Call'} ${this.options.value}`;
  }

  addEventListeners() {
    this.button.addEventListener('click', async (e) => {
      if (this.options.loading) return;

      if (this.options.onClick) {
        try {
          this.setLoading(true);
          await this.options.onClick(e);
          if (this.options.onSuccess) {
            this.options.onSuccess();
          }
        } catch (error) {
          if (this.options.onError) {
            this.options.onError(error);
          }
        } finally {
          this.setLoading(false);
        }
      }
    });
  }

  // Public methods for updating button properties
  updateText(newText) {
    this.options.text = newText;
    this.button.textContent = newText;
  }

  updateValue(newValue) {
    this.options.value = newValue;
    this.button.href = this.generateHref();
    this.button.setAttribute('aria-label', this.generateAriaLabel());
  }

  updateStyle(newStyle) {
    this.button.classList.remove(`contact-btn--${this.options.style}`);
    this.options.style = newStyle;
    this.button.classList.add(`contact-btn--${newStyle}`);
  }

  setLoading(isLoading) {
    this.options.loading = isLoading;
    if (isLoading) {
      this.button.classList.add('contact-btn--loading');
    } else {
      this.button.classList.remove('contact-btn--loading');
    }
  }

  // Static method for auto-initialization
  static initializeAll() {
    const buttons = document.querySelectorAll('[data-contact-button]');
    buttons.forEach(element => {
      // Get all data attributes
      const type = element.dataset.type || 'email';
      const value = element.dataset.value || '';
      const text = element.dataset.text || 'Contact Us';
      const style = element.dataset.style || 'primary';
      const size = element.dataset.size || 'medium';
      const position = element.dataset.position || 'inline';
      const icon = element.dataset.icon !== 'false';
      const animation = element.dataset.animation || 'fade-in';
      const loading = element.dataset.loading === 'true';

      // Get callback functions from window object if they exist
      const onClick = element.dataset.onClick ? window[element.dataset.onClick] : null;
      const onSuccess = element.dataset.onSuccess ? window[element.dataset.onSuccess] : null;
      const onError = element.dataset.onError ? window[element.dataset.onError] : null;

      // Create new instance with options
      new ContactButton({
        type,
        value,
        text,
        style,
        size,
        position,
        icon,
        animation,
        container: element,
        loading,
        onClick,
        onSuccess,
        onError
      });
    });
  }
}

// Auto-initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  ContactButton.initializeAll();
}); 