// Calendar.js - All calendar-related functions
// This file handles calendar triggers, event monitoring, and sync operations

// Enhanced setup function that tries to determine calendar ownership
function setupSpecificCalendarTrigger() {
  try {
    console.log('Setting up trigger for specific calendar...');
    
    // Delete any existing calendar triggers to avoid duplicates
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onSpecificCalendarChange') {
        ScriptApp.deleteTrigger(trigger);
        console.log('Removed existing trigger');
      }
    });
    
    // Get the specific calendar
    const calendar = CalendarApp.getCalendarById(AVAILABILITY_CALENDAR_ID);
    
    if (!calendar) {
      throw new Error('Calendar not found with ID: ' + AVAILABILITY_CALENDAR_ID);
    }
    
    console.log('Calendar found:', calendar.getName());
    
    // Check if we have edit access to this calendar
    try {
      // Try to get calendar details to test access level
      const calendarDetails = calendar.getDescription(); // This will fail if no edit access
      console.log('Calendar access confirmed');
    } catch (accessError) {
      throw new Error('Insufficient permissions to monitor this calendar. You need to be the owner or have edit access.');
    }
    
    // For shared calendars, we need to monitor the current user's calendar
    // but filter events that belong to our specific calendar
    const currentUserEmail = Session.getActiveUser().getEmail();
    console.log('Setting up trigger for user:', currentUserEmail);
    
    // Create the trigger on the current user's calendar
    // We'll filter for our specific calendar events in the handler
    ScriptApp.newTrigger('onSpecificCalendarChange')
      .forUserCalendar(currentUserEmail)
      .onEventUpdated()
      .create();
    
    console.log('Specific calendar trigger created successfully');
    SpreadsheetApp.getActiveSpreadsheet().toast('Calendar trigger installed! Will monitor for changes to your booking calendar.');
    
    // Store the calendar ID in script properties for the trigger handler
    PropertiesService.getScriptProperties().setProperty('MONITORED_CALENDAR_ID', AVAILABILITY_CALENDAR_ID);
    
  } catch (error) {
    console.error('Error setting up specific calendar trigger:', error);
    SpreadsheetApp.getActiveSpreadsheet().toast('Error: ' + error.message + '\n\nTry using "Setup Periodic Sync" instead.');
  }
}

// Enhanced trigger handler that focuses on our specific calendar
function onSpecificCalendarChange(e) {
  console.log('=== Calendar Event Changed ===');
  console.log('Trigger event details:', e);
  
  try {
    // Get the monitored calendar ID from script properties
    const monitoredCalendarId = PropertiesService.getScriptProperties().getProperty('MONITORED_CALENDAR_ID') || AVAILABILITY_CALENDAR_ID;
    
    console.log('Monitoring calendar ID:', monitoredCalendarId);
    
    // Add a small delay to ensure calendar changes are fully processed
    Utilities.sleep(3000);
    
    // Check specifically for changes to our booking calendar
    updateBookingStatusesFromSpecificCalendar(monitoredCalendarId);
    
    console.log('Specific calendar sync completed');
    
  } catch (error) {
    console.error('Error in specific calendar event change handler:', error);
  }
}

