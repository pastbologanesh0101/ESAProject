#include <WiFi.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <MFRC522.h>

// --- Wi-Fi & MQTT Configuration ---
const char* ssid = "YOUR_WIFI_NETWORK_NAME";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;
const char* mqtt_topic = "smart_tray_25BCE2885/rfid";

// --- RFID Pins (ESP32 standard SPI pins) ---
#define RST_PIN 22
#define SS_PIN 21 
MFRC522 mfrc522(SS_PIN, RST_PIN);

WiFiClient espClient;
PubSubClient client(espClient);

void setup_wifi() {
  delay(10);
  Serial.print("Connecting to Wi-Fi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi Connected!");
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting to HiveMQ Broker...");
    // Create a random client ID
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("Connected!");
    } else {
      Serial.print("Failed, rc=");
      Serial.print(client.state());
      Serial.println(" retrying in 5 seconds...");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  
  SPI.begin();
  mfrc522.PCD_Init();
  Serial.println("RFID Scanner Ready. Tap a tag...");
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Look for new RFID cards
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Get the UID of the tag
  String tagUID = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    tagUID += String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
    tagUID += String(mfrc522.uid.uidByte[i], HEX);
  }
  tagUID.toUpperCase();
  
  Serial.print("Scanned Tag: ");
  Serial.println(tagUID);

  // --- Format JSON Payload ---
  // For the hardware demo, we will default to "removed" 
  // You can toggle this logic later depending on the state
  String payload = "{\"rfidUid\": \"" + tagUID + "\", \"action\": \"removed\"}";
  
  // Publish to your unique topic
  client.publish(mqtt_topic, payload.c_str());
  Serial.println("Published to Cloud: " + payload);

  // Halt reading to prevent spamming while the card is still on the reader
  mfrc522.PICC_HaltA();
  delay(1000); 
}