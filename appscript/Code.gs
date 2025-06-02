// Configuration - replace with your actual calendar IDs
const AVAILABILITY_CALENDAR_ID = '34854a8095df3ec33ae6b136617b62ac9c2d48a6679c492881cd78098e6b4844@group.calendar.google.com';
const BOOKING_CALENDAR_ID = '3fd59f286a11d87161378f4f2f43fe1cdc8b51a9d1bf812c01e211700d8ca94b@group.calendar.google.com';

// Creates a menu item for easy access
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Booking System')
    .addItem('Process New Bookings', 'processBookings')
    .addItem('Set Availability', 'showAvailabilityDialog')
    .addItem('Refresh Calendar Status', 'syncCalendarToSheet')
    .addToUi();
}

// FIXED: Handle web app GET requests with proper parameter passing
function doGet(e) {
  console.log('doGet called with parameters:', e.parameter);
  
  // Get the service parameters from the URL
  const params = e.parameter || {};
  
  // Extract service data from parameters
  const serviceData = {
    serviceId: params.id || null,
    serviceName: params.name || null,
    serviceDuration: params.duration || null,
    servicePrice: params.price || null
  };
  
  console.log('Extracted service data:', serviceData);
  
  // Get the HTML template
  const template = HtmlService.createTemplateFromFile('BookingForm');
  
  // IMPORTANT: Pass the service data to the template as a global variable
  template.serviceData = serviceData;
  
  console.log('Template data being passed:', template.serviceData);
  
  // Build and return the HTML with banner removal settings
  return template.evaluate()
    .setTitle('Book an Appointment with Eric')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME); // This helps remove some banners
}

// Process pending bookings from the sheet
function processBookings() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName("Bookings");
    
    if (!sheet) {
      console.log('No Bookings sheet found, nothing to process');
      return;
    }
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length <= 1) {
      console.log('No booking data to process');
      return;
    }
    
    const bookingCalendar = CalendarApp.getCalendarById(BOOKING_CALENDAR_ID);
    const availabilityCalendar = CalendarApp.getCalendarById(AVAILABILITY_CALENDAR_ID);
    
    let processedCount = 0;
    
    // Start from row 2 to skip headers
    for (let i = 1; i < values.length; i++) {
      try {
        // Check if status is "Pending"
        if (values[i][7] === "Pending") {
          const name = values[i][0];
          const email = values[i][1];
          const phone = values[i][2];
          const service = values[i][3];
          const date = values[i][4]; // Date object
          const timeStr = values[i][5]; // Time as string "HH:MM"
          const duration = values[i][6] || 60; // Duration in minutes, default 60
          
          // Validate required fields
          if (!name || !email || !service || !date || !timeStr) {
            console.warn(`Skipping row ${i + 1}: Missing required data`);
            sheet.getRange(i + 1, 8).setValue("Error - Missing Data");
            continue;
          }
          
          // Create date object for appointment
          const startTime = new Date(date);
          if (typeof timeStr === 'string') {
            const timeParts = timeStr.split(":");
            startTime.setHours(parseInt(timeParts[0], 10), parseInt(timeParts[1], 10), 0);
          } else if (timeStr instanceof Date) {
            startTime.setHours(timeStr.getHours(), timeStr.getMinutes(), 0);
          }
          
          const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
          
          // Check if the time is available
          if (isTimeAvailable(startTime, endTime, availabilityCalendar, bookingCalendar)) {
            // Create the calendar event
            const event = bookingCalendar.createEvent(
              service + " - " + name,
              startTime,
              endTime,
              {
                description: "Booking for " + name + "\nEmail: " + email + "\nPhone: " + phone,
                guests: email,
                sendInvites: true
              }
            );
            
            // Update the row with confirmation and event ID
            sheet.getRange(i + 1, 8).setValue("Confirmed");
            sheet.getRange(i + 1, 9).setValue(event.getId());
            processedCount++;
            
            console.log(`Processed booking for ${name} - ${service}`);
          } else {
            // Time not available
            sheet.getRange(i + 1, 8).setValue("Not Available");
            console.log(`Time not available for ${name} - ${service}`);
          }
        }
      } catch (rowError) {
        console.error(`Error processing row ${i + 1}:`, rowError);
        sheet.getRange(i + 1, 8).setValue("Processing Error");
      }
    }
    
    if (processedCount > 0) {
      SpreadsheetApp.getActiveSpreadsheet().toast(`Processed ${processedCount} bookings`);
    }
    
    console.log(`Booking processing complete. Processed: ${processedCount}`);
    
  } catch (error) {
    console.error('Error in processBookings:', error);
    throw error;
  }
}

