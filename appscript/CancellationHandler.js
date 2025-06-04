// Handle cancellation requests
function handleCancellation(params) {
  try {
    console.log('Handling cancellation request:', params);
    
    // Get the event ID from the parameters
    const eventId = params.eventId;
    if (!eventId) {
      throw new Error('No event ID provided');
    }
    
    // Get the calendar
    const calendar = CalendarApp.getCalendarById(AVAILABILITY_CALENDAR_ID);
    if (!calendar) {
      throw new Error('Could not access calendar');
    }
    
    // Try to get the event
    let event;
    try {
      event = calendar.getEventById(eventId);
    } catch (e) {
      console.error('Error retrieving event:', e);
      throw new Error('Event not found or access denied');
    }
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    // Get event details for confirmation
    const eventTitle = event.getTitle();
    const eventDate = event.getStartTime().toDateString();
    const eventTime = formatTimeDisplay(event.getStartTime().getHours() + ':' + 
                                      event.getStartTime().getMinutes().toString().padStart(2, '0'));
    
    // Delete the event
    event.deleteEvent();
    
    // Update the booking sheet if needed
    updateBookingSheet(eventId);
    
    // Return a confirmation page
    return HtmlService.createHtmlOutput(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Booking Cancelled</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            text-align: center;
          }
          .confirmation {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
          }
          .details {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: left;
          }
          h1 {
            color: #4285f4;
          }
          .btn {
            display: inline-block;
            background-color: #4285f4;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <h1>Booking Cancelled</h1>
        
        <div class="confirmation">
          <h2>Your appointment has been successfully cancelled</h2>
        </div>
        
        <div class="details">
          <p><strong>Appointment:</strong> ${eventTitle}</p>
          <p><strong>Date:</strong> ${eventDate}</p>
          <p><strong>Time:</strong> ${eventTime}</p>
        </div>
        
        <p>Thank you for letting us know. If you'd like to book another appointment, please visit our services page.</p>
        
        <a href="https://www.ericshouseofharmony.com/soundhealing" class="btn">Return to Services</a>
      </body>
      </html>
    `)
    .setTitle('Booking Cancelled')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    
  } catch (error) {
    console.error('Error handling cancellation:', error);
    
    // Return an error page
    return HtmlService.createHtmlOutput(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cancellation Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            text-align: center;
          }
          .error {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
          }
          h1 {
            color: #4285f4;
          }
          .btn {
            display: inline-block;
            background-color: #4285f4;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <h1>Cancellation Error</h1>
        
        <div class="error">
          <h2>There was a problem cancelling your appointment</h2>
          <p>${error.message}</p>
        </div>
        
        <p>Please contact us directly to cancel your appointment:</p>
        <p><a href="mailto:info@ericshouseofharmony.com">info@ericshouseofharmony.com</a></p>
        <p>or call <a href="tel:305-767-3370">305-767-3370</a></p>
        
        <a href="https://www.ericshouseofharmony.com/soundhealing" class="btn">Return to Services</a>
      </body>
      </html>
    `)
    .setTitle('Cancellation Error')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
}

// Helper function to update the bookings sheet when an event is cancelled
function updateBookingSheet(eventId) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Bookings");
    if (!sheet) {
      console.log('No Bookings sheet found to update');
      return;
    }
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Start from row 2 to skip headers
    for (let i = 1; i < values.length; i++) {
      const rowEventId = values[i][8]; // Column I with event ID
      
      if (rowEventId === eventId && values[i][7] === "Confirmed") {
        // Update status to Cancelled
        sheet.getRange(i + 1, 8).setValue("Cancelled by client");
        console.log(`Updated booking row ${i + 1} to Cancelled status`);
        break;
      }
    }
  } catch (error) {
    console.error('Error updating booking sheet:', error);
    // Continue even if sheet update fails
  }
}

// Helper function to format time display
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