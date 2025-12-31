import amqp from 'amqplib';

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672/';

let conn: amqp.ChannelModel | null = null;
let isConnecting = false;

export async function getConnection(): Promise<amqp.ChannelModel> {
  if (conn) return conn;

  if (isConnecting) {
    await new Promise((resolve) => {
      const checkConnection = setInterval(() => {
        if (conn) {
          clearInterval(checkConnection);
          resolve(null);
        }
      }, 100);
    });
    return getConnection();
  }

  isConnecting = true;
  console.log('Connecting to RabbitMQ...');

  try {
    conn = await amqp.connect(RABBITMQ_URL, {
      heartbeat: 60,
      reconnectTimeInSeconds: 5,
    });

    conn.on('close', () => {
      console.error('RabbitMQ conn closed. Reconnecting...');
      conn = null;
    });

    conn.on('error', (err) => {
      console.error('RabbitMQ error:', err.message);
      conn = null;
    });

    console.log('Connected to RabbitMQ!');
    return conn;
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    throw error;
  } finally {
    isConnecting = false;
  }
}

let confirmCh: amqp.ConfirmChannel | null = null;

export async function getConfirmChannel(): Promise<amqp.ConfirmChannel> {
  if (confirmCh) return confirmCh;

  const conn = await getConnection();
  confirmCh = await conn.createConfirmChannel();

  confirmCh.on('close', () => {
    console.warn('ConfirmChannel closed; will recreate on next request.');
    confirmCh = null;
  });

  confirmCh.on('error', (err) => {
    console.error('ConfirmChannel error:', err?.message ?? err);
    confirmCh = null;
  });

  return confirmCh;
}

export async function closeConfirmChannel(): Promise<void> {
  if (confirmCh) {
    try {
      await confirmCh.close();
    } catch (e) {
      // ignore
      console.error('Error closing ConfirmChannel:', e);
    }
    confirmCh = null;
  }
}
