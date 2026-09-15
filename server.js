const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mqtt = require('mqtt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- RESTORED MQTT CONNECTION SETUP ---
const mqttClient = mqtt.connect('mqtt://broker.hivemq.com:1883');
const UNIQUE_TOPIC = 'smart_tray_25BCE2885/rfid';

mqttClient.on('connect', () => {
  console.log('Server connected to Cloud MQTT Broker!');
  mqttClient.subscribe(UNIQUE_TOPIC);
});
// --------------------------------------

// Keep track of the active surgery in memory
let activeSessionId = null; 

io.on('connection', async (socket) => {
  console.log('Frontend dashboard connected via WebSocket');
  
  try {
    const allInstruments = await prisma.instrument.findMany();
    socket.emit('initial_state', allInstruments);

    // Check if there is already a surgery running in case the server restarted
    const ongoingSession = await prisma.surgerySession.findFirst({ where: { isActive: true } });
    if (ongoingSession) {
      activeSessionId = ongoingSession.id;
      socket.emit('session_active', true);
      
      // Load only the logs for THIS active session
      const sessionLogs = await prisma.eventLog.findMany({
        where: { sessionId: activeSessionId },
        orderBy: { createdAt: 'desc' },
        include: { instrument: true }
      });
      socket.emit('initial_logs', sessionLogs.map(formatLog));
    }
  } catch (error) { console.log(error); }

  // Handle Surgery Start
  socket.on('start_surgery', async () => {
    const newSession = await prisma.surgerySession.create({
      data: { isActive: true }
    });
    activeSessionId = newSession.id;
    io.emit('session_active', true);
    console.log(`Surgery Session ${activeSessionId} Started!`);
  });

  // Handle Surgery End
  socket.on('end_surgery', async () => {
    if (activeSessionId) {
      await prisma.surgerySession.update({
        where: { id: activeSessionId },
        data: { isActive: false, endTime: new Date() }
      });
      console.log(`Surgery Session ${activeSessionId} Ended & Sealed.`);
      activeSessionId = null;
      io.emit('session_active', false);
    }
  });
  socket.on('fetch_past_sessions', async () => {
    try {
      const pastSessions = await prisma.surgerySession.findMany({
        where: { isActive: false },
        orderBy: { endTime: 'desc' },
        take: 10, // Grab the 10 most recent sessions
        include: { 
          logs: { 
            include: { instrument: true },
            orderBy: { createdAt: 'desc' }
          } 
        }
      });
      socket.emit('past_sessions_data', pastSessions);
    } catch (error) {
      console.log("Error fetching past sessions:", error);
    }
  });
});

// Helper function to format logs for the frontend
function formatLog(log) {
  return { id: log.id, time: new Date(log.createdAt).toLocaleTimeString(), name: log.instrument.name, action: log.action };
}

// Handle Incoming MQTT Messages
mqttClient.on('message', async (topic, message) => {
  if (topic === UNIQUE_TOPIC) {
    try {
      const data = JSON.parse(message.toString());
      const instrument = await prisma.instrument.findUnique({ where: { rfidUid: data.rfidUid } });

      if (instrument) {
        const isNowPresent = data.action === 'returned';
        if (instrument.isPresent === isNowPresent) return; // Ignore duplicates

        await prisma.instrument.update({
          where: { rfidUid: data.rfidUid },
          data: { isPresent: isNowPresent }
        });

        // TIE THE LOG TO THE ACTIVE SESSION
        const newLog = await prisma.eventLog.create({
          data: { 
            action: data.action, 
            instrumentId: instrument.id,
            sessionId: activeSessionId // This will be null if no surgery is running
          }
        });

        io.emit('tray_update', {
          rfidUid: data.rfidUid,
          action: data.action,
          instrumentName: instrument.name,
          isPresent: isNowPresent,
          logId: newLog.id
        });
      }
    } catch (error) { console.log(error); }
  }
});

const HTTP_PORT = process.env.PORT || 5000;
httpServer.listen(HTTP_PORT, () => {
  console.log(`HTTP/WebSocket server is running on port ${HTTP_PORT}`);
});