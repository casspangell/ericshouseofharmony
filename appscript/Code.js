// Configuration - Single calendar approach
const AVAILABILITY_CALENDAR_ID = '34854a8095df3ec33ae6b136617b62ac9c2d48a6679c492881cd78098e6b4844@group.calendar.google.com'; // Your main calendar with both availability and bookings

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
    
    console.log('Attempting to get calendar with ID:', AVAILABILITY_CALENDAR_ID);
    const calendar = CalendarApp.getCalendarById(AVAILABILITY_CALENDAR_ID);
    
    if (!calendar) {
      console.error('Failed to get calendar. Please check if the calendar ID is correct and if the script has permission to access it.');
      return;
    }
    
    console.log('Successfully accessed calendar:', calendar.getName());
    
    let processedCount = 0;
    
    // Start from row 2 to skip headers
    for (let i = 1; i < values.length; i++) {
      try {
        // Check if status is "Booked"
        if (values[i][7] === "Booked") {
          console.log(`Processing booking in row ${i + 1}`);
          
          const name = values[i][0];
          const email = values[i][1];
          const phone = values[i][2];
          const service = values[i][3];
          const date = values[i][4]; // Date object
          const timeStr = values[i][5]; // Time as string "HH:MM"
          const duration = values[i][6] || 60; // Duration in minutes, default 60
          
          console.log('Booking details:', {
            name,
            email,
            service,
            date: date.toString(),
            timeStr,
            duration
          });
          
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
            // Set the time in Eastern Time
            startTime.setHours(parseInt(timeParts[0], 10), parseInt(timeParts[1], 10), 0);
            // Adjust for timezone
            const easternTime = Utilities.formatDate(startTime, "America/New_York", "yyyy-MM-dd HH:mm:ss");
            startTime.setTime(new Date(easternTime).getTime());
          } else if (timeStr instanceof Date) {
            startTime.setHours(timeStr.getHours(), timeStr.getMinutes(), 0);
            // Adjust for timezone
            const easternTime = Utilities.formatDate(startTime, "America/New_York", "yyyy-MM-dd HH:mm:ss");
            startTime.setTime(new Date(easternTime).getTime());
          }
          
          const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
          
          console.log('Calculated times (Eastern Time):', {
            startTime: Utilities.formatDate(startTime, "America/New_York", "yyyy-MM-dd HH:mm:ss"),
            endTime: Utilities.formatDate(endTime, "America/New_York", "yyyy-MM-dd HH:mm:ss")
          });
          
          // Create the event first with explicit timezone
          const event = calendar.createEvent(
            `Booked - ${name} (${service})`,
            startTime,
            endTime,
            {
              description: `${service}\n\nClient: ${name}\nEmail: ${email}\nPhone: ${phone}\nDuration: ${duration} minutes\n\nBooked via website`,
              guests: email,
              sendInvites: true,
              location: "Eric's House of Harmony",
              color: CalendarApp.EventColor.BLUE,
              timeZone: "America/New_York"  // Explicitly set Eastern Time
            }
          );
          
          const eventId = event.getId();
          console.log('Calendar event created successfully:', eventId);
          
          // Update the event description to include the ID and timezone
          event.setDescription(`${service}\n\nClient: ${name}\nEmail: ${email}\nPhone: ${phone}\nDuration: ${duration} minutes\n\nBooked via website\nEvent ID: ${eventId}\nTimezone: Eastern Time (America/New_York)`);
          
          // Update the row with confirmation and event ID
          sheet.getRange(i + 1, 8).setValue("Confirmed");
          sheet.getRange(i + 1, 9).setValue(eventId);
          processedCount++;
          
          console.log(`Processed booking for ${name} - ${service} on availability calendar`);
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
function isTimeAvailable(startTime, endTime, calendar) {
  console.log('Checking availability for:', {
    startTime: startTime.toString(),
    endTime: endTime.toString()
  });
  
  // Get all events in this time period
  const events = calendar.getEvents(startTime, endTime);
  console.log('Found events in time period:', events.length);
  
  // Check if there's an "Open" availability slot that covers this time
  let hasAvailability = false;
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log('Checking event:', {
      title: event.getTitle(),
      start: event.getStartTime().toString(),
      end: event.getEndTime().toString()
    });
    
    if (event.getTitle() === "Open") {
      // Make sure the open slot completely covers our requested time
      if (event.getStartTime() <= startTime && event.getEndTime() >= endTime) {
        hasAvailability = true;
        console.log('Found matching availability slot');
        break;
      }
    }
  }
  
  if (!hasAvailability) {
    console.log('No availability found for this time slot');
    return false;
  }
  
  // Check if there are any existing bookings (events starting with "Booked")
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.getTitle().startsWith("Booked")) {
      console.log('Found existing booking in this time slot');
      return false;
    }
  }
  
  console.log('Time slot is available');
  return true;
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
  const calendar = CalendarApp.getCalendarById(AVAILABILITY_CALENDAR_ID);
  
  let updatedCount = 0;
  
  // Start from row 2 to skip headers
  for (let i = 1; i < values.length; i++) {
    const eventId = values[i][8]; // Column I with event ID
    
    if (eventId && values[i][7] === "Confirmed") {
      try {
        const event = calendar.getEventById(eventId);
        
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
      "Booked",
      "" // Empty event ID for now
    ];
    
    console.log('Adding row data:', rowData);
    
    // Add the booking to the sheet
    sheet.appendRow(rowData);
    
    console.log('Booking added to sheet successfully');
    
    // Send confirmation email to customer
    try {
      sendConfirmationEmail(formData, bookingDate);
      console.log('Confirmation email sent successfully');
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Don't fail the booking if email fails
    }
    
    // Send notification email to admin
    try {
      sendAdminNotification(formData, bookingDate);
      console.log('Admin notification sent successfully');
    } catch (emailError) {
      console.error('Error sending admin notification:', emailError);
      // Don't fail the booking if email fails
    }
    
    // Process the booking immediately
    try {
      processBookings();
      console.log('Booking processing completed');
    } catch (processError) {
      console.error('Error processing booking:', processError);
      // Don't fail the whole submission if processing fails
    }
    
    return `Thank you ${formData.name}! Your booking request for "${formData.serviceName}" has been submitted successfully. You will receive a confirmation email shortly.`;
    
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

// Send confirmation email to customer
function sendConfirmationEmail(formData, bookingDate) {
  try {
    // Format the date and time for display
    const dateOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'America/New_York' // Eastern Time
    };
    
    const formattedDate = bookingDate.toLocaleDateString('en-US', dateOptions);
    const formattedTime = formatTimeDisplay(formData.time);
    
    // Email subject
    const subject = `Booking Confirmation - ${formData.serviceName} with Eric Paul Levy`;
    
    // Email body (HTML format for better presentation)
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4285f4, #00c5d7); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px;">Eric's House of Harmony</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Sound Healing & Therapy</p>
        </div>
        
        <!-- Booking Confirmation -->
        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #28a745; margin-top: 0;">✅ Booking Confirmation</h2>
          <p style="font-size: 16px; margin-bottom: 20px;">Dear ${formData.name},</p>
          <p style="font-size: 16px; line-height: 1.6;">Thank you for booking your sound healing session! Your appointment has been confirmed with the following details:</p>
        </div>
        
        <!-- Appointment Details -->
        <div style="background: white; border: 2px solid #4285f4; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
          <h3 style="color: #4285f4; margin-top: 0; margin-bottom: 20px;">📅 Appointment Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 0; font-weight: bold; color: #555; width: 30%;">Service:</td>
              <td style="padding: 12px 0; color: #333;">${formData.serviceName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 0; font-weight: bold; color: #555;">Date:</td>
              <td style="padding: 12px 0; color: #333;">${formattedDate}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 0; font-weight: bold; color: #555;">Time:</td>
              <td style="padding: 12px 0; color: #333;">${formattedTime}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 0; font-weight: bold; color: #555;">Duration:</td>
              <td style="padding: 12px 0; color: #333;">${formData.duration} minutes</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; font-weight: bold; color: #555;">Investment:</td>
              <td style="padding: 12px 0; color: #333; font-weight: bold;">${parseFloat(formData.price).toFixed(2)}</td>
            </tr>
          </table>
        </div>
        
        <!-- What to Expect -->
        <div style="background: #e8f5fe; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="color: #1976d2; margin-top: 0;">🎵 What to Expect</h3>
          <ul style="line-height: 1.8; margin: 0; padding-left: 20px;">
            <li>Please arrive 5-10 minutes early to settle in</li>
            <li>Wear comfortable, loose-fitting clothing</li>
            <li>Bring a water bottle to stay hydrated</li>
            <li>Come with an open mind and heart</li>
            <li>No experience with sound healing is necessary</li>
          </ul>
        </div>
        
        <!-- Location & Contact -->
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="color: #856404; margin-top: 0;">📍 Location & Contact</h3>
          <p style="margin: 0; line-height: 1.6; color: #856404;">
            <strong>Eric Paul Levy</strong><br>
            Sound Healer & Therapist<br>
            <br>
            <strong>Email:</strong> info@ericshouseofharmony.com<br>
            <strong>Phone:</strong> (305) 767-3370<br>
            <strong>Website:</strong> <a href="https://www.ericshouseofharmony.com" style="color: #4285f4;">www.ericshouseofharmony.com</a>
          </p>
        </div>
        
        <!-- Need to Reschedule -->
        <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
          <h4 style="color: #721c24; margin-top: 0; margin-bottom: 10px;">Need to Reschedule?</h4>
          <p style="margin: 0; color: #721c24; font-size: 14px;">
            Please contact us at least 24 hours in advance if you need to reschedule or cancel your appointment.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 20px; color: #666; font-size: 14px; border-top: 1px solid #eee;">
          <p style="margin: 0;">Thank you for choosing Eric's House of Harmony for your sound healing journey.</p>
          <p style="margin: 10px 0 0 0;">We look forward to creating a transformative experience with you!</p>
        </div>
        
      </div>
    `;
    
    // Plain text version for email clients that don't support HTML
    const plainBody = `
Eric's House of Harmony - Sound Healing & Therapy

BOOKING CONFIRMATION

Dear ${formData.name},

Thank you for booking your sound healing session! Your appointment has been confirmed with the following details:

APPOINTMENT DETAILS:
Service: ${formData.serviceName}
Date: ${formattedDate}
Time: ${formattedTime}
Duration: ${formData.duration} minutes
Investment: ${parseFloat(formData.price).toFixed(2)}

WHAT TO EXPECT:
- Please arrive 5-10 minutes early to settle in
- Wear comfortable, loose-fitting clothing
- Bring a water bottle to stay hydrated
- Come with an open mind and heart
- No experience with sound healing is necessary

CONTACT INFORMATION:
Eric Paul Levy
Sound Healer & Therapist
Email: info@ericshouseofharmony.com
Phone: (305) 767-3370
Website: www.ericshouseofharmony.com

NEED TO RESCHEDULE?
Please contact us at least 24 hours in advance if you need to reschedule or cancel your appointment.

Thank you for choosing Eric's House of Harmony for your sound healing journey. We look forward to creating a transformative experience with you!

---
Eric's House of Harmony
    `;
    
    // Send the email
    GmailApp.sendEmail(
      formData.email,           // recipient
      subject,                  // subject
      plainBody,               // plain text body
      {
        htmlBody: htmlBody,     // HTML body
        name: "Eric's House of Harmony",  // sender name
        replyTo: "info@ericshouseofharmony.com"  // reply-to address
      }
    );
    
    console.log(`Confirmation email sent to ${formData.email}`);
    
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    throw error;
  }
}

// Helper function to format time from 24h "14:30" to 12h "2:30 PM"
function formatTimeDisplay(time24h) {
  if (!time24h) return '';
  
  const [hours24, minutes] = time24h.split(':').map(num => parseInt(num, 10));
  let period = 'AM';
  let hours12 = hours24;
  
  if (hours24 >= 12) {
    period = 'PM';
    hours12 = hours24 === 12 ? 12 : hours24 - 12;
  }
  if (hours12 === 0) hours12 = 12;
  
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Send notification email to admin (Eric)
function sendAdminNotification(formData, bookingDate) {
  try {
    // Your email address for notifications
    const adminEmail = "info@ericshouseofharmony.com"; // Change this to your email
    
    // Format the date and time for display
    const dateOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'America/New_York' // Eastern Time
    };
    
    const formattedDate = bookingDate.toLocaleDateString('en-US', dateOptions);
    const formattedTime = formatTimeDisplay(formData.time);
    
    // Email subject
    const subject = `🔔 New Booking: ${formData.serviceName} - ${formData.name}`;
    
    // Email body
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        
        <div style="background: #28a745; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 24px;">🔔 New Booking Received</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #495057; margin-top: 0;">Customer Information</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #dee2e6;">
              <td style="padding: 8px 0; font-weight: bold; width: 30%;">Name:</td>
              <td style="padding: 8px 0;">${formData.name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #dee2e6;">
              <td style="padding: 8px 0; font-weight: bold;">Email:</td>
              <td style="padding: 8px 0;"><a href="mailto:${formData.email}">${formData.email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
              <td style="padding: 8px 0;"><a href="tel:${formData.phone}">${formData.phone}</a></td>
            </tr>
          </table>
        </div>
        
        <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #1976d2; margin-top: 0;">Appointment Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #bbdefb;">
              <td style="padding: 8px 0; font-weight: bold; width: 30%;">Service:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #1976d2;">${formData.serviceName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #bbdefb;">
              <td style="padding: 8px 0; font-weight: bold;">Date:</td>
              <td style="padding: 8px 0;">${formattedDate}</td>
            </tr>
            <tr style="border-bottom: 1px solid #bbdefb;">
              <td style="padding: 8px 0; font-weight: bold;">Time:</td>
              <td style="padding: 8px 0;">${formattedTime}</td>
            </tr>
            <tr style="border-bottom: 1px solid #bbdefb;">
              <td style="padding: 8px 0; font-weight: bold;">Duration:</td>
              <td style="padding: 8px 0;">${formData.duration} minutes</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Price:</td>
              <td style="padding: 8px 0; font-weight: bold;">${parseFloat(formData.price).toFixed(2)}</td>
            </tr>
          </table>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px;">
          <p style="margin: 0; color: #856404;">
            <strong>Next Steps:</strong> This booking has been automatically added to your Google Calendar and the customer has received a confirmation email. 
            Check your calendar to confirm the appointment.
          </p>
        </div>
        
      </div>
    `;
    
    const plainBody = `
NEW BOOKING RECEIVED

Customer Information:
Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}

Appointment Details:
Service: ${formData.serviceName}
Date: ${formattedDate}
Time: ${formattedTime}
Duration: ${formData.duration} minutes
Price: ${parseFloat(formData.price).toFixed(2)}

This booking has been automatically added to your Google Calendar and the customer has received a confirmation email.
    `;
    
    // Send the email
    GmailApp.sendEmail(
      adminEmail,
      subject,
      plainBody,
      {
        htmlBody: htmlBody,
        name: "Booking System"
      }
    );
    
    console.log(`Admin notification sent to ${adminEmail}`);
    
  } catch (error) {
    console.error('Error sending admin notification:', error);
    throw error;
  }
}

// Fetch availability data for the calendar view
function getAvailabilityData(serviceDuration) {
  // Set up dates in Eastern Time
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Set date range for 3 months in Eastern Time
  const startDate = new Date(currentYear, currentMonth, 1);
  const endDate = new Date(currentYear, currentMonth + 3, 0);
  
  // Convert to Eastern Time strings
  const startDateET = Utilities.formatDate(startDate, "America/New_York", "yyyy-MM-dd");
  const endDateET = Utilities.formatDate(endDate, "America/New_York", "yyyy-MM-dd");
  
  // Create new Date objects from Eastern Time strings
  const startDateETObj = new Date(startDateET);
  const endDateETObj = new Date(endDateET);
  
  // Get the availability calendar
  const calendar = CalendarApp.getCalendarById(AVAILABILITY_CALENDAR_ID);
  
  // Get all events in the date range
  const allEvents = calendar.getEvents(startDateETObj, endDateETObj);
  
  // Separate open availability and bookings
  const availabilityEvents = allEvents.filter(event => event.getTitle() === "Open");
  const bookingEvents = allEvents.filter(event => event.getTitle().startsWith("Booked"));
  
  // Create a structured data object for availability
  const availabilityData = [];
  const dateMap = {};
  
  // Default to 60 minutes if no service duration specified
  const duration = parseInt(serviceDuration) || 60;
  
  // Get current time in Eastern Time
  const now = new Date();
  const nowET = Utilities.formatDate(now, "America/New_York", "yyyy-MM-dd HH:mm:ss");
  const nowETObj = new Date(nowET);
  
  // Helper to get or create a date entry
  function getOrCreateDateEntry(dateString) {
    if (!dateMap[dateString]) {
      dateMap[dateString] = { date: dateString, available: [], booked: [] };
      availabilityData.push(dateMap[dateString]);
    }
    return dateMap[dateString];
  }
  
  // First, process all availability slots (Open)
  for (let i = 0; i < availabilityEvents.length; i++) {
    const startTime = availabilityEvents[i].getStartTime();
    const endTime = availabilityEvents[i].getEndTime();
    
    // Convert to Eastern Time
    const startTimeET = Utilities.formatDate(startTime, "America/New_York", "yyyy-MM-dd HH:mm:ss");
    const endTimeET = Utilities.formatDate(endTime, "America/New_York", "yyyy-MM-dd HH:mm:ss");
    
    const startTimeETObj = new Date(startTimeET);
    const endTimeETObj = new Date(endTimeET);
    
    const totalMinutes = Math.round((endTimeETObj - startTimeETObj) / (60 * 1000)); // total minutes available
    
    // Calculate how many slots we can fit in this availability period
    const numSlots = Math.floor(totalMinutes / duration);
    
    // Generate time slots based on service duration
    for (let slot = 0; slot < numSlots; slot++) {
      const slotStartTime = new Date(startTimeETObj.getTime() + slot * duration * 60 * 1000);
      const slotEndTime = new Date(slotStartTime.getTime() + duration * 60 * 1000);
      
      // Make sure the slot end time doesn't exceed the availability end time
      if (slotEndTime > endTimeETObj) {
        continue;
      }
      
      // Skip past time slots
      if (slotStartTime <= nowETObj) {
        continue;
      }
      
      // Format time as HH:MM in Eastern Time
      const hours = slotStartTime.getHours().toString().padStart(2, '0');
      const minutes = slotStartTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      const dateString = Utilities.formatDate(slotStartTime, "America/New_York", "yyyy-MM-dd");
      
      // Check for conflicts with any existing bookings
      let hasConflict = false;
      for (let j = 0; j < bookingEvents.length; j++) {
        const bookingStart = Utilities.formatDate(bookingEvents[j].getStartTime(), "America/New_York", "yyyy-MM-dd HH:mm:ss");
        const bookingEnd = Utilities.formatDate(bookingEvents[j].getEndTime(), "America/New_York", "yyyy-MM-dd HH:mm:ss");
        const bookingStartObj = new Date(bookingStart);
        const bookingEndObj = new Date(bookingEnd);
        if (
          (slotStartTime >= bookingStartObj && slotStartTime < bookingEndObj) || 
          (slotEndTime > bookingStartObj && slotEndTime <= bookingEndObj) ||
          (slotStartTime <= bookingStartObj && slotEndTime >= bookingEndObj)
        ) {
          hasConflict = true;
          break;
        }
      }
      
      const dateEntry = getOrCreateDateEntry(dateString);
      if (!hasConflict) {
        dateEntry.available.push({ time: timeString, duration: duration });
      } else {
        dateEntry.booked.push({ time: timeString, duration: duration });
      }
    }
  }
  
  // Also add any booked slots that are outside of "Open" slots (edge case)
  for (let i = 0; i < bookingEvents.length; i++) {
    const bookingStart = Utilities.formatDate(bookingEvents[i].getStartTime(), "America/New_York", "yyyy-MM-dd HH:mm:ss");
    const bookingStartObj = new Date(bookingStart);
    const hours = bookingStartObj.getHours().toString().padStart(2, '0');
    const minutes = bookingStartObj.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    const dateString = Utilities.formatDate(bookingStartObj, "America/New_York", "yyyy-MM-dd");
    const dateEntry = getOrCreateDateEntry(dateString);
    // Only add if not already present
    if (!dateEntry.booked.some(slot => slot.time === timeString)) {
      dateEntry.booked.push({ time: timeString, duration: duration });
    }
  }
  
  // Sort times within each date
  availabilityData.forEach(date => {
    date.available.sort((a, b) => a.time.localeCompare(b.time));
    date.booked.sort((a, b) => a.time.localeCompare(b.time));
  });
  
  // Sort dates
  availabilityData.sort((a, b) => a.date.localeCompare(b.date));
  
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