// Enhanced function to check only our specific booking calendar
function updateBookingStatusesFromSpecificCalendar(calendarId) {
  try {
    console.log('Checking for deleted events in calendar:', calendarId);
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName("Bookings");
    
    if (!sheet) {
      console.log('No Bookings sheet found');
      return;
    }
    
    // Get our specific calendar
    const calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) {
      console.error('Could not access calendar:', calendarId);
      return;
    }
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    let updatedCount = 0;
    let deletedCount = 0;
    
    console.log(`Checking ${values.length - 1} bookings for deleted events...`);
    
    // Check each booking that has an event ID
    for (let i = 1; i < values.length; i++) {
      const eventId = values[i][8]; // Column I with event ID
      const currentStatus = values[i][7]; // Column H with status
      const customerName = values[i][0]; // Column A
      
      if (eventId && (currentStatus === "Confirmed" || currentStatus === "Booked")) {
        try {
          // Try to get the event from our specific calendar
          const event = calendar.getEventById(eventId);
          
          if (!event) {
            // Event was deleted from calendar
            console.log(`Event ${eventId} (${customerName}) was deleted from calendar`);
            
            // Update status to "Cancelled"
            sheet.getRange(i + 1, 8).setValue("Cancelled");
            
            // Apply strikethrough formatting to the entire row
            const rowRange = sheet.getRange(i + 1, 1, 1, sheet.getLastColumn());
            rowRange.setFontLine('line-through');
            
            // Optional: Change background color to indicate cancellation
            rowRange.setBackground('#f8f9fa'); // Light gray background
            
            // Optional: Change text color to gray
            rowRange.setFontColor('#6c757d');
            
            deletedCount++;
            updatedCount++;
            
            console.log(`Applied strikethrough formatting to row ${i + 1} for ${customerName}`);
            
            // Send cancellation email to customer
            try {
              const customerEmail = values[i][1];
              const service = values[i][3];
              const date = values[i][4];
              const time = values[i][5];
              
              if (customerEmail) {
                sendCancellationNotification(customerEmail, customerName, service, date, time);
                console.log(`Cancellation email sent to ${customerEmail}`);
              }
            } catch (emailError) {
              console.error('Error sending cancellation email:', emailError);
            }
          } else {
            // Event still exists, check if it was modified
            const eventTitle = event.getTitle();
            if (!eventTitle.startsWith("Booked")) {
              console.log(`Event ${eventId} title changed to: ${eventTitle}`);
              // Optionally handle title changes here
            }
          }
        } catch (eventError) {
          // Event not found (deleted) or access error
          if (eventError.message && (eventError.message.includes('not found') || 
                                    eventError.message.includes('does not exist'))) {
            console.log(`Event ${eventId} (${customerName}) not found - marking as cancelled`);
            
            // Update status to "Cancelled"
            sheet.getRange(i + 1, 8).setValue("Cancelled");
            
            // Apply strikethrough formatting to the entire row
            const rowRange = sheet.getRange(i + 1, 1, 1, sheet.getLastColumn());
            rowRange.setFontLine('line-through');
            
            // Optional: Change background color to indicate cancellation
            rowRange.setBackground('#f8f9fa'); // Light gray background
            
            // Optional: Change text color to gray
            rowRange.setFontColor('#6c757d');
            
            deletedCount++;
            updatedCount++;
            
            console.log(`Applied strikethrough formatting to row ${i + 1} for ${customerName}`);
          } else {
            console.error(`Error checking event ${eventId}:`, eventError.message);
          }
        }
      }
    }
    
    if (updatedCount > 0) {
      console.log(`Updated ${updatedCount} bookings (${deletedCount} deletions detected)`);
      SpreadsheetApp.getActiveSpreadsheet().toast(`${deletedCount} deleted calendar events detected and bookings updated with strikethrough formatting`);
    } else {
      console.log('No deleted events found');
    }
    
  } catch (error) {
    console.error('Error in updateBookingStatusesFromSpecificCalendar:', error);
  }
}