// Check if a time slot is available
function isTimeAvailable(startTime, endTime, availabilityCalendar, bookingCalendar) {
  // Check if there's an availability slot that covers this time
  const availabilityEvents = availabilityCalendar.getEvents(startTime, endTime);
  
  // Look for events titled "Open" instead of "Available for Booking"
  let hasAvailability = false;
  for (let i = 0; i < availabilityEvents.length; i++) {
    if (availabilityEvents[i].getTitle() === "Open") {
      hasAvailability = true;
      break;
    }
  }
  
  if (!hasAvailability) {
    return false; // No availability found
  }
  
  // Check if there's already a booking
  const existingBookings = bookingCalendar.getEvents(startTime, endTime);
  return existingBookings.length === 0; // Available if no existing bookings
}

// Show dialog for setting availability
function showAvailabilityDialog() {
  const html = HtmlService.createHtmlOutput(`
    <h2>Set Your Availability</h2>
    <form id="availabilityForm">
      <div>
        <label for="day">Day of Week:</label>
        <select id="day" name="day">
          <option value="Monday">Monday</option>
          <option value="Tuesday">Tuesday</option>
          <option value="Wednesday">Wednesday</option>
          <option value="Thursday">Thursday</option>
          <option value="Friday">Friday</option>
          <option value="Saturday">Saturday</option>
          <option value="Sunday">Sunday</option>
        </select>
      </div>
      <div>
        <label for="startTime">Start Time (HH:MM):</label>
        <input type="time" id="startTime" name="startTime" required>
      </div>
      <div>
        <label for="endTime">End Time (HH:MM):</label>
        <input type="time" id="endTime" name="endTime" required>
      </div>
      <div>
        <label for="weeks">Number of weeks ahead:</label>
        <input type="number" id="weeks" name="weeks" value="4" min="1" max="12">
      </div>
      <div>
        <button type="button" onclick="submitAvailability()">Set Availability</button>
      </div>
    </form>
    
    <script>
      function submitAvailability() {
        const form = document.getElementById('availabilityForm');
        const data = {
          day: form.day.value,
          startTime: form.startTime.value,
          endTime: form.endTime.value,
          weeks: form.weeks.value
        };
        
        google.script.run
          .withSuccessHandler(function(message) {
            alert(message);
            google.script.host.close();
          })
          .withFailureHandler(function(error) {
            alert('Error: ' + error.message);
          })
          .setAvailabilitySlots(data);
      }
    </script>
    <style>
      form div { margin-bottom: 15px; }
      label { display: block; margin-bottom: 5px; }
    </style>
  `)
  .setWidth(400)
  .setHeight(350);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Set Your Availability');
}

// Set availability based on form submission
function setAvailabilitySlots(data) {
  const calendar = CalendarApp.getCalendarById(AVAILABILITY_CALENDAR_ID);
  
  // Days of week mapping (0 = Sunday, 1 = Monday, etc.)
  const daysOfWeek = {
    "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, 
    "Thursday": 4, "Friday": 5, "Saturday": 6
  };
  
  // Parse times
  const startTimeParts = data.startTime.split(':');
  const endTimeParts = data.endTime.split(':');
  
  // Today at midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Number of weeks to schedule
  const weeksToSchedule = parseInt(data.weeks, 10);
  const daysToSchedule = weeksToSchedule * 7;
  
  let slotsCreated = 0;
  
  // For each day in the scheduling window
  for (let i = 0; i < daysToSchedule; i++) {
    const currentDate = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
    
    // If this day matches the selected day of week
    if (currentDate.getDay() === daysOfWeek[data.day]) {
      // Create start and end datetime for the event
      const startDateTime = new Date(currentDate);
      const endDateTime = new Date(currentDate);
      
      // Set hours and minutes
      startDateTime.setHours(parseInt(startTimeParts[0], 10), parseInt(startTimeParts[1], 10));
      endDateTime.setHours(parseInt(endTimeParts[0], 10), parseInt(endTimeParts[1], 10));
      
      // Create the event with "Open" title instead of "Available for Booking"
      calendar.createEvent(
        "Open",
        startDateTime,
        endDateTime,
        {color: CalendarApp.EventColor.GREEN}
      );
      
      slotsCreated++;
    }
  }
  
  return `Created ${slotsCreated} availability slots for ${data.day}s from ${data.startTime} to ${data.endTime} for the next ${weeksToSchedule} weeks.`;
}

// Sync calendar status back to sheet (for cancelled events, etc.)
function syncCalendarToSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Bookings");
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const bookingCalendar = CalendarApp.getCalendarById(BOOKING_CALENDAR_ID);
  
  let updatedCount = 0;
  
  // Start from row 2 to skip headers
  for (let i = 1; i < values.length; i++) {
    const eventId = values[i][8]; // Column I with event ID
    
    if (eventId && values[i][7] === "Confirmed") {
      try {
        const event = bookingCalendar.getEventById(eventId);
        
        // If event doesn't exist, it was deleted
        if (!event) {
          sheet.getRange(i + 1, 8).setValue("Canceled");
          updatedCount++;
        }
      } catch (e) {
        // Event not found
        sheet.getRange(i + 1, 8).setValue("Canceled");
        updatedCount++;
      }
    }
  }
  
  SpreadsheetApp.getActiveSpreadsheet().toast(`Updated ${updatedCount} entries`);
}

