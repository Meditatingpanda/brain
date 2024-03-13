import { google } from "googleapis";
const meetController = {
  scheduleMeet: async (req, res) => {
    const calendar = google.calendar("v3");
    if (!oauth2Client.credentials) {
      return res.status(401).send("Authentication required");
    }
    const { title, desc, eventData } = req.body;
    function formatEventData(data) {
      // Extract and convert the date from DD/MM/YYYY to YYYY-MM-DD format
      const [day, month, year] = data.date.split("/");
      const formattedDate = `${year}-${month}-${day}`;

      // Remove the ' PST' part from the start and end times if needed
      const startTime = data.start_time.replace(" PST", "");
      const endTime = data.end_time.replace(" PST", "");

      // Combine the date and time in the desired dateTime format
      const startDateTime = `${formattedDate}T${startTime}:00`;
      const endDateTime = `${formattedDate}T${endTime}:00`;

      // Structure the output
      const formattedOutput = {
        start: {
          dateTime: startDateTime,
          timeZone: "America/Los_Angeles", // PST is equivalent to Los Angeles time without considering daylight saving
        },
        end: {
          dateTime: endDateTime,
          timeZone: "America/Los_Angeles",
        },
      };

      return formattedOutput;
    }

    const event = {
      summary: title,
      description: desc,
      ...formatEventData(eventData),
      attendees: [
        { email: eventData.email },
        { email: "grp.gyanaranjan@gmail.com" },
        // Add more attendees here
      ],
      conferenceData: {
        createRequest: { requestId: "sample-request-id" },
      },
    };

    try {
      const response = await calendar.events.insert({
        calendarId: "primary",
        resource: event,
        conferenceDataVersion: 1,
        sendNotifications: true,
      });

      res.json({
        status: true,
        link: response.data.htmlLink,
      });
    } catch (error) {
      console.error("Error creating event", error);
      res.status(500).send(error);
    }
  },
};

export default meetController;