// Function to manually test the strikethrough formatting
function testStrikethroughFormatting() {
  try {
    console.log('=== Testing Strikethrough Formatting ===');
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName("Bookings");
    
    if (!sheet) {
      SpreadsheetApp.getActiveSpreadsheet().toast('No Bookings sheet found');
      return;
    }
    
    // Find a test row to format (look for any booking)
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    let testRowFound = false;
    
    for (let i = 1; i < values.length; i++) {
      const currentStatus = values[i][7]; // Status column
      const customerName = values[i][0]; // Name column
      
      // Find a row that's not already cancelled
      if (currentStatus && currentStatus !== "Cancelled" && customerName) {
        console.log(`Testing formatting on row ${i + 1}: ${customerName}`);
        
        // Apply test formatting (we'll undo this)
        const rowRange = sheet.getRange(i + 1, 1, 1, sheet.getLastColumn());
        
        // Save original formatting
        const originalFontLines = rowRange.getFontLines();
        const originalBackgrounds = rowRange.getBackgrounds();
        const originalFontColors = rowRange.getFontColors();
        
        // Apply strikethrough formatting
        rowRange.setFontLine('line-through');
        rowRange.setBackground('#f8f9fa');
        rowRange.setFontColor('#6c757d');
        
        console.log('Applied test formatting');
        
        // Wait 3 seconds so you can see it
        Utilities.sleep(3000);
        
        // Restore original formatting
        rowRange.setFontLines(originalFontLines);
        rowRange.setBackgrounds(originalBackgrounds);
        rowRange.setFontColors(originalFontColors);
        
        console.log('Restored original formatting');
        
        SpreadsheetApp.getActiveSpreadsheet().toast(`Strikethrough test completed on ${customerName}'s booking`);
        testRowFound = true;
        break;
      }
    }
    
    if (!testRowFound) {
      SpreadsheetApp.getActiveSpreadsheet().toast('No suitable test row found. Add a booking first.');
    }
    
    console.log('=== Strikethrough Test Complete ===');
    
  } catch (error) {
    console.error('Error testing strikethrough formatting:', error);
    SpreadsheetApp.getActiveSpreadsheet().toast('Error testing formatting: ' + error.message);
  }
}

// Function to manually cancel a booking (for testing)
function manualCancelBooking() {
  try {
    console.log('=== Manual Booking Cancellation Test ===');
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName("Bookings");
    
    if (!sheet) {
      SpreadsheetApp.getActiveSpreadsheet().toast('No Bookings sheet found');
      return;
    }
    
    // Find the first confirmed booking to cancel
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    for (let i = 1; i < values.length; i++) {
      const currentStatus = values[i][7]; // Status column
      const customerName = values[i][0]; // Name column
      const eventId = values[i][8]; // Event ID column
      
      if (currentStatus === "Confirmed" && customerName && eventId) {
        console.log(`Manually cancelling booking for ${customerName}`);
        
        // Update status to "Cancelled"
        sheet.getRange(i + 1, 8).setValue("Cancelled");
        
        // Apply strikethrough formatting to the entire row
        const rowRange = sheet.getRange(i + 1, 1, 1, sheet.getLastColumn());
        rowRange.setFontLine('line-through');
        rowRange.setBackground('#f8f9fa');
        rowRange.setFontColor('#6c757d');
        
        console.log(`Applied cancellation formatting to ${customerName}'s booking`);
        SpreadsheetApp.getActiveSpreadsheet().toast(`Manually cancelled ${customerName}'s booking with strikethrough formatting`);
        
        break;
      }
    }
    
    console.log('=== Manual Cancellation Test Complete ===');
    
  } catch (error) {
    console.error('Error in manual cancellation test:', error);
    SpreadsheetApp.getActiveSpreadsheet().toast('Error: ' + error.message);
  }
}

// Function to remove formatting from cancelled bookings (if needed)
function removeCancelledFormatting() {
  try {
    console.log('=== Removing Cancelled Formatting ===');
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName("Bookings");
    
    if (!sheet) {
      SpreadsheetApp.getActiveSpreadsheet().toast('No Bookings sheet found');
      return;
    }
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    let restoredCount = 0;
    
    for (let i = 1; i < values.length; i++) {
      const currentStatus = values[i][7]; // Status column
      
      if (currentStatus === "Cancelled") {
        const rowRange = sheet.getRange(i + 1, 1, 1, sheet.getLastColumn());
        
        // Remove strikethrough and restore normal formatting
        rowRange.setFontLine('none');
        rowRange.setBackground('#ffffff'); // White background
        rowRange.setFontColor('#000000'); // Black text
        
        restoredCount++;
      }
    }
    
    console.log(`Restored formatting for ${restoredCount} cancelled bookings`);
    SpreadsheetApp.getActiveSpreadsheet().toast(`Removed strikethrough formatting from ${restoredCount} cancelled bookings`);
    
  } catch (error) {
    console.error('Error removing cancelled formatting:', error);
    SpreadsheetApp.getActiveSpreadsheet().toast('Error: ' + error.message);
  }
}

