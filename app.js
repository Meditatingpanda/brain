import express from "express";
import axios from "axios";
import morgan from "morgan";
import cors from "cors";
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { google } from "googleapis";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import moment from "moment-timezone";
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
const scopes = ["https://www.googleapis.com/auth/calendar"];
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const chatModel = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_KEYS,
});
const promptTemplate = PromptTemplate.fromTemplate(
  "Parse the following text to determine if it's related to creating a Google (Gmail) event. Extract the event type, date, time, and any mentioned email addresses. Convert the date and time to the PST timezone and format the date as dd/mm/yyyy. Use the provided date as today's reference for any relative date calculations. Return the data in JSON format with keys for event, date, time, and email. Text: {text}  Today's date for reference (dd/mm/yyyy): {date}  Expected Output Format: event_type, date, start_time,end_time, email , if it meeting return event_type gmeet, if end time is not provided then pick time after 30min of start time "
);
// const promptTemplate = PromptTemplate.fromTemplate(
//   "Tell me a joke about {topic}"
// );
const outputParser = new StringOutputParser();

const chain = RunnableSequence.from([promptTemplate, chatModel, outputParser]);
const app = express();
const port = 3000;
google.options({ auth: oauth2Client }); // Apply auth globally
const calendar = google.calendar("v3");
const tokens = {
  access_token:
    "ya29.a0Ad52N3-cLI693FYmCk805l_w_XjM8lJCmTA-X8QnbuOYxFnfzrJt9fWQS-e9fZ11z2vKV79owVmx1CInbBGTcodx1EzcgshCPNG3Ssk9zJDBu_mTvd79x5_L8ffYoJi3vYpzSPeaM7Gm1A9JbRM6_-StVJO3tYWORU0KaCgYKAVoSARISFQHGX2MiOwzYJqmW87XSrh3HFnoctg0171",
  refresh_token:
    "1//0gCF4YXvUTwx8CgYIARAAGBASNwF-L9IreEzhrhAsRw2BYA4V803iIapE5uTbA6UWHt00yDGom-l_TNi62qRIFM64CdAEFqXcFAI",
  scope: "https://www.googleapis.com/auth/calendar",
  token_type: "Bearer",
  expiry_date: 1710223002001,
};
oauth2Client.setCredentials(tokens);
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.post("/analyze", async (req, res) => {
  const text = req.body.text;
  console.log("todays date ", new Date().toLocaleDateString("en-GB"));
  const date = new Date().toLocaleDateString("en-GB");
  const ans = await chain.invoke({
    text,
    date,
  });
  res.send(JSON.parse(ans));
});

app.get("/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
  });
  res.redirect(url);
});

app.get("/oauth2callback", async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oauth2Client.getToken(code);
  console.log("Token ", tokens);
  oauth2Client.setCredentials(tokens);
  res.sendFile(path.join(__dirname, "./view/auth.html"));
});

app.post("/schedule-meet", async (req, res) => {
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
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
