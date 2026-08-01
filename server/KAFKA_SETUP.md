# Kafka architecture for FriendVerse

## Flow
1. Frontend connects to the backend over Socket.IO.
2. Backend relays chat, memory, timeline, and room events to Kafka.
3. Kafka topic `friendverse-events` stores the room events.
4. The backend consumer reads those events and fans them back to connected room members.

## Local Docker setup
Run:

```bash
cd server
docker compose up -d kafka
```

Then use:

```env
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC=friendverse-events
KAFKA_GROUP_ID=friendverse-group-default
```

## Multi-broker / cloud setup
Provide a comma-separated broker list, for example:

```env
KAFKA_BROKERS=broker-1:9092,broker-2:9092,broker-3:9092
```

## Health check
The backend exposes:

```bash
http://localhost:5000/health
```

This returns the Kafka status and active topic/group configuration.