// Test function to verify calendar access and trigger functionality
function testSpecificCalendarAccess() {
  try {
    console.log('=== Testing Specific Calendar Access ===');
    
    const calendar = CalendarApp.getCalendarById(AVAILABILITY_CALENDAR_ID);
    
    if (!calendar) {
      console.error('❌ Calendar not found with ID:', AVAILABILITY_CALENDAR_ID);
      SpreadsheetApp.getActiveSpreadsheet().toast('Calendar not found. Check your AVAILABILITY_CALENDAR_ID.');
      return;
    }
    
    console.log('✅ Calendar found:', calendar.getName());
    console.log('Calendar ID:', calendar.getId());
    
    // Test access level
    try {
      const testDescription = calendar.getDescription();
      console.log('✅ Calendar access: Full access confirmed');
      
      // Test event listing
      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const events = calendar.getEvents(now, oneWeekFromNow);
      console.log(`✅ Found ${events.length} events in the next week`);
      
      // Show some event details
      events.slice(0, 3).forEach((event, index) => {
        console.log(`Event ${index + 1}:`, {
          title: event.getTitle(),
          start: event.getStartTime(),
          id: event.getId()
        });
      });
      
      SpreadsheetApp.getActiveSpreadsheet().toast(`Calendar access test successful! Found ${events.length} events.`);
      
    } catch (accessError) {
      console.error('❌ Limited calendar access:', accessError.message);
      SpreadsheetApp.getActiveSpreadsheet().toast('Limited calendar access. You may not be able to monitor this calendar for changes.');
    }
    
    // Test the monitoring function
    console.log('Testing booking status update function...');
    updateBookingStatusesFromSpecificCalendar(AVAILABILITY_CALENDAR_ID);
    
    console.log('=== Test Complete ===');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    SpreadsheetApp.getActiveSpreadsheet().toast('Test failed: ' + error.message);
  }
}

// Function to remove specific calendar triggers
function removeSpecificCalendarTrigger() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    let removedCount = 0;
    
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onSpecificCalendarChange') {
        ScriptApp.deleteTrigger(trigger);
        removedCount++;
        console.log('Specific calendar trigger removed');
      }
    });
    
    // Clean up stored properties
    PropertiesService.getScriptProperties().deleteProperty('MONITORED_CALENDAR_ID');
    
    if (removedCount > 0) {
      SpreadsheetApp.getActiveSpreadsheet().toast(`${removedCount} specific calendar trigger(s) removed`);
    } else {
      SpreadsheetApp.getActiveSpreadsheet().toast('No specific calendar triggers found to remove');
    }
    
  } catch (error) {
    console.error('Error removing specific calendar trigger:', error);
  }
}

// Enhanced periodic sync as backup option
function setupEnhancedPeriodicSync() {
  try {
    // Remove existing periodic triggers
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'enhancedPeriodicCalendarSync') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Create a time-based trigger that runs every 3 minutes for faster response
    ScriptApp.newTrigger('enhancedPeriodicCalendarSync')
      .timeBased()
      .everyMinutes(3)
      .create();
    
    console.log('Enhanced periodic sync trigger created (every 3 minutes)');
    SpreadsheetApp.getActiveSpreadsheet().toast('Enhanced periodic sync enabled (every 3 minutes)');
    
  } catch (error) {
    console.error('Error setting up enhanced periodic sync:', error);
    SpreadsheetApp.getActiveSpreadsheet().toast('Error setting up periodic sync: ' + error.message);
  }
}

function enhancedPeriodicCalendarSync() {
  console.log('Running enhanced periodic calendar sync...');
  
  try {
    // Check our specific calendar for changes
    updateBookingStatusesFromSpecificCalendar(AVAILABILITY_CALENDAR_ID);
    
    console.log('Enhanced periodic sync completed');
    
  } catch (error) {
    console.error('Error in enhanced periodic sync:', error);
  }
}

