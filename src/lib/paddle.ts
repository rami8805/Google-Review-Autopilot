import { initializePaddle, type Paddle } from '@paddle/paddle-js';

let paddleInstance: Paddle | null = null;
let isInitializing = false;

export async function getPaddleInstance(): Promise<Paddle | null> {
  if (paddleInstance) {
    return paddleInstance;
  }
  if (isInitializing) {
    return null;
  }

  isInitializing = true;
  try {
    const clientToken = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || 'test_client_token';
    const paddle = await initializePaddle({
      environment: 'sandbox',
      token: clientToken,
    });
    paddleInstance = paddle || null;
    return paddleInstance;
  } catch (err) {
    console.warn('[Paddle.js] Initialization in sandbox environment:', (err as Error).message);
    return null;
  } finally {
    isInitializing = false;
  }
}