// Process a booking submission from the web form
function submitBooking(formData) {
  try {
    console.log('Processing booking submission:', formData);
    
    // Get the active spreadsheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    console.log('Spreadsheet found:', spreadsheet.getName());
    
    // Try to get the Bookings sheet
    let sheet = spreadsheet.getSheetByName("Bookings");
    
    // If no Bookings sheet exists, create it
    if (!sheet) {
      console.log('Bookings sheet not found, creating it...');
      sheet = spreadsheet.insertSheet("Bookings");
      
      // Add headers
      sheet.getRange(1, 1, 1, 9).setValues([[
        "Name", "Email", "Phone", "Service", "Date", "Time", "Duration", "Status", "Event ID"
      ]]);
      
      // Format headers
      sheet.getRange(1, 1, 1, 9).setFontWeight("bold");
      console.log('Bookings sheet created with headers');
    }
    
    console.log('Using sheet:', sheet.getName());
    
    // Validate form data
    if (!formData.name || !formData.email || !formData.serviceName) {
      throw new Error('Missing required booking information');
    }
    
    // Format the date
    let bookingDate;
    try {
      bookingDate = new Date(formData.date);
      if (isNaN(bookingDate.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (error) {
      throw new Error('Invalid booking date: ' + formData.date);
    }
    
    // Prepare the row data
    const rowData = [
      formData.name || '',
      formData.email || '',
      formData.phone || '',
      formData.serviceName || '',
      bookingDate,
      formData.time || '',
      parseInt(formData.duration) || 60,
      "Pending",
      "" // Empty event ID for now
    ];
    
    console.log('Adding row data:', rowData);
    
    // Add the booking to the sheet
    sheet.appendRow(rowData);
    
    console.log('Booking added to sheet successfully');
    
    // Process the booking immediately
    try {
      processBookings();
      console.log('Booking processing completed');
    } catch (processError) {
      console.error('Error processing booking:', processError);
      // Don't fail the whole submission if processing fails
    }
    
    return `Thank you ${formData.name}! Your booking request for "${formData.serviceName}" has been submitted successfully.`;
    
  } catch (error) {
    console.error('Error in submitBooking:', error);
    
    // Return a more helpful error message
    if (error.message.includes('appendRow')) {
      return 'Error: Unable to access the booking database. Please contact us directly at info@ericshouseofharmony.com';
    } else if (error.message.includes('permission')) {
      return 'Error: Database permission issue. Please contact us directly at info@ericshouseofharmony.com';
    } else {
      return 'Error: ' + error.message + '. Please contact us directly at info@ericshouseofharmony.com if this continues.';
    }
  }
}

// Fetch availability data for the calendar view
function getAvailabilityData(serviceDuration) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Set date range for 3 months
  const startDate = new Date(currentYear, currentMonth, 1);
  const endDate = new Date(currentYear, currentMonth + 3, 0);
  
  // Get availability and booking calendars
  const availabilityCalendar = CalendarApp.getCalendarById(AVAILABILITY_CALENDAR_ID);
  const bookingCalendar = CalendarApp.getCalendarById(BOOKING_CALENDAR_ID);
  
  // Get all "Open" events
  const availabilityEvents = availabilityCalendar.getEvents(startDate, endDate);
  const bookingEvents = bookingCalendar.getEvents(startDate, endDate);
  
  // Create a structured data object for availability
  const availabilityData = [];
  
  // Default to 60 minutes if no service duration specified
  const duration = parseInt(serviceDuration) || 60;
  
  for (let i = 0; i < availabilityEvents.length; i++) {
    if (availabilityEvents[i].getTitle() === "Open") {
      const startTime = availabilityEvents[i].getStartTime();
      const endTime = availabilityEvents[i].getEndTime();
      const totalMinutes = Math.round((endTime - startTime) / (60 * 1000)); // total minutes available
      
      // Format date as YYYY-MM-DD
      const year = startTime.getFullYear();
      const month = (startTime.getMonth() + 1).toString().padStart(2, '0');
      const day = startTime.getDate().toString().padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      // Find if this date already exists in the data
      let dateEntry = availabilityData.find(entry => entry.date === dateString);
      
      if (!dateEntry) {
        dateEntry = {
          date: dateString,
          times: []
        };
        availabilityData.push(dateEntry);
      }
      
      // Calculate how many slots we can fit in this availability period
      const numSlots = Math.floor(totalMinutes / duration);
      
      // Generate time slots based on service duration
      for (let slot = 0; slot < numSlots; slot++) {
        const slotStartTime = new Date(startTime.getTime() + slot * duration * 60 * 1000);
        const slotEndTime = new Date(slotStartTime.getTime() + duration * 60 * 1000);
        
        // Make sure the slot end time doesn't exceed the availability end time
        if (slotEndTime > endTime) {
          continue;
        }
        
        // Format time as HH:MM
        const hours = slotStartTime.getHours().toString().padStart(2, '0');
        const minutes = slotStartTime.getMinutes().toString().padStart(2, '0');
        const timeString = `${hours}:${minutes}`;
        
        // Check if this slot is already booked
        let isBooked = false;
        for (let j = 0; j < bookingEvents.length; j++) {
          const bookingStart = bookingEvents[j].getStartTime();
          const bookingEnd = bookingEvents[j].getEndTime();
          
          // Check if there's any overlap with existing bookings
          if (
            (slotStartTime >= bookingStart && slotStartTime < bookingEnd) || 
            (slotEndTime > bookingStart && slotEndTime <= bookingEnd) ||
            (slotStartTime <= bookingStart && slotEndTime >= bookingEnd)
          ) {
            isBooked = true;
            break;
          }
        }
        
        // Only add unbooked slots
        if (!isBooked) {
          dateEntry.times.push({
            time: timeString,
            duration: duration
          });
        }
      }
    }
  }
  
  return availabilityData;
}

// Get services from the CSV data
function getServicesFromCSV() {
  try {
    // Get the CSV URL from the script
    const response = UrlFetchApp.fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vS-SZoJOTTt_ireuf0_GDyH5BA3MP-KFMqn4MB6UG65YjOeNRqzLmwljCNXW52iOHoAnOnSOjQKJDM5/pub?output=csv");
    
    if (response.getResponseCode() !== 200) {
      console.error("Failed to fetch CSV:", response.getResponseCode());
      return getDefaultServices();
    }
    
    const csvText = response.getContentText();
    const services = parseCSVForServices(csvText);
    
    return services.length > 0 ? services : getDefaultServices();
  } catch (error) {
    console.error("Error fetching services from CSV:", error);
    return getDefaultServices();
  }
}

// Parse CSV for services - Updated to match your spreadsheet format
function parseCSVForServices(csvText) {
  const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
  const services = [];
  
  if (lines.length < 2) {
    return [];
  }
  
  // Parse header
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  
  // Find column indices based on your spreadsheet
  const nameIndex = findColumnIndex(headers, ['service name']);
  const descIndex = findColumnIndex(headers, ['description']);
  const durationIndex = findColumnIndex(headers, ['duration']);
  const priceIndex = findColumnIndex(headers, ['price']);
  const categoryIndex = findColumnIndex(headers, ['category']);
  const imageIndex = findColumnIndex(headers, ['image']);
  
  if (nameIndex === -1) {
    return [];
  }
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const columns = parseCSVLine(lines[i]);
    
    // Skip if no name
    const name = columns[nameIndex] ? columns[nameIndex].trim() : '';
    if (!name) continue;
    
    // Extract price - remove "$" and convert to number
    let price = 0;
    if (priceIndex !== -1 && columns[priceIndex]) {
      const priceText = columns[priceIndex].replace(/[^\d.]/g, '');
      price = parseFloat(priceText) || 0;
    }
    
    // Extract duration in minutes
    let duration = 60; // default
    if (durationIndex !== -1 && columns[durationIndex]) {
      const durationText = columns[durationIndex].toLowerCase().trim();
      // Parse formats like "30 min", "1 hour", etc.
      if (durationText.includes("min")) {
        const match = durationText.match(/(\d+)/);
        if (match) {
          duration = parseInt(match[1]);
        }
      } else if (durationText.includes("hour")) {
        const match = durationText.match(/(\d+)/);
        if (match) {
          duration = parseInt(match[1]) * 60;
        }
      }
    }
    
    services.push({
      id: i,
      name: name,
      description: descIndex !== -1 && columns[descIndex] ? columns[descIndex].trim() : '',
      duration: duration,
      price: price,
      category: categoryIndex !== -1 && columns[categoryIndex] ? columns[categoryIndex].trim() : '',
      image: imageIndex !== -1 && columns[imageIndex] ? columns[imageIndex].trim() : ''
    });
  }
  
  return services;
}

// Utility functions
function findColumnIndex(headers, possibleNames) {
  for (const name of possibleNames) {
    const index = headers.findIndex(header => header.includes(name));
    if (index !== -1) return index;
  }
  return -1;
}

function parseCSVLine(line) {
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