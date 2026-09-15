const mqtt = require('mqtt');

console.log("Connecting to Cloud Broker...");
const client = mqtt.connect('mqtt://broker.hivemq.com:1883');

client.on('connect', () => {
  console.log('SUCCESS: Simulator connected to Cloud!');
  
  const payload = JSON.stringify({
    rfidUid: "TAG_001",
    action: "returned"
  });

  // Publish to your unique team ID topic
  client.publish('smart_tray_25BCE2885/rfid', payload, () => {
    console.log('Simulated ESP32 message sent: Scalpel removed');
    client.end(); 
  });
});

client.on('error', (err) => {
  console.error('Connection failed:', err);
  process.exit(1);
});