import express, { Express, Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import * as types from "@google/genai";
import { GoogleGenAI } from "@google/genai";
import http from "http";
import path from "path";
import { Server, Socket } from "socket.io";
import { fileURLToPath } from "url";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

//postgres with vector node js

const GOOGLE_API_KEY = "AIzaSyCT7K7IDZod2odOIm0ctc9_Upk8gH0g4ws";

export function createBlob(audioData: string): types.Blob {
  return { data: audioData, mimeType: "audio/pcm;rate=16000" };
}

export function debug(data: object): string {
  return JSON.stringify(data);
}

async function main() {
  let options: types.GoogleGenAIOptions;
  {
    options = {
      // Google AI
      vertexai: false,
      apiKey: GOOGLE_API_KEY,
      httpOptions: {
        apiVersion: "v1alpha",
      },
    };
  }


  const ai = new GoogleGenAI(options);
  const session = await ai.live.connect({
    model: "gemini-2.0-flash-exp",
    config: {
      systemInstruction: {
        parts: [
          {
            text: "You are a helpful assistant for my resturent. I will ask you questions and you will answer them. My resturent contains of 3 sections: 1. Menu, 2. Order, 3. Payment. You will help me with these sections. I will ask you questions and you will answer them. Menu options are: 1. Pizza, 2. Burger, 3. Salad, 4. Drink. Order options are: 1. Place order, 2. Cancel order, 3. Update order. Payment options are: 1. Credit card, 2. Cash, 3. PayPal. You will not answer any question out of scope. You will not answer any question that is not related to the resturent. You will not answer any question that is not related to the menu, order or payment. You will not answer any question that is not related to the resturent. You will not answer any question that is not related to the menu, order or payment. You will not answer any question that is not related to the resturent. You will not answer any question that is not related to the menu, order or payment. You will not answer any question that is not related to the resturent. You will not answer any question that is not related to the menu, order or payment.",
          },
        ],
      },
    },
    callbacks: {
      onopen: () => {
        console.log("Live Session Opened");
      },
      onmessage: (message: types.LiveServerMessage) => {
        console.log("Received message from the server: %s\n", debug(message));
        if (
          message.serverContent &&
          message.serverContent.modelTurn &&
          message.serverContent.modelTurn.parts &&
          message.serverContent.modelTurn.parts.length > 0 &&
          message.serverContent.modelTurn.parts[0].inlineData &&
          message.serverContent.modelTurn.parts[0].inlineData.data
        ) {
          io.emit(
            "audioStream",
            message.serverContent.modelTurn.parts[0].inlineData.data
          );
        }
      },
      onerror: (e: ErrorEvent) => {
        console.log("Live Session Error:", debug(e));
      },
      onclose: (e: CloseEvent) => {
        console.log("Live Session Closed:", debug(e));
      },
    },
  });

  const app = express();
  app.use(cors({ origin: true }));
  const server = http.createServer(app);
  const io = new Server(server);

  app.get("/", function (req: Request, res: Response) {
    res.sendFile(path.join(process.cwd(), "./index.html"));
  });

  // Handle new connections to the socket.
  await io.on("connection", async function (socket: Socket) {
    console.log("Connected to the socket.");

    // Handle incoming content updates.`
    socket.on("contentUpdateText", function (text: string) {
      session.sendClientContent({ turns: text, turnComplete: true });
    });

    // Handle incoming realtime audio input.
    socket.on("realtimeInput", function (audioData: string) {
      session.sendRealtimeInput({ media: createBlob(audioData) });
    });
  });

  const port = 8002;
  await server.listen(port, async () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
  });
}

main();