// Function to set up the calendar trigger (run this once to install)
function setupCalendarTrigger() {
  try {
    // Delete any existing calendar triggers to avoid duplicates
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onCalendarEventChange') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Get the current user's email to monitor their calendar
    const userEmail = Session.getActiveUser().getEmail();
    console.log('Setting up calendar trigger for user:', userEmail);
    
    // Create the trigger for the user's calendar
    ScriptApp.newTrigger('onCalendarEventChange')
      .forUserCalendar(userEmail)
      .onEventUpdated()
      .create();
    
    console.log('Calendar trigger created successfully for user:', userEmail);
    SpreadsheetApp.getActiveSpreadsheet().toast('Calendar trigger installed successfully!');
    
  } catch (error) {
    console.error('Error setting up calendar trigger:', error);
    SpreadsheetApp.getActiveSpreadsheet().toast('Error setting up trigger: ' + error.message);
  }
}

// Function that runs when calendar events change
function onCalendarEventChange(e) {
  console.log('=== Calendar Event Changed ===');
  console.log('Event details:', e);
  
  try {
    // Add a small delay to ensure calendar changes are fully processed
    Utilities.sleep(2000);
    
    // Run your existing sync function to check for deleted events
    syncCalendarToSheet();
    
    // Also check for any events that might need status updates
    updateBookingStatusesFromCalendar();
    
    console.log('Calendar sync completed after event change');
    
  } catch (error) {
    console.error('Error in calendar event change handler:', error);
  }
}

// Enhanced function to update booking statuses based on calendar events
function updateBookingStatusesFromCalendar() {
  try {
    console.log('Checking for deleted/changed calendar events...');
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName("Bookings");
    
    if (!sheet) {
      console.log('No Bookings sheet found');
      return;
    }
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    const calendar = CalendarApp.getCalendarById(AVAILABILITY_CALENDAR_ID);
    
    let updatedCount = 0;
    let deletedCount = 0;
    
    // Check each booking that has an event ID
    for (let i = 1; i < values.length; i++) {
      const eventId = values[i][8]; // Column I with event ID
      const currentStatus = values[i][7]; // Column H with status
      
      if (eventId && (currentStatus === "Confirmed" || currentStatus === "Booked")) {
        try {
          // Try to get the event from the calendar
          const event = calendar.getEventById(eventId);
          
          if (!event) {
            // Event was deleted from calendar
            console.log(`Event ${eventId} was deleted from calendar, updating status to Cancelled`);
            
            sheet.getRange(i + 1, 8).setValue("Cancelled");
            
            // Apply strikethrough formatting to the entire row
            const rowRange = sheet.getRange(i + 1, 1, 1, sheet.getLastColumn());
            rowRange.setFontLine('line-through');
            rowRange.setBackground('#f8f9fa');
            rowRange.setFontColor('#6c757d');
            
            deletedCount++;
            updatedCount++;
            
            // Optionally send cancellation email to customer
            try {
              const customerEmail = values[i][1]; // Email column
              const customerName = values[i][0]; // Name column
              const service = values[i][3]; // Service column
              const date = values[i][4]; // Date column
              const time = values[i][5]; // Time column
              
              if (customerEmail) {
                sendCancellationNotification(customerEmail, customerName, service, date, time);
                console.log(`Cancellation email sent to ${customerEmail}`);
              }
            } catch (emailError) {
              console.error('Error sending cancellation email:', emailError);
              // Don't fail the whole process if email fails
            }
          }
        } catch (eventError) {
          // Event not found (deleted) or other error
          if (eventError.message && eventError.message.includes('not found')) {
            console.log(`Event ${eventId} not found, marking as cancelled`);
            
            sheet.getRange(i + 1, 8).setValue("Cancelled");
            
            // Apply strikethrough formatting to the entire row
            const rowRange = sheet.getRange(i + 1, 1, 1, sheet.getLastColumn());
            rowRange.setFontLine('line-through');
            rowRange.setBackground('#f8f9fa');
            rowRange.setFontColor('#6c757d');
            
            deletedCount++;
            updatedCount++;
          } else {
            console.error(`Error checking event ${eventId}:`, eventError);
          }
        }
      }
    }
    
    if (updatedCount > 0) {
      console.log(`Updated ${updatedCount} bookings (${deletedCount} deletions detected)`);
      SpreadsheetApp.getActiveSpreadsheet().toast(`${deletedCount} deleted events detected and updated with strikethrough formatting`);
    }
    
  } catch (error) {
    console.error('Error in updateBookingStatusesFromCalendar:', error);
  }
}

