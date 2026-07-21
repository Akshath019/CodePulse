import { Kafka } from "kafkajs";
import type { Producer, Consumer } from "kafkajs";
import { pool } from "./db.js";

const kafka = new Kafka({
  clientId: "codepulse-api",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
});

// ─── Producer (API → Kafka) ─────────────────────────

let producer: Producer | null = null;

export async function getProducer(): Promise<Producer> {
  if (!producer) {
    producer = kafka.producer();
    await producer.connect();
    console.log("[KAFKA] Producer connected");
  }
  return producer;
}

export interface JobMessage {
  executionId: string;
  roomId: string;
  language: string;
  code: string;
}

export async function publishJob(job: JobMessage): Promise<void> {
  const p = await getProducer();
  await p.send({
    topic: "code.jobs",
    messages: [{ key: job.executionId, value: JSON.stringify(job) }],
  });
  console.log(`[KAFKA] Job published: ${job.executionId}`);
}

// ─── Consumer (Kafka → API, for results) ─────────────

let resultsConsumer: Consumer | null = null;

export async function startResultsConsumer(): Promise<void> {
  if (resultsConsumer) return;

  resultsConsumer = kafka.consumer({ groupId: "api-results-group" });
  await resultsConsumer.connect();
  await resultsConsumer.subscribe({
    topic: "code.results",
    fromBeginning: false,
  });

  await resultsConsumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      const result = JSON.parse(message.value.toString());
      console.log(
        `[KAFKA] Result received: ${result.executionId} → ${result.status}`,
      );

      try {
        await pool.query(
          `UPDATE executions
       SET stdout = $1, stderr = $2, exit_code = $3, status = $4, duration_ms = $5
       WHERE id = $6`,
          [
            result.stdout,
            result.stderr,
            result.exitCode,
            result.status,
            result.durationMs,
            result.executionId,
          ],
        );
      } catch (err) {
        console.error("[DB] Failed to update execution:", err);
      }

      // Emit result to the room via WebSocket
      try {
        const { io } = await import("./index.js");
        io.to(result.roomId).emit("execution:result", result);
        console.log(`[SOCKET] Emitted result to room ${result.roomId}`);
      } catch (err) {
        console.error("[SOCKET] Failed to emit:", err);
      }
    },
  });

  console.log("[KAFKA] Results consumer started");
}
