import { Kafka } from "kafkajs";
import { executeCode } from "./executor.js";

const kafka = new Kafka({
  clientId: "codepulse-worker",
  brokers: ["localhost:9092"],
});

const consumer = kafka.consumer({ groupId: "worker-group" });
const producer = kafka.producer();

interface JobMessage {
  executionId: string;
  roomId: string;
  language: string;
  code: string;
}

async function main() {
  await producer.connect();
  await consumer.connect();
  console.log("[WORKER] Connected to Kafka");

  await consumer.subscribe({ topic: "code.jobs", fromBeginning: false });
  console.log("[WORKER] Subscribed to code.jobs — waiting for jobs...");

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      const job: JobMessage = JSON.parse(message.value.toString());
      console.log(
        `[WORKER] Processing job ${job.executionId} (${job.language})`,
      );

      const result = await executeCode(job.language, job.code);

      // Publish result back to Kafka
      await producer.send({
        topic: "code.results",
        messages: [
          {
            key: job.executionId,
            value: JSON.stringify({
              executionId: job.executionId,
              roomId: job.roomId,
              language: job.language,
              ...result,
            }),
          },
        ],
      });

      console.log(
        `[WORKER] Done ${job.executionId} → ${result.status} (${result.durationMs}ms)`,
      );
    },
  });
}

main().catch((err) => {
  console.error("[WORKER] Fatal:", err);
  process.exit(1);
});
