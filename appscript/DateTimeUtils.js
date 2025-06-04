// DateTimeUtils.js - Robust date/time handling utilities for Google Apps Script

/**
 * Parse a date string and time string into a JavaScript Date object
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {string} timeStr - Time string in HH:MM format (24-hour)
 * @returns {Object} Object containing the parsed date and any errors
 */
function parseDateTime(dateStr, timeStr) {
  try {
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return {
        success: false,
        error: 'Invalid date format. Expected YYYY-MM-DD',
        date: null
      };
    }

    // Validate time format
    if (!/^\d{2}:\d{2}$/.test(timeStr)) {
      return {
        success: false,
        error: 'Invalid time format. Expected HH:MM',
        date: null
      };
    }

    // Parse date components
    const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
    
    // Parse time components
    const [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));

    // Validate date components
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return {
        success: false,
        error: 'Invalid date components',
        date: null
      };
    }

    // Validate time components
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return {
        success: false,
        error: 'Invalid time components',
        date: null
      };
    }

    // Create date object with explicit timezone
    const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
    
    // Validate the created date
    if (isNaN(date.getTime())) {
      return {
        success: false,
        error: 'Invalid date/time combination',
        date: null
      };
    }

    return {
      success: true,
      date: date,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      error: 'Error parsing date/time: ' + error.message,
      date: null
    };
  }
}

/**
 * Calculate end time based on start time and duration
 * @param {Date} startTime - Start time as Date object
 * @param {number} durationMinutes - Duration in minutes
 * @returns {Object} Object containing the end time and any errors
 */
function calculateEndTime(startTime, durationMinutes) {
  try {
    if (!(startTime instanceof Date) || isNaN(startTime.getTime())) {
      return {
        success: false,
        error: 'Invalid start time',
        endTime: null
      };
    }

    if (typeof durationMinutes !== 'number' || durationMinutes <= 0) {
      return {
        success: false,
        error: 'Invalid duration',
        endTime: null
      };
    }

    const endTime = new Date(startTime.getTime() + (durationMinutes * 60 * 1000));
    
    return {
      success: true,
      endTime: endTime,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      error: 'Error calculating end time: ' + error.message,
      endTime: null
    };
  }
}

/**
 * Validate a date/time combination for calendar event creation
 * @param {Date} startTime - Start time as Date object
 * @param {Date} endTime - End time as Date object
 * @returns {Object} Object containing validation result and any errors
 */
function validateDateTime(startTime, endTime) {
  try {
    // Check if dates are valid
    if (!(startTime instanceof Date) || isNaN(startTime.getTime())) {
      return {
        valid: false,
        error: 'Invalid start time'
      };
    }

    if (!(endTime instanceof Date) || isNaN(endTime.getTime())) {
      return {
        valid: false,
        error: 'Invalid end time'
      };
    }

    // Check if end time is after start time
    if (endTime <= startTime) {
      return {
        valid: false,
        error: 'End time must be after start time'
      };
    }

    // Check if date is in the past
    const now = new Date();
    if (startTime < now) {
      return {
        valid: false,
        error: 'Cannot create events in the past'
      };
    }

    // Check if date is too far in the future (e.g., 1 year)
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    if (startTime > oneYearFromNow) {
      return {
        valid: false,
        error: 'Cannot create events more than 1 year in advance'
      };
    }

    return {
      valid: true,
      error: null
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Error validating date/time: ' + error.message
    };
  }
}

/**
 * Format a date for display in the user's timezone
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date string
 */
function formatDateForDisplay(date) {
  try {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    };

    return date.toLocaleString(undefined, options);
  } catch (error) {
    return 'Error formatting date';
  }
}

/**
 * Format a time for display in 12-hour format
 * @param {string} time24h - Time string in 24-hour format (HH:MM)
 * @returns {string} Time string in 12-hour format
 */
function formatTimeDisplay(time24h) {
  try {
    const [hours24, minutes] = time24h.split(':').map(num => parseInt(num, 10));
    
    if (isNaN(hours24) || isNaN(minutes) || hours24 < 0 || hours24 > 23 || minutes < 0 || minutes > 59) {
      return 'Invalid Time';
    }

    let period = 'AM';
    let hours12 = hours24;

    if (hours24 >= 12) {
      period = 'PM';
      hours12 = hours24 === 12 ? 12 : hours24 - 12;
    }
    if (hours12 === 0) hours12 = 12;

    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch (error) {
    return 'Error formatting time';
  }
}

/**
 * Get the current timezone offset in minutes
 * @returns {number} Timezone offset in minutes
 */
function getTimezoneOffset() {
  return new Date().getTimezoneOffset();
}

/**
 * Get the current timezone name
 * @returns {string} Timezone name
 */
function getTimezoneName() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Parse and validate duration (in minutes).
 * Accepts string or number, returns integer if valid, throws error if not.
 * @param {string|number} duration
 * @returns {number}
 */
function validateAndParseDuration(duration) {
  const parsed = typeof duration === 'string' ? parseInt(duration, 10) : Number(duration);
  if (isNaN(parsed)) {
    throw new Error('Duration is not a number.');
  }
  if (!isFinite(parsed) || parsed <= 0) {
    throw new Error('Duration must be a positive number.');
  }
  if (parsed < 15 || parsed > 480) {
    throw new Error('Duration must be between 15 and 480 minutes.');
  }
  return parsed;
} 