// Function to send cancellation notification to customer
function sendCancellationNotification(email, name, service, date, time) {
  try {
    const subject = `Appointment Cancellation - ${service}`;
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #dc3545; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <h1 style="margin: 0;">Appointment Cancelled</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p>Dear ${name},</p>
          
          <p>We're writing to inform you that your appointment has been cancelled:</p>
          
          <ul style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #dc3545;">
            <li><strong>Service:</strong> ${service}</li>
            <li><strong>Date:</strong> ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
            <li><strong>Time:</strong> ${formatTimeDisplay(time)}</li>
          </ul>
          
          <p>We apologize for any inconvenience this may cause. If you would like to reschedule, please contact us directly.</p>
        </div>
        
        <div style="text-align: center; color: #666;">
          <p>If you have any questions, please contact us at info@ericshouseofharmony.com</p>
        </div>
      </div>
    `;
    
    const plainBody = `
Dear ${name},

Your appointment has been cancelled:

Service: ${service}
Date: ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Time: ${formatTimeDisplay(time)}

We apologize for any inconvenience. Please contact us to reschedule.

Eric's House of Harmony
info@ericshouseofharmony.com
    `;
    
    GmailApp.sendEmail(
      email,
      subject,
      plainBody,
      {
        htmlBody: htmlBody,
        name: "Eric's House of Harmony",
        replyTo: "info@ericshouseofharmony.com"
      }
    );
    
  } catch (error) {
    console.error('Error sending cancellation notification:', error);
    throw error;
  }
}

// Function to manually test the trigger setup
function testCalendarTrigger() {
  console.log('Testing calendar trigger...');
  
  // Simulate a calendar change
  onCalendarEventChange({
    calendarId: AVAILABILITY_CALENDAR_ID,
    triggerUid: 'test-trigger'
  });
  
  console.log('Test completed - check logs for results');
}

// Function to remove the calendar trigger
function removeCalendarTrigger() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onCalendarEventChange') {
        ScriptApp.deleteTrigger(trigger);
        console.log('Calendar trigger removed');
      }
    });
    
    SpreadsheetApp.getActiveSpreadsheet().toast('Calendar trigger removed');
    
  } catch (error) {
    console.error('Error removing calendar trigger:', error);
  }
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
          sheet.getRange(i + 1, 8).setValue("Cancelled");
          
          // Apply strikethrough formatting
          const rowRange = sheet.getRange(i + 1, 1, 1, sheet.getLastColumn());
          rowRange.setFontLine('line-through');
          rowRange.setBackground('#f8f9fa');
          rowRange.setFontColor('#6c757d');
          
          updatedCount++;
        }
      } catch (e) {
        // Event not found
        sheet.getRange(i + 1, 8).setValue("Cancelled");
        
        // Apply strikethrough formatting
        const rowRange = sheet.getRange(i + 1, 1, 1, sheet.getLastColumn());
        rowRange.setFontLine('line-through');
        rowRange.setBackground('#f8f9fa');
        rowRange.setFontColor('#6c757d');
        
        updatedCount++;
      }
    }
  }
  
  SpreadsheetApp.getActiveSpreadsheet().toast(`Updated ${updatedCount} entries with strikethrough formatting`);
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