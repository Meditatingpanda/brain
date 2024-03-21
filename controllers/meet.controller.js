import { google } from "googleapis";
import UserSchema from "../model/UserSchema.js";
import { oauth2Client } from "../app.js";

const meetController = {
  scheduleMeet: async (req, res) => {
    const { email, title, desc, eventData } = req.body;

    try {
      const user = await UserSchema.findOne({ email });
      if (!user || !user.auth) {
        return res
          .status(401)
          .send("User not found or authentication details missing");
      }

      oauth2Client.setCredentials(user.auth);

      if (!oauth2Client.credentials) {
        return res.status(401).send("Invalid authentication credentials");
      }

      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      const formattedEventData = formatEventData(eventData);

      const event = {
        summary: title,
        description: desc,
        ...formattedEventData,
        attendees: [
          { email: eventData.email },
          { email: email },
          // Add more attendees here
        ],
        conferenceData: {
          createRequest: { requestId: "sample-request-id" }, // Consider generating a unique ID for each request
        },
      };

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
      console.error("Error creating event:", error);
      res.status(500).send("Internal server error while creating event");
    }
  },
};

function formatEventData(data) {
  console.log(data)
  const [day, month, year] = data.date.split("/");
  const formattedDate = `${year}-${month}-${day}`;
 
  const startTime = data.start_time.replace(" PST", "");
  const endTime = data.end_time.replace(" PST", "");

  const startDateTime = `${formattedDate}T${startTime}:00`;
  const endDateTime = `${formattedDate}T${endTime}:00`;

  console.log(startDateTime,endDateTime)

  return {
    start: {
      dateTime: "2024-03-21T12:00:00-04:00",
      timeZone: "America/Los_Angeles",
    },
    end: {
      dateTime: "2024-03-21T12:30:00-04:00",
      timeZone: "America/Los_Angeles",
    },
  };
}

export default meetController;
